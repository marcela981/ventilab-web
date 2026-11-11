/*
* Funcionalidad: Real console adapter tests
* Descripción: Covers the pure pieces of the real-ventilator console adapter: the telemetry sample mapper (device or server time base, monotonic tMs, late frames dropped, clock reset, non-finite values dropped), the sample-rate estimate, the frame hub (stable source, samples delivered by reference, no listener → nothing), the reported settings and state (backend keys → console ids, FiO2 fraction → %, unknown keys not shown, latest frame wins), the alarms (4 device severities → 3 console priorities, clear on inactive, frame alarm codes, the synthetic "Equipo sin datos") and the adapter composition (derived metrics marked, patient monitor only with reported vitals, read-only by default, no-data status). Depends on Vitest only. v1.1 (T5 review fix): frame alarm expiry, no prototype lookups, the ΔP description.
*   v1.2 (2026-11-10): the mapper ignores a non-epoch deviceTs and spaces same-millisecond / late server frames by the
*   nominal period; the rate estimate goes down with hysteresis; the exact real device pattern (no deviceTs, shared
*   milliseconds, 30–60 Hz with jitter, synthetic breaths) gives strictly increasing times and non-null metrics.
*   v1.3 (2026-11-10): without device settings the adapter offers the initial proposal only while nothing was sent,
*   queued or in flight, shows the last snapshot sent (settings and mode) and lets device-reported values win over it.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it, vi } from "vitest";
import type { VentilatorTelemetryFrame } from "@shared/realtime";
import type { ConsoleSampleBatch } from "@shared/ventilator-console";
import { computeBreathMetrics, createBreathDetector, EMPTY_BREATH_METRICS } from "./breath-detection";
import { buildRealConsoleAdapter, toDerivedMetrics } from "./real-console-adapter";
import { EMPTY_REPORTED_STATE, FRAME_ALARMS_TTL_MS, reduceReportedState, toConsoleSettingValues } from "./reported-settings";
import { createSampleRateEstimator } from "./sample-rate";
import { createTelemetryFrameHub } from "./telemetry-frame-hub";
import {
  applyDeviceAlarm,
  frameAlarmsToConsole,
  mergeConsoleAlarms,
  NO_DATA_ALARM_ID,
  noDataAlarm,
  severityToPriority,
} from "./telemetry-alarms";
import type { DeviceAlarm } from "./telemetry-alarms";
import { createTelemetrySampleMapper } from "./telemetry-samples";

function frame(serverTs: number, overrides: Partial<VentilatorTelemetryFrame> = {}): VentilatorTelemetryFrame {
  return { serverTs, pressure: 10, flow: 20, volume: 300, deviceId: "vent-1", ...overrides };
}

function deviceAlarm(overrides: Partial<DeviceAlarm> = {}): DeviceAlarm {
  return {
    type: "HIGH_PRESSURE",
    severity: "HIGH",
    message: "[HIGH] High airway pressure detected",
    currentValue: 42,
    thresholdValue: 40,
    timestamp: 5000,
    active: true,
    acknowledged: false,
    ...overrides,
  };
}

describe("telemetry sample mapper", () => {
  const EPOCH = 1_762_800_000_000;

  it("maps frames to console samples with times relative to the first frame, preferring a device epoch clock", () => {
    const mapper = createTelemetrySampleMapper();

    expect(mapper.map([frame(1_000_050, { deviceTs: EPOCH }), frame(1_000_090, { deviceTs: EPOCH + 33, pressure: 12, flow: -5, volume: 280 })])).toEqual([
      { tMs: 0, pressure: 10, flow: 20, volume: 300 },
      { tMs: 33, pressure: 12, flow: -5, volume: 280 },
    ]);
    // Without a device clock the server time is used.
    const server = createTelemetrySampleMapper();
    expect(server.map([frame(1000), frame(1040)]).map((sample) => sample.tMs)).toEqual([0, 40]);
  });

  it("ignores a deviceTs that is not epoch ms (device uptime counter) and falls back to serverTs", () => {
    const mapper = createTelemetrySampleMapper();

    expect(mapper.map([frame(1000, { deviceTs: 147 }), frame(1040, { deviceTs: 180 }), frame(1080, { deviceTs: 2e13 })]).map((sample) => sample.tMs)).toEqual([0, 40, 80]);
  });

  it("spaces frames that share a millisecond or arrive late by the nominal period, strictly increasing", () => {
    const mapper = createTelemetrySampleMapper();
    // 20 ms apart, then a burst of three frames stamped in the same millisecond and one 10 ms late.
    const times = mapper.map([frame(1000), frame(1020), frame(1040), frame(1060), frame(1060), frame(1060), frame(1050), frame(1140)])
      .map((sample) => sample.tMs);

    // Spaced by the mean receipt interval of the window (60 ms / 4 = 15 ms, then less as the burst shortens it).
    expect(times.slice(0, 5)).toEqual([0, 20, 40, 60, 75]);
    expect(times.every((time, index) => index === 0 || time > times[index - 1]!)).toBe(true);
    // Back on the server clock as soon as the receipt time is ahead again.
    expect(times[times.length - 1]).toBe(140);
  });

  it("drops non-finite values and restarts the time base on a large backwards jump", () => {
    const mapper = createTelemetrySampleMapper();

    expect(mapper.map([frame(1000), frame(1020, { pressure: Number.NaN }), frame(1040, { flow: Number.POSITIVE_INFINITY }), frame(1060)])
      .map((sample) => sample.tMs)).toEqual([0, 60]);
    // A large jump back (device reboot, clock change) is a clock reset: the time goes back, which clears the console ring.
    expect(mapper.map([frame(-5000), frame(-4980)]).map((sample) => sample.tMs)).toEqual([0, 20]);
    expect(mapper.map([frame(-4960)]).map((sample) => sample.tMs)).toEqual([40]);
  });

  it("restarts the time base when the device clock appears or disappears, and drops a late device frame", () => {
    const mapper = createTelemetrySampleMapper();

    expect(mapper.map([frame(1000), frame(1040)]).map((sample) => sample.tMs)).toEqual([0, 40]);
    expect(mapper.map([frame(1080, { deviceTs: EPOCH }), frame(1110, { deviceTs: EPOCH + 33 }), frame(1120, { deviceTs: EPOCH + 20 })]).map((sample) => sample.tMs)).toEqual([0, 33]);
  });
});

describe("real device message pattern (2026-11-10)", () => {
  /**
   * The device publishes {"pressure","flow","volume","timestamp"} at 30–60 Hz with no epoch clock: the backend relays
   * each frame with its receipt time in whole ms (no deviceTs, no seq) in batches every 33 ms, so frames share a
   * millisecond and carry network jitter. Synthetic breaths: 15 rpm, Ti 1 s with a sinusoidal inspiratory flow, a passive exponential expiration, PEEP 5,
   * peak about 20.
   */
  function realFrames(seconds: number): VentilatorTelemetryFrame[] {
    const frames: VentilatorTelemetryFrame[] = [];
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;

      return seed / 2147483647;
    };
    let t = 0;
    const start = 1_762_800_000_000;
    let receipt = start;
    let volume = 0;

    while (t < seconds * 1000) {
      const period = 1000 / (30 + random() * 30);
      const phase = t % 4000;
      const flow = phase < 1000 ? 40 * Math.sin((Math.PI * phase) / 1000) : -50 * Math.exp(-(phase - 1000) / 400);
      volume = Math.max(0, volume + (flow * period) / 60);
      const pressure = phase < 1000 ? 5 + 15 * Math.sin((Math.PI * phase) / 1000) : 5;
      // Bursts: about a third of the frames reach the server in the same millisecond as the previous one; the rest
      // arrive at their time with ±6 ms of network jitter (whole ms), so some arrive before an earlier one.
      receipt = random() < 0.35 ? receipt : Math.floor(start + t + (random() - 0.5) * 12);
      frames.push({ serverTs: receipt, pressure, flow, volume, deviceId: "vent-1", deviceClock: Math.round(t) });
      t += period;
    }

    return frames;
  }

  it("gives strictly increasing times and non-null Ppico, PEEP, Vte and FR", () => {
    const hub = createTelemetryFrameHub("reservation-1");
    const detector = createBreathDetector();
    const frames = realFrames(20);
    const times: number[] = [];

    for (let index = 0; index < frames.length; index += 2) {
      const samples = hub.push(frames.slice(index, index + 2));

      times.push(...samples.map((sample) => sample.tMs));
      detector.push(samples);
    }

    expect(times).toHaveLength(frames.length);
    expect(times.every((time, index) => index === 0 || time > times[index - 1]!)).toBe(true);

    const metrics = computeBreathMetrics(detector.breaths(), detector.latestMs());

    expect(metrics.peakPressure).toBeGreaterThan(18);
    expect(metrics.peep).toBeCloseTo(5, 0);
    expect(metrics.exhaledTidalVolume).not.toBeNull();
    expect(metrics.respiratoryRate).toBeGreaterThan(13);
    expect(metrics.respiratoryRate).toBeLessThan(17);
    expect(hub.sampleRateHz()).toBeGreaterThanOrEqual(30);
  });
});

describe("sample rate estimate", () => {
  it("rounds to 10 Hz steps once 1 s of samples is seen and ignores small jitter (hysteresis)", () => {
    const estimator = createSampleRateEstimator();
    const at = (hz: number, from: number, count: number) => Array.from({ length: count }, (_, index) => from + (index * 1000) / hz);

    expect(estimator.push(at(30, 0, 20))).toBeUndefined();
    expect(estimator.push(at(30, 20 * (1000 / 30), 30))).toBe(30);
    // Jitter below the published rate does not shrink it (a new rate would recreate the ring).
    expect(estimator.push(at(25, 2000, 60))).toBe(30);
    expect(estimator.push(at(60, 5000, 120))).toBe(60);
    estimator.reset();
    expect(estimator.push(at(60, 0, 10))).toBeUndefined();
  });

  it("also goes down when the rate really drops (hysteresis 25 %), not on 50 ↔ 60 Hz rounding", () => {
    const estimator = createSampleRateEstimator();
    const at = (hz: number, from: number, count: number) => Array.from({ length: count }, (_, index) => from + (index * 1000) / hz);

    expect(estimator.push(at(60, 0, 120))).toBe(60);
    expect(estimator.push(at(52, 2000, 104))).toBe(60);
    expect(estimator.push(at(30, 4000, 90))).toBe(30);
  });
});

describe("telemetry frame hub", () => {
  it("keeps a stable source and pushes each batch to the listeners", () => {
    const hub = createTelemetryFrameHub("reservation-1");
    const listener = vi.fn<(batch: ConsoleSampleBatch) => void>();
    const { source } = hub;

    expect(source.sourceId).toBe("reservation-1");
    const unsubscribe = source.subscribe(listener);
    const samples = hub.push([frame(1000), frame(1020)]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].samples).toBe(samples);
    expect(hub.source).toBe(source);

    unsubscribe();
    hub.push([frame(1040)]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("emits nothing for a batch without valid samples and reports the estimated rate", () => {
    const hub = createTelemetryFrameHub("reservation-1");
    const listener = vi.fn();
    hub.source.subscribe(listener);

    hub.push([frame(1000, { volume: Number.NaN })]);
    expect(listener).not.toHaveBeenCalled();
    expect(hub.sampleRateHz()).toBeUndefined();

    hub.push(Array.from({ length: 60 }, (_, index) => frame(2000 + index * 20)));
    expect(hub.sampleRateHz()).toBe(50);
  });
});

describe("reported settings", () => {
  it("maps the backend setting keys to console ids, FiO2 fraction to %, and leaves unknown keys out", () => {
    expect(toConsoleSettingValues({
      tidalVolume: 450,
      respiratoryRate: 16,
      peep: 6,
      fio2: 0.4,
      inspiratoryTime: 1.1,
      sensitivity: 2,
      pressureLimit: 30,
      ieRatio: 0.5,
      flowRate: 40,
      mystery: 1,
      peepBad: Number.NaN,
    })).toEqual({ tidalVolume: 450, respiratoryRate: 16, peep: 6, fio2: 40, inspiratoryTime: 1.1, flowTrigger: 2 });
  });

  it("keeps the latest frame that carries each field and never fills from the client", () => {
    const first = reduceReportedState(EMPTY_REPORTED_STATE, [
      frame(1000, { mode: "VCV", settings: { peep: 5, tidalVolume: 400 }, spo2: 95, alarms: ["APNEA"] }),
      frame(1020),
    ]);

    expect(first).toEqual({ settings: { peep: 5, tidalVolume: 400 }, mode: "VCV", spo2: 95, pco2: null, frameAlarms: ["APNEA"], frameAlarmsAt: 1000 });

    // A newer settings object replaces the whole set (a key the device stops reporting is no longer shown).
    const second = reduceReportedState(first, [frame(1040, { settings: { peep: 8 }, pco2: 41, alarms: [] })]);
    expect(second).toEqual({ settings: { peep: 8 }, mode: "VCV", spo2: 95, pco2: 41, frameAlarms: [], frameAlarmsAt: 1040 });
    // No frame carries a field: the same state object.
    expect(reduceReportedState(second, [frame(1060)])).toBe(second);
  });

  it("expires the frame alarm codes when the frames stop carrying an alarms field", () => {
    const raised = reduceReportedState(EMPTY_REPORTED_STATE, [frame(1000, { alarms: ["APNEA"] })]);

    expect(reduceReportedState(raised, [frame(1000 + FRAME_ALARMS_TTL_MS)]).frameAlarms).toEqual(["APNEA"]);
    expect(reduceReportedState(raised, [frame(1001 + FRAME_ALARMS_TTL_MS)])).toMatchObject({ frameAlarms: null, frameAlarmsAt: null });
  });

  it("ignores inherited keys of the setting map (no prototype lookups)", () => {
    expect(toConsoleSettingValues({ constructor: 1, toString: 2, __proto__: 3, peep: 5 } as Record<string, number>)).toEqual({ peep: 5 });
  });
});

describe("telemetry alarms", () => {
  it("maps the four device severities to the three console priorities", () => {
    expect(severityToPriority("CRITICAL")).toBe("high");
    expect(severityToPriority("HIGH")).toBe("high");
    expect(severityToPriority("MEDIUM")).toBe("medium");
    expect(severityToPriority("LOW")).toBe("low");
    expect(severityToPriority("SOMETHING")).toBe("medium");
    expect(severityToPriority("constructor")).toBe("medium");
  });

  it("adds, updates and clears device alarms by type, keeping the onset time", () => {
    const active = applyDeviceAlarm([], deviceAlarm());

    expect(active).toEqual([
      { id: "device:HIGH_PRESSURE", type: "HIGH_PRESSURE", priority: "high", message: "Presión alta: 42 (límite 40)", since: 5000 },
    ]);
    const updated = applyDeviceAlarm(active, deviceAlarm({ severity: "CRITICAL", currentValue: 45, timestamp: 6000 }));
    expect(updated[0]).toMatchObject({ message: "Presión alta: 45 (límite 40)", since: 5000 });

    const other = applyDeviceAlarm(updated, deviceAlarm({ type: "POWER_FAILURE", severity: "LOW", currentValue: null, thresholdValue: null, timestamp: 7000 }));
    expect(other.map((alarm) => [alarm.id, alarm.priority, alarm.message])).toEqual([
      ["device:HIGH_PRESSURE", "high", "Presión alta: 45 (límite 40)"],
      ["device:POWER_FAILURE", "low", "Falla de energía"],
    ]);
    expect(applyDeviceAlarm(other, deviceAlarm({ active: false })).map((alarm) => alarm.id)).toEqual(["device:POWER_FAILURE"]);
    // Unknown types keep the backend message.
    expect(applyDeviceAlarm([], deviceAlarm({ type: "NEW_TYPE", message: "Something" }))[0]?.message).toBe("Something");
    // Inherited object keys are not labels.
    expect(applyDeviceAlarm([], deviceAlarm({ type: "toString", message: "Raw" }))[0]?.message).toBe("Raw");
    expect(frameAlarmsToConsole(["constructor"], 1)[0]?.message).toBe("constructor");
  });

  it("turns frame alarm codes into console alarms and adds the synthetic no-data alarm", () => {
    const frameAlarms = frameAlarmsToConsole(["APNEA", "HIGH_PRESSURE"], 9000, [
      { id: "frame:APNEA", type: "APNEA", priority: "high", message: "Apnea", since: 8000 },
    ]);

    expect(frameAlarms).toEqual([
      { id: "frame:APNEA", type: "APNEA", priority: "high", message: "Apnea", since: 8000 },
      { id: "frame:HIGH_PRESSURE", type: "HIGH_PRESSURE", priority: "high", message: "Presión alta", since: 9000 },
    ]);
    const device = applyDeviceAlarm([], deviceAlarm());
    const merged = mergeConsoleAlarms(device, frameAlarms, noDataAlarm(10_000));

    // The frame code already raised by the device is shown once.
    expect(merged.map((alarm) => alarm.id)).toEqual([NO_DATA_ALARM_ID, "device:HIGH_PRESSURE", "frame:APNEA"]);
    expect(merged[0]).toEqual({ id: NO_DATA_ALARM_ID, type: "NO_DATA", priority: "high", message: "Equipo sin datos", since: 10_000 });
  });
});

describe("real console adapter", () => {
  const hub = createTelemetryFrameHub("reservation-1");

  it("marks every derived metric and never fills the ones the curves cannot give", () => {
    expect(toDerivedMetrics({ ...EMPTY_BREATH_METRICS, peakPressure: 20, peep: 5, ieRatio: 0.5 })).toEqual({
      peakPressure: { value: 20, derived: true },
      plateauPressure: { value: null, derived: true },
      drivingPressure: { value: null, derived: true, label: "ΔP", description: "Pplat menos la PEEP medida al final de la espiración (no es la PEEP total)" },
      totalPeep: { value: 5, derived: true, label: "PEEP", description: "PEEP medida al final de la espiración (sin pausa espiratoria)" },
      exhaledTidalVolume: { value: null, derived: true },
      minuteVolume: { value: null, derived: true },
      totalRespiratoryRate: { value: null, derived: true },
      ieRatio: { value: 0.5, derived: true },
      meanPressure: { value: null, derived: true },
      peakInspiratoryFlow: { value: null, derived: true },
      peakExpiratoryFlow: { value: null, derived: true },
    });
  });

  it("composes a read-only console from reported data, hiding the patient monitor without vitals", () => {
    const adapter = buildRealConsoleAdapter({
      frames: hub.source,
      sampleRateHz: 50,
      status: "live",
      metrics: EMPTY_BREATH_METRICS,
      reported: EMPTY_REPORTED_STATE,
      alarms: [],
    });

    expect(adapter.frames).toMatchObject({ sourceId: "reservation-1", subscribe: hub.source.subscribe, sampleRateHz: 50, status: "live" });
    expect(adapter.permissions).toEqual({ canControl: false });
    expect(adapter.settings).toEqual({ current: {}, applied: {} });
    expect(adapter.mode.current).toBe("—");
    expect(adapter.mode.options.map((option) => option.id)).toEqual(["VCV", "PCV", "SIMV", "PSV"]);
    expect(adapter.capabilities).toEqual({ patientMonitor: false });
    expect(adapter.patient.values).toEqual({});
    expect(adapter.limits).toEqual({});
    expect(() => adapter.onConfirm({ mode: null, changes: [] })).not.toThrow();
  });

  it("shows the reported settings, mode and vitals, and passes the control inputs through", () => {
    const onConfirm = vi.fn();
    const adapter = buildRealConsoleAdapter({
      frames: hub.source,
      status: "no-data",
      statusMessage: "Equipo sin datos",
      metrics: EMPTY_BREATH_METRICS,
      reported: { settings: { peep: 5, fio2: 40 }, mode: "PCV", spo2: 97, pco2: null, frameAlarms: null, frameAlarmsAt: null },
      alarms: [noDataAlarm(1)],
      canControl: true,
      readOnlyReason: "motivo",
      limits: { peep: { min: 0, max: 20, step: 1, unit: "cmH2O" } },
      inFlight: { peep: { status: "awaiting" } },
      onConfirm,
    });

    expect(adapter.frames).toMatchObject({ status: "no-data", statusMessage: "Equipo sin datos" });
    expect(adapter.frames.sampleRateHz).toBeUndefined();
    expect(adapter.settings).toEqual({ current: { peep: 5, fio2: 40 }, applied: { peep: 5, fio2: 40 }, inFlight: { peep: { status: "awaiting" } } });
    expect(adapter.mode.current).toBe("PCV");
    expect(adapter.patient.values).toEqual({ spo2: 97 });
    expect(adapter.capabilities).toEqual({ patientMonitor: true });
    expect(adapter.permissions).toEqual({ canControl: true, readOnlyReason: "motivo" });
    expect(adapter.alarms.map((alarm) => alarm.id)).toEqual([NO_DATA_ALARM_ID]);
    adapter.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  describe("without device settings (v1.8)", () => {
    const base = { frames: hub.source, status: "live" as const, metrics: EMPTY_BREATH_METRICS, alarms: [] };
    const proposal = { mode: "VCV", values: { tidalVolume: 450, peep: 5 } };
    const sentBase = { values: { tidalVolume: 500, peep: 8 }, mode: "SIMV" };

    it("offers the initial proposal only while nothing was sent, queued or in flight", () => {
      expect(buildRealConsoleAdapter({ ...base, reported: EMPTY_REPORTED_STATE, proposal }).proposal).toEqual(proposal);
      expect(buildRealConsoleAdapter({ ...base, reported: EMPTY_REPORTED_STATE, proposal, desired: { values: { peep: 6 }, mode: "VCV" } }).proposal).toBeUndefined();
      expect(buildRealConsoleAdapter({ ...base, reported: EMPTY_REPORTED_STATE, proposal, sentBase }).proposal).toBeUndefined();
      expect(buildRealConsoleAdapter({ ...base, reported: { ...EMPTY_REPORTED_STATE, settings: { peep: 5 } }, proposal }).proposal).toBeUndefined();
    });

    it("shows the last snapshot sent while the device reports nothing, and the device values once it does", () => {
      const sent = buildRealConsoleAdapter({ ...base, reported: EMPTY_REPORTED_STATE, sentBase });

      expect(sent.settings).toEqual({ current: { tidalVolume: 500, peep: 8 }, applied: { tidalVolume: 500, peep: 8 } });
      expect(sent.mode.current).toBe("SIMV");

      const reported = buildRealConsoleAdapter({ ...base, reported: { ...EMPTY_REPORTED_STATE, settings: { peep: 5 }, mode: "VCV" }, sentBase });

      expect(reported.settings).toEqual({ current: { peep: 5 }, applied: { peep: 5 } });
      expect(reported.mode.current).toBe("VCV");
    });
  });
});

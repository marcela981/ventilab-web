/*
* Funcionalidad: Simulation console adapter tests
* Descripción: Verifies the pure mapping from the worker output and the engine case to the console contract: samples,
*   metrics (including FiO2 in % from the settings and the I:E ratio), vitals and trends, alarms (engine severity,
*   onset kept while active), settings and limits from the vendored VENTILATOR_LIMITS (trigger in use only), SIMV
*   applicability, confirmed changes back to engine units, local validation, ranges from the case targets, the live
*   objectives and the PBW (Devine) patient summary. v1.1: an event confirmed between batches by a real sim loop is
*   enqueued with exactly the effective time the loop used; a rejected event is never enqueued. Depends on vitest,
*   the engine replay, the sim loop and the adapter.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { createSimLoop, replay, resolveVentilatorSettings, VENTILATOR_LIMITS } from "@shared/sim-engine";
import type { Alarm } from "@shared/sim-engine";
import {
  appendTrends,
  applicabilityFor,
  buildConsoleLimits,
  buildObjectives,
  patientSummary,
  rangesFromTargets,
  reconcileEvents,
  toConsoleAlarms,
  toConsoleMetrics,
  toConsoleSamples,
  toConsoleSettings,
  toPatientValues,
  toSettingsChanges,
  validateSettingsChange,
} from "./sim-console-adapter";
import { buildEngineCase } from "./sim-session-test-helpers";

const settings = resolveVentilatorSettings(buildEngineCase().initialSettings);

describe("worker output → console", () => {
  it("maps waveform samples to {tMs, pressure, flow, volume}", () => {
    expect(toConsoleSamples([{ simTimeMs: 20, pressureCmH2O: 12, flowLpm: -30, volumeMl: 250 }])).toEqual([
      { tMs: 20, pressure: 12, flow: -30, volume: 250 },
    ]);
  });

  it("maps the engine metrics to the console metric ids and the vitals", () => {
    const { final } = replay(buildEngineCase(), 42, [], 15_000);
    const metrics = toConsoleMetrics(final, settings);
    const cycle = final.lastCycle;

    expect(cycle).not.toBeNull();
    expect(metrics).toMatchObject({
      peakPressure: cycle?.peakPressureCmH2O,
      plateauPressure: cycle?.plateauPressureCmH2O,
      drivingPressure: cycle?.drivingPressureCmH2O,
      exhaledTidalVolume: cycle?.exhaledTidalVolumeMl,
      tidalVolumePerKg: cycle?.tidalVolumePerKgPbw,
      minuteVolume: final.ventilation.minuteVolumeLpm,
      totalRespiratoryRate: final.ventilation.totalRespiratoryRateBpm,
      ieRatio: cycle?.ieRatio,
      fio2: 40,
      mechanicalPower: cycle?.mechanicalPowerJPerMin,
    });
    expect(toPatientValues(final)).toEqual({
      spo2: final.gasExchange.spo2Percent,
      pao2: final.gasExchange.pao2MmHg,
      paco2: final.gasExchange.paco2MmHg,
      ph: final.gasExchange.ph,
      map: final.hemodynamics.meanArterialPressureMmHg,
    });
  });

  it("shows missing values before the first metrics and keeps the trends bounded", () => {
    expect(toConsoleMetrics(null, settings)).toMatchObject({ peakPressure: null, fio2: 40 });
    expect(toPatientValues(null)).toEqual({});

    const trends = appendTrends(appendTrends({}, { spo2: 90 }, 2), { spo2: 91, ph: 7.4 }, 2);

    expect(appendTrends(trends, { spo2: 92 }, 2)).toEqual({ spo2: [91, 92], ph: [7.4] });
  });

  it("maps alarm priority from the engine severity and keeps the onset while active", () => {
    const high: Alarm = { code: "HIGH_PRESSURE", severity: "HIGH", value: 42.34, threshold: 40 };
    const medium: Alarm = { code: "AUTO_PEEP", severity: "MEDIUM", value: 6, threshold: 5 };
    const first = toConsoleAlarms([high], 1000);

    expect(first).toEqual([{ id: "HIGH_PRESSURE", type: "HIGH_PRESSURE", priority: "high", message: "Presión alta: 42.3 (límite 40)", since: 1000 }]);

    const second = toConsoleAlarms([high, medium], 2000, first);

    expect(second.map((alarm) => [alarm.id, alarm.priority, alarm.since])).toEqual([
      ["HIGH_PRESSURE", "high", 1000],
      ["AUTO_PEEP", "medium", 2000],
    ]);
  });
});

describe("settings, limits and changes", () => {
  it("shows the applied settings in console units (FiO2 in %)", () => {
    expect(toConsoleSettings(settings)).toMatchObject({ tidalVolume: 500, respiratoryRate: 12, peep: 5, fio2: 40, inspiratoryTime: 1 });
  });

  it("takes min/max from the vendored ventilator limits and gives a limit only to the trigger in use", () => {
    const limits = buildConsoleLimits(settings);

    expect(limits.peep).toEqual({ min: VENTILATOR_LIMITS.peepCmH2O.min, max: VENTILATOR_LIMITS.peepCmH2O.max, step: 1, unit: "cmH2O" });
    expect(limits.fio2).toEqual({ min: 21, max: 100, step: 1, unit: "%" });
    expect(limits.flowTrigger).toBeDefined();
    expect(limits.pressureTrigger).toBeUndefined();
    expect(buildConsoleLimits({ ...settings, triggerType: "PRESSURE" }).flowTrigger).toBeUndefined();
  });

  it("swaps Vt for Pinsp in SIMV with pressure-controlled mandatory breaths", () => {
    expect(applicabilityFor(settings)).toBeUndefined();
    expect(applicabilityFor({ ...settings, simvMandatoryType: "PCV" })?.SIMV).toEqual(
      expect.arrayContaining(["inspiratoryPressure", "pressureSupport"]),
    );
    expect(applicabilityFor({ ...settings, simvMandatoryType: "PCV" })?.SIMV).not.toContain("tidalVolume");
  });

  it("converts a confirmation back to engine settings and ignores unknown ids", () => {
    expect(toSettingsChanges({ mode: "PCV", changes: [{ parameter: "fio2", value: 55 }, { parameter: "peep", value: 8 }, { parameter: "x", value: 1 }] })).toEqual({
      mode: "PCV",
      fio2: 0.55,
      peepCmH2O: 8,
    });
    expect(toSettingsChanges({ mode: "BOGUS", changes: [] })).toEqual({});
  });

  it("validates the merged settings like the engine and the backend", () => {
    expect(validateSettingsChange(settings, { peepCmH2O: 8 })).toEqual({ ok: true });

    const timing = validateSettingsChange(settings, { respiratoryRateBpm: 40, inspiratoryTimeS: 1.4 });

    expect(timing).toMatchObject({ ok: false });
    expect(timing.ok ? "" : timing.message).toContain("tiempo espiratorio");
    expect(validateSettingsChange(settings, { peepCmH2O: 25 })).toMatchObject({ ok: false });
  });
});

describe("case data", () => {
  it("turns the case targets into console normal ranges", () => {
    expect(rangesFromTargets({ spo2Percent: { min: 88, max: 95 }, plateauPressureMaxCmH2O: 30, tidalVolumePerKgPbw: { min: 4, max: 8 } })).toEqual({
      metrics: { plateauPressure: { max: 30 }, tidalVolumePerKg: { min: 4, max: 8 } },
      patient: { spo2: { min: 88, max: 95 } },
    });
  });

  it("lists the objectives as unknown before metrics and with their live status afterwards", () => {
    const targets = buildEngineCase().targets;

    expect(buildObjectives(targets, null)).toEqual([
      { id: "SPO2", label: "SpO2", target: "88–95 %", value: "—", status: "UNKNOWN" },
      { id: "PLATEAU_PRESSURE", label: "Presión meseta", target: "≤ 30 cmH2O", value: "—", status: "UNKNOWN" },
    ]);
    expect(buildObjectives(targets, [{ id: "SPO2", status: "UNMET", value: 86.4, min: 88, max: 95 }])).toEqual([
      { id: "SPO2", label: "SpO2", target: "88–95 %", value: "86 %", status: "UNMET" },
    ]);
  });

  it("computes the predicted body weight with the Devine formula", () => {
    expect(patientSummary(buildEngineCase({ patient: { sex: "MALE", heightCm: 175 } }))).toEqual({
      sexLabel: "Masculino",
      heightCm: 175,
      predictedBodyWeightKg: 70.6,
    });
    expect(patientSummary(buildEngineCase({ patient: { sex: "FEMALE", heightCm: 160 } })).predictedBodyWeightKg).toBe(52.4);
  });
});

describe("event acknowledgement", () => {
  function runningLoop() {
    let nowMs = 0;
    const clock = { now: () => nowMs };
    const loop = createSimLoop(buildEngineCase(), 42, { clock });

    loop.start();
    nowMs += 1000;
    loop.tick();
    // Wall time moves on, but the event takes effect at the loop's own simulated time.
    nowMs += 21;

    return loop;
  }

  it("enqueues an event confirmed between batches with exactly the effective time the loop used", () => {
    const loop = runningLoop();
    const changes = { peepCmH2O: 8 };

    loop.queueEvent({ type: "PARAM_CHANGE", id: "evt-1", changes });

    const batch = loop.tick();
    const result = reconcileEvents([{ id: "evt-1", changes }], batch);

    expect(result.confirmed).toEqual([
      { id: "evt-1", simTimeMs: batch.appliedEvents[0]?.simTimeMs, type: "PARAM_CHANGE", payload: { changes } },
    ]);
    expect(result.confirmed[0]?.simTimeMs).toBe(1000);
    expect(result.rejectedIds).toEqual([]);
    expect(result.pending).toEqual([]);
  });

  it("never enqueues a rejected event and keeps the events still waiting", () => {
    const loop = runningLoop();

    loop.queueEvent({ type: "PARAM_CHANGE", id: "bad", changes: { peepCmH2O: 99 } });

    const batch = loop.tick();
    const waiting = { id: "later", changes: { fio2: 0.5 } };
    const result = reconcileEvents([{ id: "bad", changes: { peepCmH2O: 99 } }, waiting], batch);

    expect(result.confirmed).toEqual([]);
    expect(result.rejectedIds).toEqual(["bad"]);
    expect(result.pending).toEqual([waiting]);
  });
});

/*
* Funcionalidad: Real monitor state tests
* Descripción: buildRealMonitorState (Bloque A): the RealMonitorStateDTO built from a real console adapter snapshot
*   (mode, settings back to the contract units with FiO2 as a fraction, metrics from readings and plain numbers, SpO2
*   and PCO2 as EtCO2, UPPER_CASE alarm codes only and at most 20, client limits by id, missing values left out, the
*   unknown mode omitted) and the trend recorder (one point per interval, at most 20, newest last, seconds ago from
*   now, empty snapshots skipped). Depends on vitest and the real monitor state entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { VentilatorConsoleAdapter } from "@shared/ventilator-console";
import { buildRealMonitorState, createMonitorTrend, MAX_STATE_ALARMS } from "./real-monitor-state";

function snapshot(overrides: Partial<VentilatorConsoleAdapter> = {}): VentilatorConsoleAdapter {
  return {
    frames: { subscribe: () => () => undefined },
    settings: { current: {}, applied: { tidalVolume: 450, respiratoryRate: 16, peep: 8, fio2: 50, inspiratoryTime: 1 } },
    mode: { current: "VCV", options: [] },
    metrics: { peakPressure: { value: 28, derived: true }, plateauPressure: null, totalPeep: 9, exhaledTidalVolume: { value: 440, derived: true }, totalRespiratoryRate: 16 },
    patient: { values: { spo2: 94, pco2: 38 } },
    alarms: [
      { id: "a", type: "HIGH_PRESSURE", priority: "high", message: "Presión alta", since: 0 },
      { id: "b", type: "NO_DATA", priority: "high", message: "Sin datos", since: 0 },
      { id: "c", type: "bad code", priority: "low", message: "x", since: 0 },
    ],
    alarmLimits: [
      { id: "highPressure", label: "Presión alta", value: 40, min: 10, max: 80, step: 1, unit: "cmH2O" },
      { id: "lowTidalVolume", label: "Vt bajo", value: 200, min: 50, max: 1000, step: 10, unit: "mL" },
      { id: "other", label: "Otro", value: 1, min: 0, max: 2, step: 1, unit: "" },
    ],
    permissions: { canControl: false },
    limits: {},
    onConfirm: () => undefined,
    ...overrides,
  };
}

describe("buildRealMonitorState", () => {
  it("maps the snapshot to the contract units and keeps only valid alarm codes", () => {
    expect(buildRealMonitorState(snapshot())).toEqual({
      alarmDetails: [{ code: "HIGH_PRESSURE", value: 28, threshold: 40, priority: "HIGH" }, { code: "NO_DATA", priority: "HIGH" }],
      mode: "VCV",
      settings: { tidalVolumeMl: 450, respiratoryRateBpm: 16, peepCmH2O: 8, fio2: 0.5, inspiratoryTimeS: 1 },
      metrics: { peakPressureCmH2O: 28, totalPeepCmH2O: 9, exhaledTidalVolumeMl: 440, measuredRespiratoryRateBpm: 16, spo2Percent: 94, etco2MmHg: 38 },
      alarms: ["HIGH_PRESSURE", "NO_DATA"],
      limits: { highPressureCmH2O: 40, lowTidalVolumeMl: 200 },
    });
  });

  it("leaves out the unknown mode and the empty blocks, caps the alarms and adds the trend and the case", () => {
    const alarms = Array.from({ length: 25 }, (_value, index) => ({ id: `a${index}`, type: `ALARM_${index}`, priority: "low" as const, message: "x", since: 0 }));
    const state = buildRealMonitorState(
      snapshot({ mode: { current: "—", options: [] }, settings: { current: {}, applied: {} }, metrics: {}, patient: { values: {} }, alarms, alarmLimits: [] }),
      [{ secondsAgo: 30, spo2Percent: 92 }],
      "engine-ards-unstable",
    );

    expect(state).toEqual({
      alarmDetails: alarms.slice(0, MAX_STATE_ALARMS).map((alarm) => ({ code: alarm.type, priority: "LOW" })),
      alarms: alarms.slice(0, MAX_STATE_ALARMS).map((alarm) => alarm.type),
      trend: [{ secondsAgo: 30, spo2Percent: 92 }],
      caseId: "engine-ards-unstable",
    });
  });
});

describe("buildRealMonitorState freshness (fix sim-assist-current-state)", () => {
  it("carries when the latest frame arrived and its age when the help is asked", () => {
    const state = buildRealMonitorState(snapshot(), [], null, { lastFrameAt: Date.UTC(2026, 10, 5, 23, 48, 33), now: Date.UTC(2026, 10, 5, 23, 48, 36, 500) });

    expect(state).toMatchObject({ lastFrameAt: "2026-11-05T23:48:33.000Z", dataAgeMs: 3500 });
  });

  it("leaves the freshness out before any frame arrived", () => {
    const state = buildRealMonitorState(snapshot(), [], null, { lastFrameAt: null, now: 1000 });

    expect(state).not.toHaveProperty("lastFrameAt");
    expect(state).not.toHaveProperty("dataAgeMs");
  });
});

describe("createMonitorTrend", () => {
  it("records one point per interval, keeps the newest ones and counts the seconds from now", () => {
    const trend = createMonitorTrend(15_000, 2);

    trend.record(snapshot({ metrics: {}, patient: { values: {} } }), 0);
    trend.record(snapshot(), 1_000);
    trend.record(snapshot(), 5_000);
    trend.record(snapshot({ patient: { values: { spo2: 90 } } }), 16_000);
    trend.record(snapshot({ patient: { values: { spo2: 88 } } }), 31_000);

    expect(trend.points(40_000)).toEqual([
      { secondsAgo: 24, peakPressureCmH2O: 28, exhaledTidalVolumeMl: 440, respiratoryRateBpm: 16, spo2Percent: 90 },
      { secondsAgo: 9, peakPressureCmH2O: 28, exhaledTidalVolumeMl: 440, respiratoryRateBpm: 16, spo2Percent: 88 },
    ]);
  });
});

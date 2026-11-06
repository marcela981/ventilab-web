/*
* Funcionalidad: Simulator AI help context tests
* Descripción: Checks the console context of a help request (current simulated time, unsent changes and the snapshot of
*   vitals, gases, severity, settings and alarms with priority, only defined fields), the request body fields it
*   becomes, and the reading of the analyzed state of `done` into the panel header ("Analizado en t = mm:ss · gravedad
*   X %", or the age of the device data in real mode) and of the INCONSISTENT_STATE notice.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { EngineMetrics, VentilatorSettings } from "@shared/sim-engine";
import {
  analysisHeader,
  buildClientSnapshot,
  formatSimTime,
  helpContextBody,
  isInconsistentNotice,
  parseHelpAnalysis,
} from "./sim-help-context.entity";

const METRICS = {
  simTimeMs: 76_200,
  gasExchange: { spo2Percent: 72.2, pao2MmHg: 38, paco2MmHg: 33.4, ph: 7.48 },
  hemodynamics: { meanArterialPressureMmHg: 65.8, heartRateBpm: 107 },
  alarms: [{ code: "LOW_SPO2", severity: "HIGH", value: 72.2, threshold: 90 }],
  patient: { status: "CRITICAL", severity: 0.69 },
} as unknown as EngineMetrics;

const APPLIED = { mode: "VCV", tidalVolumeMl: 420, respiratoryRateBpm: 22, peepCmH2O: 5, fio2: 0.9 } as VentilatorSettings;

describe("buildClientSnapshot", () => {
  it("takes what the console shows from its latest metrics and applied settings", () => {
    expect(buildClientSnapshot(METRICS, APPLIED)).toEqual({
      spo2Percent: 72.2,
      pao2MmHg: 38,
      paco2MmHg: 33.4,
      ph: 7.48,
      mapMmHg: 65.8,
      heartRateBpm: 107,
      severity: 0.69,
      status: "CRITICAL",
      alarms: [{ code: "LOW_SPO2", severity: "HIGH" }],
      settings: { mode: "VCV", tidalVolumeMl: 420, respiratoryRateBpm: 22, peepCmH2O: 5, fio2: 0.9 },
    });
  });

  it("sends nothing before the first metrics and leaves out missing values", () => {
    expect(buildClientSnapshot(null, APPLIED)).toBeUndefined();
    expect(buildClientSnapshot({ ...METRICS, patient: null, hemodynamics: { meanArterialPressureMmHg: 70, heartRateBpm: null } } as unknown as EngineMetrics, null))
      .not.toHaveProperty("heartRateBpm");
  });
});

describe("helpContextBody", () => {
  it("becomes the SimulationHelpContextDTO fields of the request", () => {
    expect(helpContextBody({ simTimeMs: 76_200.6, unsentChanges: true, clientSnapshot: { spo2Percent: 72 } }))
      .toEqual({ simTimeMs: 76_200, unsentChanges: true, clientSnapshot: { spo2Percent: 72 } });
    expect(helpContextBody({ simTimeMs: 1000, unsentChanges: false })).toEqual({ simTimeMs: 1000 });
    expect(helpContextBody(null)).toEqual({});
  });
});

describe("analysisHeader", () => {
  it("shows the simulated time and severity the server analyzed", () => {
    const done = { aiCallId: "c", source: "LLM", analysis: { simTimeMs: 76_200, severity: 0.48, patientStatus: "CRITICAL" } };

    expect(analysisHeader(parseHelpAnalysis(done))).toBe("Analizado en t = 01:16 · gravedad 48 %");
  });

  it("shows the age of the device data in real mode and says when it is stale", () => {
    expect(analysisHeader(parseHelpAnalysis({ analysis: { dataAgeMs: 400, stale: false } }))).toBe("Datos del equipo de hace 0 s");
    expect(analysisHeader(parseHelpAnalysis({ analysis: { dataAgeMs: 3500, stale: true } }))).toBe("Sin datos del equipo desde hace 4 s: la asesoría usa la última lectura.");
  });

  it("shows nothing for an older server without analysis", () => {
    expect(analysisHeader(parseHelpAnalysis({ aiCallId: "c" }))).toBeNull();
  });

  it("formats the time as mm:ss and reads the notice", () => {
    expect(formatSimTime(3_725_000)).toBe("62:05");
    expect(isInconsistentNotice({ notice: "INCONSISTENT_STATE" })).toBe(true);
    expect(isInconsistentNotice({ source: "DETERMINISTIC" })).toBe(false);
  });
});

/*
* Funcionalidad: Simulation patient status and debrief rule tests
* Descripción: Verifies the pure rules of the patient evolution (Bloque A): the status chip text with the severity
*   (left out in arrest and death), the deceased check, the outcome and timeline parsers (malformed and unknown items
*   dropped, a missing list empty), the mm:ss simulated time and the Spanish text of each timeline item (decisions in
*   console labels and display units, FiO2 in %, mode changes, alarm onsets and patient status changes). Depends on
*   vitest and the debrief entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { EngineMetrics } from "@shared/sim-engine";
import {
  describeDebriefItem,
  formatDebriefTime,
  isDeceased,
  parseOutcome,
  parseTimeline,
  patientConditionText,
} from "./sim-debrief.entity";

describe("patient status", () => {
  it("shows the status with the rounded severity, and only the status in arrest or death", () => {
    expect(patientConditionText("UNSTABLE", 0.454)).toBe("Inestable · gravedad 45 %");
    expect(patientConditionText("STABLE", 0)).toBe("Estable · gravedad 0 %");
    expect(patientConditionText("CRITICAL", 1.4)).toBe("Crítico · gravedad 100 %");
    expect(patientConditionText("ARREST", 1)).toBe("Paro cardíaco");
    expect(patientConditionText("DECEASED", 1)).toBe("Paciente fallecido");
  });

  it("detects a deceased patient only from the engine patient status", () => {
    const base = { patient: null } as unknown as EngineMetrics;

    expect(isDeceased(null)).toBe(false);
    expect(isDeceased(base)).toBe(false);
    expect(isDeceased({ ...base, patient: { status: "ARREST" } } as unknown as EngineMetrics)).toBe(false);
    expect(isDeceased({ ...base, patient: { status: "DECEASED" } } as unknown as EngineMetrics)).toBe(true);
  });
});

describe("debrief parsers", () => {
  it("reads the outcome and treats unknown values as missing", () => {
    expect(parseOutcome(null)).toBeNull();
    expect(parseOutcome({ status: "DECEASED", firstCriticalAtMs: 360_000, arrestAtMs: 600_000, deceasedAtMs: 720_000 })).toEqual({
      status: "DECEASED",
      firstCriticalAtMs: 360_000,
      arrestAtMs: 600_000,
      deceasedAtMs: 720_000,
    });
    expect(parseOutcome({ status: "ZOMBIE", firstCriticalAtMs: "soon" })).toEqual({
      status: null,
      firstCriticalAtMs: null,
      arrestAtMs: null,
      deceasedAtMs: null,
    });
  });

  it("keeps the well-formed timeline items only", () => {
    expect(parseTimeline(undefined)).toEqual([]);
    expect(parseTimeline([
      { simTimeMs: 15_000, kind: "DECISION", changes: [{ field: "peepCmH2O", from: 5, to: 12 }, { field: "x" }] },
      { simTimeMs: 16_000, kind: "DECISION", changes: [] },
      { simTimeMs: 20_000, kind: "ALARM", code: "LOW_SPO2" },
      { simTimeMs: 30_000, kind: "PATIENT_STATUS", code: "CRITICAL" },
      { simTimeMs: 31_000, kind: "PATIENT_STATUS", code: "BORED" },
      { kind: "ALARM", code: "APNEA" },
      "nope",
    ])).toEqual([
      { simTimeMs: 15_000, kind: "DECISION", changes: [{ field: "peepCmH2O", from: 5, to: 12 }] },
      { simTimeMs: 20_000, kind: "ALARM", code: "LOW_SPO2" },
      { simTimeMs: 30_000, kind: "PATIENT_STATUS", code: "CRITICAL" },
    ]);
  });
});

describe("debrief text", () => {
  it("formats the simulated time as mm:ss", () => {
    expect(formatDebriefTime(0)).toBe("00:00");
    expect(formatDebriefTime(65_400)).toBe("01:05");
    expect(formatDebriefTime(3_725_000)).toBe("62:05");
  });

  it("describes decisions in console labels and display units", () => {
    expect(describeDebriefItem({
      kind: "DECISION",
      simTimeMs: 0,
      changes: [
        { field: "peepCmH2O", from: 5, to: 12 },
        { field: "fio2", from: 0.4, to: 0.8 },
        { field: "tidalVolumeMl", from: null, to: 380 },
      ],
    })).toBe("PEEP 5 → 12 cmH₂O · FiO2 40 → 80 % · Vt — → 380 mL");
    expect(describeDebriefItem({ kind: "DECISION", simTimeMs: 0, changes: [{ field: "mode", from: "VCV", to: "PCV" }] })).toBe("Modo VCV → PCV");
  });

  it("describes alarm onsets and patient status changes", () => {
    expect(describeDebriefItem({ kind: "ALARM", simTimeMs: 0, code: "LOW_SPO2" })).toBe("Alarma: SpO₂ baja");
    expect(describeDebriefItem({ kind: "ALARM", simTimeMs: 0, code: "VENDOR_X" })).toBe("Alarma: VENDOR_X");
    expect(describeDebriefItem({ kind: "PATIENT_STATUS", simTimeMs: 0, code: "DECEASED" })).toBe("Estado del paciente: Paciente fallecido");
  });
});

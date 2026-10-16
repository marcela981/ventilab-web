/*
* Funcionalidad: Case tools entity tests
* Descripción: Unit tests of the pure rules of the case editor tools (T12): the test-run form (whole seconds in
*   1–1800, optional whole seed in 0–2147483646, Spanish messages), the test-run chart series read defensively from
*   the metrics timeline (sampled, gaps for missing values, rounded), the engine case of the local preview built from
*   the upsert body like the backend simulation case mapper (shunt curve or basal shunt, settings, events, targets;
*   null with the missing blocks when the profile is incomplete), and the "case in use" conflict of a delete. Depends
*   on vitest, the api-client error type and the case tools entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import type { UpsertClinicalCaseDTO } from "../../api/dtos/case-editor.dto";
import {
  formatSimClock,
  isCaseInUseError,
  parseTestRunForm,
  previewEngineCase,
  TEST_RUN_COPY,
  testRunSeries,
} from "./case-tools.entity";

const MECHANICS = {
  complianceMlPerCmH2O: 30,
  resistanceCmH2OPerLps: 12,
  deadSpaceMl: 150,
  vco2MlPerMin: 220,
  bicarbonateMmolPerL: 24,
  hemoglobinGPerDl: 13,
  arteriovenousO2DifferenceMlPerDl: 5,
  basalShuntFraction: 0.25,
  recruitmentCurve: [{ peepCmH2O: 5, shuntFraction: 0.3 }, { peepCmH2O: 10, shuntFraction: 0.2 }],
  patientEffort: { amplitudeCmH2O: 0, rateBpm: 0, inspiratoryFraction: 0.35 },
  hemodynamics: { baselineMapMmHg: 85, meanAirwayPressureThresholdCmH2O: 15, mapDropPerCmH2O: 1 },
  gasTimeConstants: { paco2TimeConstantMin: 3, oxygenTimeConstantS: 30 },
  deterioration: { ratePerMin: 0, maxComplianceLossFraction: 0.3, maxShuntIncrease: 0.1 },
};

function without(source: UpsertClinicalCaseDTO, keys: readonly (keyof UpsertClinicalCaseDTO)[]): UpsertClinicalCaseDTO {
  const copy: Partial<UpsertClinicalCaseDTO> = { ...source };

  keys.forEach((key) => {
    delete copy[key];
  });

  return copy as UpsertClinicalCaseDTO;
}

function body(overrides: Partial<UpsertClinicalCaseDTO> = {}): UpsertClinicalCaseDTO {
  return {
    title: "SDRA",
    description: "Caso",
    patientAge: 52,
    patientWeight: 120,
    mainDiagnosis: "SDRA",
    comorbidities: [],
    difficulty: "INTERMEDIATE",
    pathology: "SDRA",
    educationalGoal: "Ventilación protectora",
    patientSex: "FEMALE",
    patientHeightCm: 165,
    mechanics: MECHANICS,
    initialState: { paco2MmHg: 48, pao2MmHg: 62 },
    initialVentilatorSettings: { mode: "VCV", tidalVolumeMl: 420, peepCmH2O: 8, fio2: 0.6 },
    events: [{ simTimeMs: 300000, type: "SECRETIONS", resistanceFactor: 1.5 }],
    targets: { spo2Percent: { min: 88, max: 95 }, plateauPressureMaxCmH2O: 30 },
    ...overrides,
  };
}

describe("test-run form", () => {
  it("accepts whole seconds in 1–1800 and an optional whole seed", () => {
    expect(parseTestRunForm({ seconds: "300", seed: "" })).toEqual({ ok: true, request: { seconds: 300 } });
    expect(parseTestRunForm({ seconds: " 1800 ", seed: "42" })).toEqual({ ok: true, request: { seconds: 1800, seed: 42 } });
    expect(parseTestRunForm({ seconds: "1", seed: "0" })).toEqual({ ok: true, request: { seconds: 1, seed: 0 } });
  });

  it("rejects seconds out of range or not whole, and an invalid seed", () => {
    expect(parseTestRunForm({ seconds: "0", seed: "" })).toEqual({ ok: false, errors: { seconds: TEST_RUN_COPY.secondsInvalid } });
    expect(parseTestRunForm({ seconds: "1801", seed: "-1" })).toEqual({
      ok: false,
      errors: { seconds: TEST_RUN_COPY.secondsInvalid, seed: TEST_RUN_COPY.seedInvalid },
    });
    expect(parseTestRunForm({ seconds: "2,5", seed: "2147483647" })).toEqual({
      ok: false,
      errors: { seconds: TEST_RUN_COPY.secondsInvalid, seed: TEST_RUN_COPY.seedInvalid },
    });
    expect(parseTestRunForm({ seconds: "", seed: "abc" }).ok).toBe(false);
  });
});

describe("test-run series", () => {
  const snapshot = (second: number, spo2: number | null, plateau: number | null) => ({
    simTimeMs: second * 1000,
    gasExchange: { spo2Percent: spo2, paco2MmHg: 45.123, ph: 7.351 },
    hemodynamics: { meanArterialPressureMmHg: 80 },
    lastCycle: plateau === null ? null : { plateauPressureCmH2O: plateau, drivingPressureCmH2O: 14, tidalVolumePerKgPbw: 6.04 },
  });

  it("reads the key metrics per snapshot, rounded, with a gap where a value is missing", () => {
    const series = testRunSeries([snapshot(1, 90, null), snapshot(2, 91.456, 28)]);

    expect(series.timesMs).toEqual([1000, 2000]);
    expect(series.series.find((item) => item.id === "spo2")?.values).toEqual([90, 91.46]);
    expect(series.series.find((item) => item.id === "plateauPressure")?.values).toEqual([null, 28]);
    expect(series.series.find((item) => item.id === "ph")?.values).toEqual([7.35, 7.35]);
  });

  it("samples a long timeline evenly, keeping the last snapshot, and ignores malformed entries", () => {
    const timeline: unknown[] = Array.from({ length: 300 }, (_value, index) => snapshot(index + 1, 90, 25));

    timeline.splice(10, 0, null, { simTimeMs: "x" });

    const series = testRunSeries(timeline, 10);

    expect(series.timesMs).toHaveLength(10);
    expect(series.timesMs[0]).toBe(1000);
    expect(series.timesMs.at(-1)).toBe(300_000);
  });

  it("is empty for an empty or invalid timeline", () => {
    expect(testRunSeries([]).timesMs).toEqual([]);
    expect(testRunSeries([{ foo: 1 }]).timesMs).toEqual([]);
  });
});

describe("simulated clock", () => {
  it("formats m:ss and h:mm:ss", () => {
    expect(formatSimClock(0)).toBe("0:00");
    expect(formatSimClock(65_400)).toBe("1:05");
    expect(formatSimClock(3_725_000)).toBe("1:02:05");
  });
});

describe("local preview engine case", () => {
  it("maps the upsert body like the backend simulation case mapper", () => {
    const result = previewEngineCase("c1", body());

    expect(result.missing).toEqual([]);
    expect(result.engineCase).toMatchObject({
      id: "c1",
      patient: { sex: "FEMALE", heightCm: 165 },
      mechanics: { complianceMlPerCmH2O: 30, resistanceCmH2OPerLps: 12 },
      effort: MECHANICS.patientEffort,
      gasExchange: {
        vco2MlPerMin: 220,
        deadSpaceMl: 150,
        initialPaco2MmHg: 48,
        initialPao2MmHg: 62,
        paco2TimeConstantMin: 3,
        oxygenTimeConstantS: 30,
        shuntCurve: [{ peepCmH2O: 5, shuntFraction: 0.3 }, { peepCmH2O: 10, shuntFraction: 0.2 }],
      },
      hemodynamics: MECHANICS.hemodynamics,
      deterioration: MECHANICS.deterioration,
      initialSettings: { mode: "VCV", tidalVolumeMl: 420, peepCmH2O: 8, fio2: 0.6 },
      events: [{ simTimeMs: 300000, type: "SECRETIONS", resistanceFactor: 1.5 }],
      targets: { spo2Percent: { min: 88, max: 95 }, plateauPressureMaxCmH2O: 30 },
    });
  });

  it("uses the basal shunt without a recruitment curve, and no targets as an empty object", () => {
    const result = previewEngineCase("c1", without(body({ mechanics: { ...MECHANICS, recruitmentCurve: [] } }), ["targets"]));

    expect(result.engineCase?.gasExchange.shuntCurve).toEqual([{ peepCmH2O: 0, shuntFraction: 0.25 }]);
    expect(result.engineCase?.targets).toEqual({});
  });

  it("lists the missing blocks of an incomplete simulation profile", () => {
    const general = without(body(), ["patientSex", "mechanics", "initialVentilatorSettings", "initialState", "patientHeightCm"]);

    expect(previewEngineCase("c1", general)).toEqual({
      engineCase: null,
      missing: ["patientSex", "patientHeightCm", "mechanics", "initialVentilatorSettings", "initialState"],
    });
  });
});

describe("delete conflict", () => {
  it("recognises the case-in-use refusal", () => {
    expect(isCaseInUseError(new ApiError({ code: "clinical-cases.clinical_case_in_use", message: "", status: 409 }))).toBe(true);
    expect(isCaseInUseError(new ApiError({ code: "common.conflict", message: "", status: 409 }))).toBe(true);
    expect(isCaseInUseError(new ApiError({ code: "clinical-cases.clinical_case_not_found", message: "", status: 404 }))).toBe(false);
  });
});

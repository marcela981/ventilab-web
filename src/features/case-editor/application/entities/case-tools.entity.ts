/*
* Funcionalidad: Case tools entity
* Descripción: Pure rules of the case editor tools (T12). The test-run form: whole simulated seconds in 1–1800
*   (default 300) and an optional whole seed in 0–2147483646, the bounds of the backend request DTO (the generated
*   OpenAPI types carry no minimum/maximum; BACKEND GAP); the chart series of a test run, read defensively from the
*   `metricsTimeline` (one engine metrics snapshot per simulated second, typed as an opaque object in the contract),
*   sampled evenly to a few points with gaps for missing values; the engine case of the local preview built from the
*   upsert body of the current draft exactly like the backend `SimulationCaseMapper.toDefinition` (null with the
*   missing blocks when the simulation profile is incomplete); and the "case in use" conflict of a delete (409, the
*   backend suggests archiving). No official score is computed here. Depends on the api-client error type, the
*   sim-engine types and the case editor DTOs.
*   v1.1 (review of ffe9297): "in use" is decided by the code `clinical-cases.clinical_case_in_use` (the 409 status
*   only without a code); the preview initial settings keep only number and string values, like the backend mapper.
*   v1.2 (B4, D7): the whole seconds and seed are read with the shared parseDecimal in integer mode.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import { parseDecimal } from "@shared/lib/parse-decimal";
import type { CaseEvent, EngineCase, ShuntCurvePoint, VentilatorSettings } from "@shared/sim-engine";
import type { ClinicalCaseTestRunRequestDTO, UpsertClinicalCaseDTO } from "../../api/dtos/case-editor.dto";

/** Bounds of the backend test-run request DTO (`MIN/MAX_TEST_RUN_SECONDS`, `MAX_SEED`); not in the generated types. */
export const TEST_RUN_LIMITS = { minSeconds: 1, maxSeconds: 1800, defaultSeconds: 300, maxSeed: 2147483646 } as const;

/** Most points per test-run chart: the timeline (one snapshot per simulated second) is sampled evenly. */
export const TEST_RUN_MAX_POINTS = 30;

export const CASE_IN_USE_CODE = "clinical-cases.clinical_case_in_use";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const TEST_RUN_COPY = {
  secondsInvalid: `Escribe un número entero de segundos entre ${TEST_RUN_LIMITS.minSeconds} y ${TEST_RUN_LIMITS.maxSeconds}.`,
  seedInvalid: `La semilla debe ser un número entero entre 0 y ${TEST_RUN_LIMITS.maxSeed}, o quedar vacía.`,
} as const;

export type TestRunForm = { seconds: string, seed: string };

export type TestRunFormErrors = Partial<Record<keyof TestRunForm, string>>;

export type TestRunFormResult =
  | { ok: true, request: ClinicalCaseTestRunRequestDTO }
  | { ok: false, errors: TestRunFormErrors };

function parseWhole(value: string): number | null {
  const parsed = parseDecimal(value, { integer: true, allowNegative: false });

  return parsed.ok ? parsed.value : null;
}

export function parseTestRunForm(form: TestRunForm): TestRunFormResult {
  const errors: TestRunFormErrors = {};
  const seconds = parseWhole(form.seconds);
  const seedText = form.seed.trim();
  const seed = seedText === "" ? null : parseWhole(seedText);

  if (seconds === null || seconds < TEST_RUN_LIMITS.minSeconds || seconds > TEST_RUN_LIMITS.maxSeconds) {
    errors.seconds = TEST_RUN_COPY.secondsInvalid;
  }

  if (seedText !== "" && (seed === null || seed > TEST_RUN_LIMITS.maxSeed)) {
    errors.seed = TEST_RUN_COPY.seedInvalid;
  }

  if (Object.keys(errors).length > 0 || seconds === null) {
    return { ok: false, errors };
  }

  return { ok: true, request: seed === null ? { seconds } : { seconds, seed } };
}

// ---- test-run charts ----------------------------------------------------------------------------------------------

export type TestRunMetricId = "spo2" | "paco2" | "ph" | "plateauPressure" | "drivingPressure" | "tidalVolumePerKg" | "map";

export type TestRunSeriesItem = { id: TestRunMetricId, label: string, unit: string, values: readonly (number | null)[] };

export type TestRunSeries = { timesMs: readonly number[], series: readonly TestRunSeriesItem[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function read(snapshot: Record<string, unknown>, block: string, field: string): number | null {
  const container = snapshot[block];
  const value = isRecord(container) ? container[field] : undefined;

  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

const TEST_RUN_METRICS: ReadonlyArray<{ id: TestRunMetricId, label: string, unit: string, block: string, field: string }> = [
  { id: "spo2", label: "SpO2", unit: "%", block: "gasExchange", field: "spo2Percent" },
  { id: "paco2", label: "PaCO2", unit: "mmHg", block: "gasExchange", field: "paco2MmHg" },
  { id: "ph", label: "pH", unit: "", block: "gasExchange", field: "ph" },
  { id: "plateauPressure", label: "Presión meseta", unit: "cmH2O", block: "lastCycle", field: "plateauPressureCmH2O" },
  { id: "drivingPressure", label: "Presión de distensión", unit: "cmH2O", block: "lastCycle", field: "drivingPressureCmH2O" },
  { id: "tidalVolumePerKg", label: "Vt/kg de peso predicho", unit: "mL/kg", block: "lastCycle", field: "tidalVolumePerKgPbw" },
  { id: "map", label: "Presión arterial media", unit: "mmHg", block: "hemodynamics", field: "meanArterialPressureMmHg" },
];

/** Evenly spaced indexes of a list, always including the first and the last element. */
function sampleIndexes(length: number, maxPoints: number): number[] {
  if (length <= maxPoints) {
    return Array.from({ length }, (_value, index) => index);
  }

  const step = (length - 1) / (maxPoints - 1);

  return Array.from({ length: maxPoints }, (_value, index) => Math.round(index * step));
}

/** The key metric series of a test-run timeline, sampled to at most maxPoints snapshots. */
export function testRunSeries(timeline: readonly unknown[], maxPoints: number = TEST_RUN_MAX_POINTS): TestRunSeries {
  const snapshots = timeline.filter(
    (item): item is Record<string, unknown> => isRecord(item) && typeof item.simTimeMs === "number" && Number.isFinite(item.simTimeMs),
  );
  const picked = sampleIndexes(snapshots.length, Math.max(2, maxPoints)).flatMap((index) => {
    const snapshot = snapshots[index];

    return snapshot ? [snapshot] : [];
  });

  return {
    timesMs: picked.map((snapshot) => snapshot.simTimeMs as number),
    series: TEST_RUN_METRICS.map(({ id, label, unit, block, field }) => ({
      id,
      label,
      unit,
      values: picked.map((snapshot) => read(snapshot, block, field)),
    })),
  };
}

/** A simulated time as m:ss (h:mm:ss from one hour), for the chart axis and the preview clock. */
export function formatSimClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

// ---- local preview ------------------------------------------------------------------------------------------------

export type PreviewBlock = "patientSex" | "patientHeightCm" | "mechanics" | "initialVentilatorSettings" | "initialState";

export type PreviewEngineCase = { engineCase: EngineCase | null, missing: readonly PreviewBlock[] };

/**
 * The initial settings kept to their number and string values, as the backend `SimulationCaseMapper._initialSettings`
 * does (a null or nested value never reaches the engine).
 */
export function previewInitialSettings(settings: object): Partial<VentilatorSettings> {
  return Object.fromEntries(
    Object.entries(settings).filter(([, value]) => typeof value === "number" || typeof value === "string"),
  ) as Partial<VentilatorSettings>;
}

/**
 * The engine case the backend would simulate for this body (`SimulationCaseMapper.toDefinition`). It is built from
 * the UNSAVED draft body, not from the server-normalised snapshot of a stored case, so it previews what the author is
 * editing (the server test run covers the stored case). The recruitment
 * curve as the shunt curve (or one point at PEEP 0 with the basal shunt), the initial settings as given, the events
 * and the targets (empty when absent). Null with the missing blocks when the simulation profile is incomplete.
 */
export function previewEngineCase(caseId: string, body: UpsertClinicalCaseDTO): PreviewEngineCase {
  const { patientSex, patientHeightCm, mechanics, initialVentilatorSettings, initialState } = body;
  const missing: PreviewBlock[] = [];

  if (patientSex === undefined) {
    missing.push("patientSex");
  }

  if (patientHeightCm === undefined) {
    missing.push("patientHeightCm");
  }

  if (mechanics === undefined) {
    missing.push("mechanics");
  }

  if (initialVentilatorSettings === undefined) {
    missing.push("initialVentilatorSettings");
  }

  if (initialState === undefined) {
    missing.push("initialState");
  }

  if (
    patientSex === undefined
    || patientHeightCm === undefined
    || mechanics === undefined
    || initialVentilatorSettings === undefined
    || initialState === undefined
  ) {
    return { engineCase: null, missing };
  }

  const shuntCurve: ShuntCurvePoint[] = mechanics.recruitmentCurve.length === 0
    ? [{ peepCmH2O: 0, shuntFraction: mechanics.basalShuntFraction }]
    : mechanics.recruitmentCurve.map((point) => ({ peepCmH2O: point.peepCmH2O, shuntFraction: point.shuntFraction }));

  return {
    missing,
    engineCase: {
      id: caseId,
      patient: { sex: patientSex, heightCm: patientHeightCm },
      mechanics: { complianceMlPerCmH2O: mechanics.complianceMlPerCmH2O, resistanceCmH2OPerLps: mechanics.resistanceCmH2OPerLps },
      effort: mechanics.patientEffort,
      gasExchange: {
        vco2MlPerMin: mechanics.vco2MlPerMin,
        deadSpaceMl: mechanics.deadSpaceMl,
        bicarbonateMmolPerL: mechanics.bicarbonateMmolPerL,
        hemoglobinGPerDl: mechanics.hemoglobinGPerDl,
        arteriovenousO2DifferenceMlPerDl: mechanics.arteriovenousO2DifferenceMlPerDl,
        initialPaco2MmHg: initialState.paco2MmHg,
        initialPao2MmHg: initialState.pao2MmHg,
        paco2TimeConstantMin: mechanics.gasTimeConstants.paco2TimeConstantMin,
        oxygenTimeConstantS: mechanics.gasTimeConstants.oxygenTimeConstantS,
        shuntCurve,
      },
      hemodynamics: mechanics.hemodynamics,
      deterioration: mechanics.deterioration,
      initialSettings: previewInitialSettings(initialVentilatorSettings),
      events: (body.events ?? []).map((event): CaseEvent => ({ ...event })),
      targets: body.targets ?? {},
    },
  };
}

// ---- delete -------------------------------------------------------------------------------------------------------

/**
 * The delete was refused because the case is used (sessions, attempts or questions): archiving is the way out. The
 * code decides; the 409 status counts only when the error carries no code (another 409 is not "in use").
 */
export function isCaseInUseError(error: unknown): boolean {
  const apiError = toApiError(error);

  const hasCode = apiError.code !== "" && apiError.code !== CLIENT_ERROR_CODES.unknown;

  return hasCode ? apiError.code === CASE_IN_USE_CODE : apiError.status === 409;
}

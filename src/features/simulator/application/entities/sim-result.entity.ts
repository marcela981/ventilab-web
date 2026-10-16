/*
* Funcionalidad: Simulation result entities
* Descripción: Types and pure rules of the session result page (T8): the server summary read model (score, rubric
*   breakdown, final targets and metrics, AI help count), the criteria that carry the time to stabilise and the
*   safety violations (only when the session rubric includes them), the exam link of a session, the comparison of
*   the local replay final metrics with the server `finalMetrics` (a discreet note when they differ; the server values
*   are never replaced) and the evolution series of key metrics built from the local replay timeline. The score is
*   always the server's; nothing here computes a grade. Depends on the sim-engine public types and the result config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { EngineMetrics, TargetStatus } from "@shared/sim-engine";
import {
  DETERMINISM_TOLERANCE,
  EVOLUTION_MAX_POINTS,
  EVOLUTION_METRICS,
  SAFETY_VIOLATIONS_CRITERION,
  TIME_TO_STABILIZE_CRITERION,
} from "../config/sim-result.config";
import type { EvolutionMetricId } from "../config/sim-result.config";

/** One criterion of the server rubric breakdown, as the server justified it. */
export type ScoreCriterion = {
  criterion: string
  weight: number | null
  value: number | null
  threshold: number | null
  points: number | null
  weightedPoints: number | null
  justification: string
};

export type SessionSummary = {
  id: string
  status: string
  engineVersion: string
  /** Simulated time the server scored. */
  simTimeMs: number
  durationMs: number
  /** Opaque engine metrics of the server replay; only compared, never shown in place of the server summary. */
  finalMetrics: unknown
  /** Final target statuses the server reported (unknown target ids are dropped by the mapper). */
  targets: readonly TargetStatus[]
  /** Server-computed score between 0 and 1. */
  score: number
  breakdown: readonly ScoreCriterion[]
  aiHelpCount: number
};

/** Exam linkage of a session (history DTO); null ids in FREE mode. */
export type SessionExamLink = {
  mode: string
  attemptId: string | null
  questionId: string | null
};

export function findCriterion(summary: Pick<SessionSummary, "breakdown">, criterion: string): ScoreCriterion | null {
  return summary.breakdown.find((item) => item.criterion === criterion) ?? null;
}

/** TIME_TO_STABILIZE value in seconds (null = never stabilised); the criterion is null when the rubric omits it. */
export function timeToStabilize(summary: Pick<SessionSummary, "breakdown">): ScoreCriterion | null {
  return findCriterion(summary, TIME_TO_STABILIZE_CRITERION);
}

/** SAFETY_VIOLATIONS value in seconds of exposure; null when the rubric omits it. */
export function safetyViolations(summary: Pick<SessionSummary, "breakdown">): ScoreCriterion | null {
  return findCriterion(summary, SAFETY_VIOLATIONS_CRITERION);
}

export type MetricDifference = { field: string, local: number | string | null, server: number | string | null };

export type MetricsComparison =
  | { status: "match" }
  | { status: "mismatch", differences: readonly MetricDifference[] }
  | { status: "unavailable" };

type FieldReader = { field: string, read: (metrics: EngineMetrics) => number | null };

const COMPARED_FIELDS: readonly FieldReader[] = [
  { field: "simTimeMs", read: (m) => m.simTimeMs },
  { field: "gasExchange.spo2Percent", read: (m) => m.gasExchange.spo2Percent },
  { field: "gasExchange.pao2MmHg", read: (m) => m.gasExchange.pao2MmHg },
  { field: "gasExchange.paco2MmHg", read: (m) => m.gasExchange.paco2MmHg },
  { field: "gasExchange.ph", read: (m) => m.gasExchange.ph },
  { field: "hemodynamics.meanArterialPressureMmHg", read: (m) => m.hemodynamics.meanArterialPressureMmHg },
  { field: "ventilation.minuteVolumeLpm", read: (m) => m.ventilation.minuteVolumeLpm },
  { field: "ventilation.totalRespiratoryRateBpm", read: (m) => m.ventilation.totalRespiratoryRateBpm },
  { field: "lastCycle.peakPressureCmH2O", read: (m) => m.lastCycle?.peakPressureCmH2O ?? null },
  { field: "lastCycle.plateauPressureCmH2O", read: (m) => m.lastCycle?.plateauPressureCmH2O ?? null },
  { field: "lastCycle.drivingPressureCmH2O", read: (m) => m.lastCycle?.drivingPressureCmH2O ?? null },
  { field: "lastCycle.exhaledTidalVolumeMl", read: (m) => m.lastCycle?.exhaledTidalVolumeMl ?? null },
  { field: "lastCycle.tidalVolumePerKgPbw", read: (m) => m.lastCycle?.tidalVolumePerKgPbw ?? null },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads a dotted path of an opaque object: a number, null (explicit null / missing parent) or undefined (absent). */
function readPath(source: Record<string, unknown>, field: string): number | null | undefined {
  let current: unknown = source;

  for (const key of field.split(".")) {
    if (current === null) {
      return null;
    }

    if (!isRecord(current) || !(key in current)) {
      return undefined;
    }

    current = current[key];
  }

  if (current === null) {
    return null;
  }

  return typeof current === "number" && Number.isFinite(current) ? current : undefined;
}

function sameNumber(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
}

function serverTargetStatuses(server: Record<string, unknown>): Map<string, string> {
  const statuses = new Map<string, string>();

  if (Array.isArray(server.targets)) {
    server.targets.forEach((target: unknown) => {
      if (isRecord(target) && typeof target.id === "string" && typeof target.status === "string") {
        statuses.set(target.id, target.status);
      }
    });
  }

  return statuses;
}

/**
 * Compares the final metrics of the local replay with the server `finalMetrics`. Fields the server object does not
 * carry are skipped; `unavailable` when the server value is not an object. The result is informative only.
 */
export function compareFinalMetrics(local: EngineMetrics, server: unknown, tolerance: number = DETERMINISM_TOLERANCE): MetricsComparison {
  if (!isRecord(server)) {
    return { status: "unavailable" };
  }

  const differences: MetricDifference[] = [];

  COMPARED_FIELDS.forEach(({ field, read }) => {
    const serverValue = readPath(server, field);
    const localValue = read(local);

    if (serverValue === undefined) {
      return;
    }

    const equal = serverValue === null || localValue === null
      ? serverValue === localValue
      : sameNumber(localValue, serverValue, tolerance);

    if (!equal) {
      differences.push({ field, local: localValue, server: serverValue });
    }
  });

  const serverTargets = serverTargetStatuses(server);

  local.targets.forEach((target) => {
    const serverStatus = serverTargets.get(target.id);

    if (serverStatus !== undefined && serverStatus !== target.status) {
      differences.push({ field: `targets.${target.id}`, local: target.status, server: serverStatus });
    }
  });

  return differences.length === 0 ? { status: "match" } : { status: "mismatch", differences };
}

export type EvolutionSeries = {
  id: EvolutionMetricId
  label: string
  unit: string
  values: readonly (number | null)[]
};

export type Evolution = {
  /** Simulated time of each sampled snapshot (ms). */
  timesMs: readonly number[]
  series: readonly EvolutionSeries[]
};

const METRIC_READERS: Readonly<Record<EvolutionMetricId, (metrics: EngineMetrics) => number | null>> = {
  spo2: (m) => m.gasExchange.spo2Percent,
  paco2: (m) => m.gasExchange.paco2MmHg,
  plateauPressure: (m) => m.lastCycle?.plateauPressureCmH2O ?? null,
  tidalVolumePerKg: (m) => m.lastCycle?.tidalVolumePerKgPbw ?? null,
};

/** Evenly spaced indexes of a list, always including the last element. */
export function sampleIndexes(length: number, maxPoints: number): number[] {
  if (length <= 0 || maxPoints <= 0) {
    return [];
  }

  if (length <= maxPoints) {
    return Array.from({ length }, (_value, index) => index);
  }

  const step = (length - 1) / (maxPoints - 1);

  return Array.from({ length: maxPoints }, (_value, index) => Math.round(index * step));
}

function rounded(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100;
}

/** Key metric series of the local replay timeline (plus its final snapshot), sampled to at most maxPoints. */
export function buildEvolution(timeline: readonly EngineMetrics[], final: EngineMetrics | null, maxPoints: number = EVOLUTION_MAX_POINTS): Evolution {
  const snapshots = final && timeline.at(-1)?.simTimeMs !== final.simTimeMs ? [...timeline, final] : [...timeline];
  const picked = sampleIndexes(snapshots.length, maxPoints).flatMap((index) => {
    const snapshot = snapshots[index];

    return snapshot ? [snapshot] : [];
  });

  return {
    timesMs: picked.map((snapshot) => snapshot.simTimeMs),
    series: EVOLUTION_METRICS.map(({ id, label, unit }) => ({
      id,
      label,
      unit,
      values: picked.map((snapshot) => rounded(METRIC_READERS[id](snapshot))),
    })),
  };
}

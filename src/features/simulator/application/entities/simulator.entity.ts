/*
* Funcionalidad: Simulator entities
* Descripción: Front-end model of the simulator catalog and history: a clinical case card (summary + the expert-validation flag only when the data carries it; the list `userAttempts` belong to the old configuration-comparison flow, not to simulation sessions, so they are not shown), a started session, a session history row (with the case title resolved separately), the catalog filters and the list pagination. Pure helpers: the server-side catalog query (pathology and difficulty are real query params of GET /api/clinical-cases, so no client-side filtering), the history query, the session duration (end − start, null while running), the Spanish labels of free-text pathology/difficulty/status values (case-insensitive, raw value as fallback) and the duration and score formatting. Depends on the simulator config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { DIFFICULTY_LABELS, PATHOLOGY_LABELS, SESSION_STATUS_LABELS, SIMULATION_MODE_LABELS } from "../config/simulator.config";
import type { CaseDifficulty, CasePathology } from "../config/simulator.config";

export type CaseCard = {
  id: string
  title: string
  description: string
  mainDiagnosis: string
  pathology: string
  difficulty: string
  patientAge: number
  patientWeight: number
  /** `null`: the source did not say (the list summary has no such flag). */
  validatedByExpert: boolean | null
};

export type StartedSession = {
  id: string
  seed: number
  engineVersion: string
  startedAt: string
  expiresAt: string | null
  timeMultiplier: number
  /** Engine case definition the client runs locally (opaque until the console adapter reads it). */
  engineCase: unknown
};

export type SessionHistoryItem = {
  id: string
  caseId: string
  mode: string
  status: string
  startedAt: string
  endedAt: string | null
  durationMs: number | null
  /** Server-computed score between 0 and 1, null until the session ends. */
  score: number | null
};

export type CatalogFilters = {
  pathology: CasePathology | null
  difficulty: CaseDifficulty | null
};

export const NO_CATALOG_FILTERS: CatalogFilters = { pathology: null, difficulty: null };

export type ListPagination = { page: number, pages: number, limit: number, total: number };

export type CatalogQuery = {
  page: number
  limit: number
  pathology?: CasePathology
  difficulty?: CaseDifficulty
};

/** Server-side filters: a null filter is omitted from the query. */
export function buildCatalogQuery(filters: CatalogFilters, page: number, limit: number): CatalogQuery {
  return {
    page,
    limit,
    ...(filters.pathology === null ? {} : { pathology: filters.pathology }),
    ...(filters.difficulty === null ? {} : { difficulty: filters.difficulty }),
  };
}

export function hasCatalogFilters(filters: CatalogFilters): boolean {
  return filters.pathology !== null || filters.difficulty !== null;
}

export function sessionDurationMs(startedAt: string, endedAt: string | null): number | null {
  if (endedAt === null) {
    return null;
  }

  const duration = Date.parse(endedAt) - Date.parse(startedAt);

  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

function labelOf(labels: Readonly<Record<string, string>>, value: string): string {
  return labels[value.toUpperCase()] ?? value;
}

export const pathologyLabel = (value: string): string => labelOf(PATHOLOGY_LABELS, value);
export const difficultyLabel = (value: string): string => labelOf(DIFFICULTY_LABELS, value);
export const sessionStatusLabel = (value: string): string => labelOf(SESSION_STATUS_LABELS, value);
export const simulationModeLabel = (value: string): string => labelOf(SIMULATION_MODE_LABELS, value);

const MISSING = "—";

/** 45 s · 2 min 05 s · 1 h 02 min. */
export function formatSessionDuration(ms: number | null): string {
  if (ms === null) {
    return MISSING;
  }

  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  }

  return minutes > 0 ? `${minutes} min ${String(seconds).padStart(2, "0")} s` : `${seconds} s`;
}

const scoreFormatter = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 0 });

/** A 0–1 score as a percentage ("82 %"). */
export function formatScore(score: number | null): string {
  return score === null ? MISSING : scoreFormatter.format(score);
}

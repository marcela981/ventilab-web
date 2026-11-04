/*
* Funcionalidad: AI analytics rules
* Descripción: Pure rules of /admin/ai: the filters kept in the URL (Bogota calendar days from/to, use case, provider, model, prompt version, rated output type, surface and scope; unknown enum values are dropped), their URL writer, the API queries of the telemetry stats (`/api/admin/ai-telemetry/stats`: range, use case, provider, model) and of the rating stats and CSV (`/api/admin/ai-ratings/stats` and `export.csv`: the same plus prompt version, target type, surface and scope), the Spanish labels of the use cases, target types, surfaces, scopes and QUEST dimensions, and the label of one rating group. The AiRatingGroup read model keeps the API values as they are. No statistic is computed here. Depends on the admin console date range entity and the admin console DTOs. v1.1 (B4, DISENO_BLOQUE4 §2.7): the enum lists (use cases with MODULE_QA, target types, surfaces with EVALUATION_FEEDBACK and SIMULATOR_ASSIST, scopes) are the keys of label records typed against the generated contract, so a new value in the API fails the type check until it gets its label; the surface and scope filters and the group surface and scope ("unknown" for ratings the server cannot place).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AiRatingScopeDTO, AiRatingSurfaceDTO, AiRatingTargetTypeDTO, AiUseCaseDTO } from "../../api/dtos/admin-console.dto";
import { readDay } from "./date-range.entity";
import type { IsoRange } from "./date-range.entity";

export type AiUseCase = AiUseCaseDTO;
export type AiRatingTargetType = AiRatingTargetTypeDTO;
export type AiRatingSurface = AiRatingSurfaceDTO;
export type AiRatingScope = AiRatingScopeDTO;

export const QUEST_DIMENSIONS = ["quality", "understanding", "trust", "expression", "safety"] as const;
export type QuestDimension = (typeof QUEST_DIMENSIONS)[number];

/** Value the stats use for a group the server cannot place (no linked call, no surface or no scope). */
export const AI_UNKNOWN_VALUE = "unknown";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AI_UNKNOWN_LABEL = "Sin dato";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AI_USE_CASE_LABELS: Readonly<Record<AiUseCase, string>> = {
  GRADE_FEEDBACK: "Retroalimentación de calificaciones",
  NOTES_ANALYSIS: "Análisis de notas",
  PAGE_DEEPEN: "Profundizar página",
  LESSON_QA: "Preguntas de lección",
  MODULE_QA: "Preguntas de módulo",
  FREE_CHAT: "Chat libre",
  TOPIC_CHECK: "Verificación de tema",
  SIM_ASSIST: "Asistencia en simulación",
};

export const AI_TARGET_TYPE_LABELS: Readonly<Record<AiRatingTargetType, string>> = {
  GRADE_FEEDBACK: "Retroalimentación de calificación",
  MESSAGE: "Mensaje del asistente",
  NOTES_ANALYSIS: "Análisis de notas",
  SIM_ASSIST: "Asistencia en simulación",
};

export const AI_SURFACE_LABELS: Readonly<Record<AiRatingSurface, string>> = {
  POPUP: "Ventana de preguntas (TutorAI)",
  ACCORDION: "Profundizar página",
  ASSISTANT: "Asistente",
  NOTES_ANALYSIS: "Análisis de notas",
  EVALUATION_FEEDBACK: "Retroalimentación de evaluaciones",
  SIMULATOR_ASSIST: "Asistente del simulador",
};

export const AI_SCOPE_LABELS: Readonly<Record<AiRatingScope, string>> = {
  LESSON: "Lección",
  MODULE: "Módulo",
  PAGE: "Página",
  FREE: "Libre",
};

function keysOf<T extends string>(labels: Readonly<Record<T, string>>): readonly T[] {
  return Object.keys(labels) as T[];
}

export const AI_USE_CASES = keysOf(AI_USE_CASE_LABELS);
export const AI_RATING_TARGET_TYPES = keysOf(AI_TARGET_TYPE_LABELS);
export const AI_SURFACES = keysOf(AI_SURFACE_LABELS);
export const AI_SCOPES = keysOf(AI_SCOPE_LABELS);

export const QUEST_DIMENSION_LABELS: Record<QuestDimension, string> = {
  quality: "Calidad",
  understanding: "Comprensión",
  trust: "Confianza",
  expression: "Expresión",
  safety: "Seguridad",
};

export type AiDimensionStats = {
  mean?: number
  n: number
};

export type AiRatingGroup = {
  surface: string
  scope: string
  useCase: string
  provider: string
  model: string
  promptVersion: string
  ratings: number
  helpfulCount: number
  helpfulRate: number
  dimensions: Record<QuestDimension, AiDimensionStats>
};

export type AiFilters = {
  fromDay: string
  toDay: string
  useCase: AiUseCase | ""
  provider: string
  model: string
  promptVersion: string
  targetType: AiRatingTargetType | ""
  surface: AiRatingSurface | ""
  scope: AiRatingScope | ""
};

export const NO_AI_FILTERS: AiFilters = {
  fromDay: "",
  toDay: "",
  useCase: "",
  provider: "",
  model: "",
  promptVersion: "",
  targetType: "",
  surface: "",
  scope: "",
};

type UrlQuery = Record<string, string | string[] | undefined>;

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

export function readAiFilters(query: UrlQuery): AiFilters {
  return {
    fromDay: readDay(query.from),
    toDay: readDay(query.to),
    useCase: readEnum(query.useCase, AI_USE_CASES),
    provider: readText(query.provider),
    model: readText(query.model),
    promptVersion: readText(query.promptVersion),
    targetType: readEnum(query.targetType, AI_RATING_TARGET_TYPES),
    surface: readEnum(query.surface, AI_SURFACES),
    scope: readEnum(query.scope, AI_SCOPES),
  };
}

export function toAiFiltersQuery(filters: AiFilters): Record<string, string> {
  const query: Record<string, string> = {};

  if (filters.fromDay) query.from = filters.fromDay;
  if (filters.toDay) query.to = filters.toDay;
  if (filters.useCase) query.useCase = filters.useCase;
  if (filters.provider) query.provider = filters.provider;
  if (filters.model) query.model = filters.model;
  if (filters.promptVersion) query.promptVersion = filters.promptVersion;
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.surface) query.surface = filters.surface;
  if (filters.scope) query.scope = filters.scope;

  return query;
}

export type AiTelemetryApiQuery = {
  from?: string
  to?: string
  useCase?: AiUseCase
  provider?: string
  model?: string
};

export type AiRatingsApiQuery = AiTelemetryApiQuery & {
  promptVersion?: string
  targetType?: AiRatingTargetType
  surface?: AiRatingSurface
  scope?: AiRatingScope
};

export function toAiTelemetryQuery(filters: AiFilters, range: IsoRange): AiTelemetryApiQuery {
  const query: AiTelemetryApiQuery = {};

  if (range.from) query.from = range.from;
  if (range.to) query.to = range.to;
  if (filters.useCase) query.useCase = filters.useCase;
  if (filters.provider) query.provider = filters.provider;
  if (filters.model) query.model = filters.model;

  return query;
}

/** Query of the rating stats and of the ratings CSV: the telemetry filters plus the rating-only ones. */
export function toAiRatingsQuery(filters: AiFilters, range: IsoRange): AiRatingsApiQuery {
  const query: AiRatingsApiQuery = toAiTelemetryQuery(filters, range);

  if (filters.promptVersion) query.promptVersion = filters.promptVersion;
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.surface) query.surface = filters.surface;
  if (filters.scope) query.scope = filters.scope;

  return query;
}

function labelOf(labels: Readonly<Record<string, string>>, value: string): string {
  if (value === AI_UNKNOWN_VALUE) {
    return AI_UNKNOWN_LABEL;
  }

  return labels[value] ?? value;
}

export function aiUseCaseLabel(useCase: string): string {
  return labelOf(AI_USE_CASE_LABELS, useCase);
}

export function aiSurfaceLabel(surface: string): string {
  return labelOf(AI_SURFACE_LABELS, surface);
}

export function aiScopeLabel(scope: string): string {
  return labelOf(AI_SCOPE_LABELS, scope);
}

/** Stable key of one rating group: every field the server groups by. */
export function ratingGroupKey(group: AiRatingGroup): string {
  return [group.surface, group.scope, group.useCase, group.provider, group.model, group.promptVersion].join("|");
}

/** Short label of one rating group for tables and the chart axis. */
export function ratingGroupLabel(group: AiRatingGroup): string {
  return `${aiSurfaceLabel(group.surface)} · ${aiScopeLabel(group.scope)} · ${aiUseCaseLabel(group.useCase)} · ${group.provider} · ${group.model} · v${group.promptVersion}`;
}

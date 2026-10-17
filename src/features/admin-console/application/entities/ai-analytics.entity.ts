/*
* Funcionalidad: AI analytics rules
* Descripción: Pure rules of /admin/ai: the filters kept in the URL (Bogota calendar days from/to, use case, provider, model, prompt version and rated output type; unknown enum values are dropped), their URL writer, the API queries of the telemetry stats (`/api/admin/ai-telemetry/stats`: range, use case, provider, model) and of the rating stats (`/api/admin/ai-ratings/stats`: the same plus prompt version and target type), the Spanish labels of the use cases, target types and QUEST dimensions, and the label of one rating group. The AiRatingGroup read model keeps the API values as they are. No statistic is computed here. Depends on the admin console date range entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readDay } from "./date-range.entity";
import type { IsoRange } from "./date-range.entity";

export const AI_USE_CASES = ["GRADE_FEEDBACK", "NOTES_ANALYSIS", "PAGE_DEEPEN", "LESSON_QA", "FREE_CHAT", "TOPIC_CHECK", "SIM_ASSIST"] as const;
export type AiUseCase = (typeof AI_USE_CASES)[number];

export const AI_RATING_TARGET_TYPES = ["GRADE_FEEDBACK", "MESSAGE", "NOTES_ANALYSIS", "SIM_ASSIST"] as const;
export type AiRatingTargetType = (typeof AI_RATING_TARGET_TYPES)[number];

export const QUEST_DIMENSIONS = ["quality", "understanding", "trust", "expression", "safety"] as const;
export type QuestDimension = (typeof QUEST_DIMENSIONS)[number];

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AI_USE_CASE_LABELS: Record<AiUseCase, string> = {
  GRADE_FEEDBACK: "Retroalimentación de calificaciones",
  NOTES_ANALYSIS: "Análisis de notas",
  PAGE_DEEPEN: "Profundizar página",
  LESSON_QA: "Preguntas de lección",
  FREE_CHAT: "Chat libre",
  TOPIC_CHECK: "Verificación de tema",
  SIM_ASSIST: "Asistencia en simulación",
};

export const AI_TARGET_TYPE_LABELS: Record<AiRatingTargetType, string> = {
  GRADE_FEEDBACK: "Retroalimentación de calificación",
  MESSAGE: "Mensaje del asistente",
  NOTES_ANALYSIS: "Análisis de notas",
  SIM_ASSIST: "Asistencia en simulación",
};

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
};

export const NO_AI_FILTERS: AiFilters = { fromDay: "", toDay: "", useCase: "", provider: "", model: "", promptVersion: "", targetType: "" };

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

export function toAiRatingsQuery(filters: AiFilters, range: IsoRange): AiRatingsApiQuery {
  const query: AiRatingsApiQuery = toAiTelemetryQuery(filters, range);

  if (filters.promptVersion) query.promptVersion = filters.promptVersion;
  if (filters.targetType) query.targetType = filters.targetType;

  return query;
}

export function aiUseCaseLabel(useCase: string): string {
  return (AI_USE_CASE_LABELS as Record<string, string>)[useCase] ?? useCase;
}

/** Short label of one rating group for tables and the chart axis. */
export function ratingGroupLabel(group: AiRatingGroup): string {
  return `${aiUseCaseLabel(group.useCase)} · ${group.provider} · ${group.model} · v${group.promptVersion}`;
}

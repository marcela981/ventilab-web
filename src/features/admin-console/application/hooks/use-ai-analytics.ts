/*
* Funcionalidad: useAiTelemetryStats and useAiRatingStats
* Descripción: Read the AI telemetry stats (`GET /api/admin/ai-telemetry/stats`: totals and one entry per UTC day, ADMIN) and the AI rating stats (`GET /api/admin/ai-ratings/stats`: one group per use case, provider, model and prompt version) for the filters of /admin/ai. A null query (invalid dates) sends no request. Previous data is never kept, so a new range or filter shows the loading or error state instead of the previous result. Values are passed through unchanged. Depends on React, @shared/api-client and the admin console mapper, service and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import type { AiTelemetryStatsDTO } from "../../api/dtos/admin-console.dto";
import { toAiRatingGroup } from "../../api/mappers/admin-operations.mapper";
import { AI_RATINGS_STATS_PATH, AI_TELEMETRY_STATS_PATH } from "../../api/services/admin-operations.service";
import type { AiRatingGroup, AiRatingsApiQuery, AiTelemetryApiQuery } from "../entities/ai-analytics.entity";
import { NO_PREVIOUS_DATA } from "./use-audit-log";

export type StatsState<T> = {
  value: T | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export type AiRatingStats = {
  from: string
  to: string
  groups: AiRatingGroup[]
};

export function useAiTelemetryStats(query: AiTelemetryApiQuery | null): StatsState<AiTelemetryStatsDTO> {
  const { data, error, isLoading, mutate } = useApiQuery(query ? AI_TELEMETRY_STATS_PATH : null, { query: query ?? {} }, NO_PREVIOUS_DATA);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { value: data?.data ?? null, isLoading, error: error ?? null, reload };
}

export function useAiRatingStats(query: AiRatingsApiQuery | null): StatsState<AiRatingStats> {
  const { data, error, isLoading, mutate } = useApiQuery(query ? AI_RATINGS_STATS_PATH : null, { query: query ?? {} }, NO_PREVIOUS_DATA);
  const value = useMemo(
    () => (data ? { from: data.data.from, to: data.data.to, groups: data.data.groups.map(toAiRatingGroup) } : null),
    [data],
  );

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { value, isLoading, error: error ?? null, reload };
}

/*
* Funcionalidad: Gamification hooks
* Descripción: useGamification (`GET /api/progress/gamification`) and useRecentActivity (`GET /api/progress/activity/recent?limit`) read the server-side gamification through useApiQuery with the learning cache config and map it to the gamification entities. An `enabled` flag (default true) lets the /learn workspace start them together with a panel chunk; false disables the query. None of them waits for another query. Depends on React, @shared/api-client and the gamification mapper and service.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toGamificationStats, toRecentActivity } from "../../api/mappers/gamification.mapper";
import { GAMIFICATION_PATH, RECENT_ACTIVITY_PATH } from "../../api/services/gamification.service";
import type { GamificationStats, RecentActivity } from "../entities/gamification.entity";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";

export type GamificationQueryResult<T> = {
  data: T | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

// Inicio lists at most this many merged items; the ledger sends the newest ones.
export const RECENT_ACTIVITY_LIMIT = 10;

export function useGamification(enabled = true): GamificationQueryResult<GamificationStats> {
  const { data, error, isLoading, mutate } = useApiQuery(enabled ? GAMIFICATION_PATH : null, undefined, LEARNING_QUERY_CONFIG);
  const stats = useMemo(() => (data ? toGamificationStats(data.data) : null), [data]);
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { data: stats, isLoading, error: error ?? null, reload };
}

export function useRecentActivity(enabled = true): GamificationQueryResult<RecentActivity[]> {
  const { data, error, isLoading, mutate } = useApiQuery(
    enabled ? RECENT_ACTIVITY_PATH : null,
    { query: { limit: RECENT_ACTIVITY_LIMIT } },
    LEARNING_QUERY_CONFIG,
  );
  const items = useMemo(() => (data ? toRecentActivity(data.data) : null), [data]);
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { data: items, isLoading, error: error ?? null, reload };
}

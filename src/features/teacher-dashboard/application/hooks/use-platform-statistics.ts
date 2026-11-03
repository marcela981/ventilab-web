/*
* Funcionalidad: usePlatformStatistics
* Descripción: The statistic cards of the General tab of /teacher, read from `GET /api/admin/statistics` (TEACHER, ADMIN) and mapped by toPlatformStatCards (cards without a real value are dropped). Returns null cards while loading or after an error. Depends on React, @shared/api-client, the teacher general service and mapper.
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
import { toPlatformStatCards } from "../../api/mappers/teacher-general.mapper";
import { PLATFORM_STATISTICS_PATH } from "../../api/services/teacher-general.service";
import type { PlatformStatCard } from "../entities/teacher-general.entity";

export type UsePlatformStatisticsResult = {
  cards: PlatformStatCard[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function usePlatformStatistics(): UsePlatformStatisticsResult {
  const { data, error, isLoading, mutate } = useApiQuery(PLATFORM_STATISTICS_PATH);
  const cards = useMemo(() => (data ? toPlatformStatCards(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { cards, isLoading, error: error ?? null, reload };
}

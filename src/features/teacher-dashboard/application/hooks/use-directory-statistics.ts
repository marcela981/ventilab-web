/*
* Funcionalidad: useDirectoryStatistics
* Descripción: Reads `GET /api/admin/statistics` through useApiQuery and maps it to the four global cards of the directory "Estadísticas" tab (active students in 30 days, published modules, published lessons, lessons completed today in Bogotá); a statistic without a number is left out. Minimal on purpose: the General tab of /teacher reads the same endpoint (SWR shares the cache). Depends on React, @shared/api-client and the students directory mapper and service.
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
import { toDirectoryStatistics } from "../../api/mappers/students-directory.mapper";
import { PLATFORM_STATISTICS_PATH } from "../../api/services/students-directory.service";
import type { DirectoryStatisticCard } from "../entities/students-directory.entity";

export type UseDirectoryStatisticsResult = {
  cards: DirectoryStatisticCard[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useDirectoryStatistics(): UseDirectoryStatisticsResult {
  const { data, error, isLoading, mutate } = useApiQuery(PLATFORM_STATISTICS_PATH);
  const cards = useMemo(() => (data ? toDirectoryStatistics(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { cards, isLoading, error: error ?? null, reload };
}

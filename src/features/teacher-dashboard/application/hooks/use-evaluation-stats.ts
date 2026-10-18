/*
* Funcionalidad: useEvaluationStats
* Descripción: Reads the statistics of one evaluation for the selected group (`GET /api/analytics/evaluations/{evaluationId}/stats?groupId`: grade histogram bucketed by the API over the attempts of that group's assignments, passingGrade) through useApiQuery for the grade distribution chart of /teacher. A null evaluation or group sends no request. Depends on React, @shared/api-client and the teacher dashboard mapper and service. v1.1 (closure B2): the stats are filtered by the selected group on the server (the every-group scope is gone) and keepPreviousData is off, so another group's histogram is never shown.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toEvaluationStats } from "../../api/mappers/teacher-dashboard.mapper";
import { EVALUATION_STATS_PATH } from "../../api/services/teacher-dashboard.service";
import type { EvaluationStats } from "../entities/teacher-dashboard.entity";

export type UseEvaluationStatsResult = {
  stats: EvaluationStats | null
  isLoading: boolean
  error: ApiError | null
};

const NO_PREVIOUS_DATA = { keepPreviousData: false } as const;

export function useEvaluationStats(evaluationId: string | null, groupId: string | null): UseEvaluationStatsResult {
  const { data, error, isLoading } = useApiQuery(
    evaluationId && groupId ? EVALUATION_STATS_PATH : null,
    { params: { evaluationId: evaluationId ?? "" }, query: { groupId: groupId ?? "" } },
    NO_PREVIOUS_DATA,
  );
  const stats = useMemo(() => (data ? toEvaluationStats(data.data) : null), [data]);

  return { stats, isLoading, error: error ?? null };
}

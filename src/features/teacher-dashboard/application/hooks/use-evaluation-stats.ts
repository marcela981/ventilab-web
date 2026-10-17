/*
* Funcionalidad: useEvaluationStats
* Descripción: Reads the statistics of one evaluation (`GET /api/analytics/evaluations/{evaluationId}/stats`: grade histogram bucketed by the API, passingGrade) through useApiQuery for the grade distribution chart of /teacher. A null evaluation sends no request. The backend computes them over every group of the caller in scope (admins: all), not only the selected group (BACKEND GAP: no groupId filter). Depends on React, @shared/api-client and the teacher dashboard mapper and service.
* Versión: 1.0
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

export function useEvaluationStats(evaluationId: string | null): UseEvaluationStatsResult {
  const { data, error, isLoading } = useApiQuery(
    evaluationId ? EVALUATION_STATS_PATH : null,
    { params: { evaluationId: evaluationId ?? "" } },
  );
  const stats = useMemo(() => (data ? toEvaluationStats(data.data) : null), [data]);

  return { stats, isLoading, error: error ?? null };
}

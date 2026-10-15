/*
* Funcionalidad: Evaluation results hooks
* Descripción: Reads of the staff results page /grading/evaluations/[evaluationId] through useApiQuery, mapped inside useMemo: useEvaluationStats (`GET /api/analytics/evaluations/{evaluationId}/stats`, server-computed statistics, cached 60 s by the backend), useEvaluationAssignments (`GET /api/evaluation-assignments?evaluationId&limit=100`, groups with state and attempt counts) and useGroupStudentResults (`GET /api/analytics/groups/{groupId}/dashboard`, only while a group is chosen, filtered to the published grades of this evaluation). Each returns {data, isLoading, error, reload}. Depends on React, @shared/api-client and the grading mappers, service and entities.
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
import { toEvaluationAssignment, toEvaluationStats, toStudentResults } from "../../api/mappers/evaluation-results.mapper";
import { EVALUATION_ASSIGNMENTS_PATH, EVALUATION_STATS_PATH, GROUP_DASHBOARD_PATH } from "../../api/services/grading.service";
import type { EvaluationAssignment, EvaluationStats, StudentResult } from "../entities/evaluation-results.entity";

export type QueryResult<T> = {
  data: T | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const RESULTS_QUERY_CONFIG = { revalidateOnFocus: false } as const;
// The backend caps a page at 100 assignments; an evaluation is assigned to far fewer groups.
const ASSIGNMENTS_LIMIT = 100;

export function useEvaluationStats(evaluationId: string): QueryResult<EvaluationStats> {
  const { data, error, isLoading, mutate } = useApiQuery(EVALUATION_STATS_PATH, { params: { evaluationId } }, RESULTS_QUERY_CONFIG);
  const stats = useMemo(() => (data ? toEvaluationStats(data.data) : null), [data]);
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { data: stats, isLoading, error: error ?? null, reload };
}

export function useEvaluationAssignments(evaluationId: string): QueryResult<EvaluationAssignment[]> {
  const { data, error, isLoading, mutate } = useApiQuery(
    EVALUATION_ASSIGNMENTS_PATH,
    { query: { evaluationId, limit: ASSIGNMENTS_LIMIT } },
    RESULTS_QUERY_CONFIG,
  );
  const assignments = useMemo(() => (data ? data.data.map(toEvaluationAssignment) : null), [data]);
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { data: assignments, isLoading, error: error ?? null, reload };
}

export function useGroupStudentResults(groupId: string | null, evaluationId: string): QueryResult<StudentResult[]> {
  const { data, error, isLoading, mutate } = useApiQuery(
    groupId === null ? null : GROUP_DASHBOARD_PATH,
    { params: { groupId: groupId ?? "" } },
    RESULTS_QUERY_CONFIG,
  );
  const results = useMemo(() => (data ? toStudentResults(data.data, evaluationId) : null), [data, evaluationId]);
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { data: results, isLoading, error: error ?? null, reload };
}

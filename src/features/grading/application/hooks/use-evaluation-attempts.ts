/*
* Funcionalidad: useEvaluationAttempts
* Descripción: Reads one page of the attempts of an evaluation for the unified grading screen (`GET /api/evaluation-grading/attempts` with evaluationId, groupId, status, page and limit) through useApiQuery and maps it to an EvaluationAttemptsPage (rows plus the counts per status of the whole evaluation). The previous page stays on screen while the next one loads and the list revalidates on focus (other teachers may grade the same attempts). The key joins GRADING_QUERY_PATHS, so grading, publishing and resetting refresh it. Depends on React, @shared/api-client and the grading mappers, service and entities.
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
import { toEvaluationAttemptsPage } from "../../api/mappers/evaluation-attempts.mapper";
import { GRADING_ATTEMPTS_PATH } from "../../api/services/grading.service";
import type { EvaluationAttemptsPage, EvaluationAttemptsQuery } from "../entities/evaluation-attempts.entity";

export type UseEvaluationAttemptsResult = {
  page: EvaluationAttemptsPage | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const ATTEMPTS_QUERY_CONFIG = { keepPreviousData: true, revalidateOnFocus: true } as const;

export function useEvaluationAttempts(query: EvaluationAttemptsQuery): UseEvaluationAttemptsResult {
  const { data, error, isLoading, mutate } = useApiQuery(GRADING_ATTEMPTS_PATH, { query }, ATTEMPTS_QUERY_CONFIG);
  const page = useMemo(() => (data ? toEvaluationAttemptsPage(data.data, data.pagination) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { page, isLoading, error: error ?? null, reload };
}

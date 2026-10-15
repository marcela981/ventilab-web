/*
* Funcionalidad: useGradingAttempt
* Descripción: Reads one attempt for grading (`GET /api/evaluation-grading/attempts/{attemptId}`: questions with correct options, explanations and rubrics, answers with automatic, manual and earned scores, the server-computed practical score of SIMULATION answers, status, grade, passingGrade and publication) through useApiQuery and maps it to a GradingAttempt. A null id sends no request. It does not revalidate on focus, so the drafts of a teacher are not reset under them; grading mutations refresh it through GRADING_QUERY_PATHS. Depends on React, @shared/api-client and the grading mappers, service and entities. v1.1 (G2 review S3): refetch reads the attempt again and reports whether it succeeded (an SWR revalidation never rejects), so the page can tell a stale screen after a save.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { apiGet } from "@shared/api-client/api-request";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toGradingAttempt } from "../../api/mappers/grading-attempt.mapper";
import { GRADING_ATTEMPT_PATH } from "../../api/services/grading.service";
import type { GradingAttempt } from "../entities/grading-attempt.entity";

export type UseGradingAttemptResult = {
  attempt: GradingAttempt | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
  // Fresh read of the attempt into the cache; false when it failed (the cached attempt stays).
  refetch: () => Promise<boolean>
};

const ATTEMPT_QUERY_CONFIG = { revalidateOnFocus: false } as const;

export function useGradingAttempt(attemptId: string | null): UseGradingAttemptResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    attemptId === null ? null : GRADING_ATTEMPT_PATH,
    { params: { attemptId: attemptId ?? "" } },
    ATTEMPT_QUERY_CONFIG,
  );
  const attempt = useMemo(() => (data ? toGradingAttempt(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  const refetch = useCallback(async() => {
    if (attemptId === null) {
      return false;
    }

    try {
      await mutate(apiGet(GRADING_ATTEMPT_PATH, { params: { attemptId } }), { revalidate: false });

      return true;
    } catch {
      return false;
    }
  }, [attemptId, mutate]);

  return { attempt, isLoading, error: error ?? null, reload, refetch };
}

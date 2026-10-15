/*
* Funcionalidad: useSubmitAttempt
* Descripción: Submits one attempt (`POST /api/evaluation-attempts/{attemptId}/submit`, idempotent on the backend). Single-flight: a second call while one is pending returns "busy" without a request. After a success it revalidates the evaluation SWR keys (attempt status, attempts and grades change); a failure returns the ApiError so the player can tell a closed attempt (409) from a retryable error. Depends on SWR, @shared/api-client and the evaluations service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import type { ApiError } from "@shared/api-client/api-error";
import { toApiError } from "@shared/api-client/api-error";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { EVALUATION_QUERY_PATHS, submitAttempt } from "../../api/services/evaluations.service";

export type SubmitAttemptOutcome =
  | { status: "success" }
  | { status: "error", error: ApiError }
  | { status: "busy" };

export type UseSubmitAttemptResult = {
  pending: boolean
  submit: (attemptId: string) => Promise<SubmitAttemptOutcome>
};

export function useSubmitAttempt(): UseSubmitAttemptResult {
  const { mutate } = useSWRConfig();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const submit = useCallback(async(attemptId: string): Promise<SubmitAttemptOutcome> => {
    if (pendingRef.current) {
      return { status: "busy" };
    }

    pendingRef.current = true;
    setPending(true);

    try {
      await submitAttempt(attemptId);
      // The attempt is submitted; a failed refresh only leaves stale data on screen.
      await invalidateApiQueries(mutate, EVALUATION_QUERY_PATHS).catch(() => undefined);

      return { status: "success" };
    } catch (caught) {
      return { status: "error", error: toApiError(caught) };
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [mutate]);

  return { pending, submit };
}

/*
* Funcionalidad: useStartAttempt
* Descripción: Starts or resumes the attempt of one assignment (`POST /api/my-evaluations/{assignmentId}/attempts`, idempotent: it returns the attempt already in progress). Single-flight: a second call while one is pending returns "busy". After a success it revalidates the evaluation SWR keys (attempts and canStart change); a failure becomes the Spanish message of getEvaluationErrorMessage. Depends on SWR, @shared/api-client, the evaluations service and error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { EVALUATION_QUERY_PATHS, startAttempt } from "../../api/services/evaluations.service";
import type { AttemptStart } from "../entities/evaluation.entity";
import { getEvaluationErrorMessage } from "../entities/evaluations-error-messages";

export type StartAttemptOutcome =
  | { status: "success", value: AttemptStart }
  | { status: "error", message: string }
  | { status: "busy" };

export type UseStartAttemptResult = {
  pending: boolean
  start: (assignmentId: string) => Promise<StartAttemptOutcome>
};

export function useStartAttempt(): UseStartAttemptResult {
  const { mutate } = useSWRConfig();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const start = useCallback(async(assignmentId: string): Promise<StartAttemptOutcome> => {
    if (pendingRef.current) {
      return { status: "busy" };
    }

    pendingRef.current = true;
    setPending(true);

    try {
      const value = await startAttempt(assignmentId);

      // The attempt exists; a failed refresh only leaves stale data on screen.
      await invalidateApiQueries(mutate, EVALUATION_QUERY_PATHS).catch(() => undefined);

      return { status: "success", value };
    } catch (caught) {
      return { status: "error", message: getEvaluationErrorMessage(caught) };
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [mutate]);

  return { pending, start };
}

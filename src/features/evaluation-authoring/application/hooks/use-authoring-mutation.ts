/*
* Funcionalidad: useAuthoringMutation
* Descripción: Runs one evaluation authoring mutation at a time (duplicate, archive and the later builder actions): ignores a second call while one is pending ("busy"), invalidates every authoring SWR key after a success (EVALUATION_AUTHORING_QUERY_PATHS: list, detail, activations) and turns a failure into the Spanish message of getAuthoringErrorMessage (backend codes such as invalid_status_transition, then status fallbacks). Depends on SWR, @shared/api-client, the authoring service and error messages. v1.1 (A2): a failure also carries the backend error code and HTTP status, so the builder can react to 409 evaluation.has_submitted_attempts and 422. v1.2 (A4): an optional message function replaces getAuthoringErrorMessage (the activations page passes getAssignmentErrorMessage).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { toApiError } from "@shared/api-client/api-error";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { EVALUATION_AUTHORING_QUERY_PATHS } from "../../api/services/evaluation-authoring.service";
import { getAuthoringErrorMessage } from "../entities/evaluation-authoring-error-messages";

export type AuthoringMutationOutcome<T> =
  | { status: "success", value: T }
  | { status: "error", message: string, code: string, httpStatus: number }
  | { status: "busy" };

export type UseAuthoringMutationResult = {
  pending: boolean
  run: <T>(action: () => Promise<T>) => Promise<AuthoringMutationOutcome<T>>
};

export function useAuthoringMutation(toMessage: (error: unknown) => string = getAuthoringErrorMessage): UseAuthoringMutationResult {
  const { mutate } = useSWRConfig();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async<T>(action: () => Promise<T>): Promise<AuthoringMutationOutcome<T>> => {
    if (pendingRef.current) {
      return { status: "busy" };
    }

    pendingRef.current = true;
    setPending(true);

    try {
      const value = await action();

      // The change is saved; a failed refresh only leaves stale data on screen.
      await invalidateApiQueries(mutate, EVALUATION_AUTHORING_QUERY_PATHS).catch(() => undefined);

      return { status: "success", value };
    } catch (caught) {
      const apiError = toApiError(caught);

      return { status: "error", message: toMessage(apiError), code: apiError.code, httpStatus: apiError.status };
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [mutate, toMessage]);

  return { pending, run };
}

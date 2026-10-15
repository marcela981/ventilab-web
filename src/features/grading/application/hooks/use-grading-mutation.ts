/*
* Funcionalidad: useGradingMutation
* Descripción: Runs one grading mutation at a time (publish an attempt, regenerate its AI feedback): a second call while one is pending returns "busy"; after a success it refreshes every grading SWR key (GRADING_QUERY_PATHS: queue and pending badge, attempt, feedback, evaluation stats); a failure becomes the Spanish message of getGradingErrorMessage plus the backend code and HTTP status. Depends on React, SWR, @shared/api-client and the grading service and error messages. v1.1 (G2 review S3): refresh reports whether the revalidation succeeded instead of swallowing the failure.
* Versión: 1.1
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
import { GRADING_QUERY_PATHS } from "../../api/services/grading.service";
import { getGradingErrorMessage } from "../entities/grading-error-messages";

export type GradingMutationOutcome<T> =
  | { status: "success", value: T }
  | { status: "error", message: string, code: string, httpStatus: number }
  | { status: "busy" };

export type UseGradingMutationResult = {
  pending: boolean
  run: <T>(action: () => Promise<T>) => Promise<GradingMutationOutcome<T>>
  // false when the revalidation failed; the screen may show stale data.
  refresh: () => Promise<boolean>
};

export function useGradingMutation(): UseGradingMutationResult {
  const { mutate } = useSWRConfig();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(
    () => invalidateApiQueries(mutate, GRADING_QUERY_PATHS).then(() => true, () => false),
    [mutate],
  );

  const run = useCallback(async<T>(action: () => Promise<T>): Promise<GradingMutationOutcome<T>> => {
    if (pendingRef.current) {
      return { status: "busy" };
    }

    pendingRef.current = true;
    setPending(true);

    try {
      const value = await action();

      await refresh();

      return { status: "success", value };
    } catch (caught) {
      const apiError = toApiError(caught);

      return { status: "error", message: getGradingErrorMessage(apiError), code: apiError.code, httpStatus: apiError.status };
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [refresh]);

  return { pending, run, refresh };
}

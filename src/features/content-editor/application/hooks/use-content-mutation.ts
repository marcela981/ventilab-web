/*
* Funcionalidad: useContentMutation
* Descripción: Runs one content mutation at a time (create, edit, status, delete, archive): ignores a second call while one is pending, revalidates every content editor read after a success (CONTENT_QUERY_PATHS: sections, levels, teaching tree, lesson pages) and turns a failure into the Spanish message of getContentErrorMessage, keeping the ApiError so the delete flow can detect the student-data 409. Depends on SWR, @shared/api-client, the content editor service and error messages.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { toApiError } from "@shared/api-client/api-error";
import type { ApiError } from "@shared/api-client/api-error";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { CONTENT_QUERY_PATHS } from "../../api/services/content-editor.service";
import { getContentErrorMessage } from "../entities/content-editor-error-messages";

export type ContentMutationOutcome =
  | { status: "success" }
  | { status: "error", message: string, error: ApiError }
  | { status: "busy" };

export type UseContentMutationResult = {
  pending: boolean
  run: (action: () => Promise<void>) => Promise<ContentMutationOutcome>
};

export function useContentMutation(): UseContentMutationResult {
  const { mutate } = useSWRConfig();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async(action: () => Promise<void>): Promise<ContentMutationOutcome> => {
    if (pendingRef.current) {
      return { status: "busy" };
    }

    pendingRef.current = true;
    setPending(true);

    try {
      await action();
      // The change is saved; a failed refresh only leaves stale data on screen.
      await invalidateApiQueries(mutate, CONTENT_QUERY_PATHS).catch(() => undefined);

      return { status: "success" };
    } catch (caught) {
      const error = toApiError(caught);

      return { status: "error", message: getContentErrorMessage(error), error };
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [mutate]);

  return { pending, run };
}

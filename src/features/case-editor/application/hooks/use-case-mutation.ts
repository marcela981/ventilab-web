/*
* Funcionalidad: useCaseMutation
* Descripción: Single-flight runner of the case editor writes (create, replace, duplicate, status change): a second
*   call while one is pending answers `busy`; on success every case read key (list, detail, definition) is
*   revalidated; a failure keeps the raw error (the editor maps 422/400 to fields) and its Spanish message. Depends
*   on React, swr, the api-client and the case editor service and error messages.
*   v1.1 (review of ffe9297): `run(action, invalidates)` can narrow the refreshed paths (a delete refreshes only the
*   list, so the editor never re-reads the definition of a case that no longer exists: no 404 GET, no not-found flash).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { CASE_EDITOR_QUERY_PATHS } from "../../api/services/case-editor.service";
import { getCaseEditorErrorMessage } from "../entities/case-editor-errors";

export type CaseMutationOutcome<T> =
  | { status: "success", value: T }
  | { status: "error", message: string, error: unknown }
  | { status: "busy" };

export type CaseQueryPath = (typeof CASE_EDITOR_QUERY_PATHS)[number];

export type UseCaseMutationResult = {
  pending: boolean
  /** `invalidates`: the read paths refreshed after a success (default: list, detail and definition). */
  run: <T>(action: () => Promise<T>, invalidates?: readonly CaseQueryPath[]) => Promise<CaseMutationOutcome<T>>
};

export function useCaseMutation(): UseCaseMutationResult {
  const { mutate } = useSWRConfig();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async<T>(
    action: () => Promise<T>,
    invalidates: readonly CaseQueryPath[] = CASE_EDITOR_QUERY_PATHS,
  ): Promise<CaseMutationOutcome<T>> => {
    if (pendingRef.current) {
      return { status: "busy" };
    }

    pendingRef.current = true;
    setPending(true);

    try {
      const value = await action();

      // Saved; a failed refresh only leaves stale data on screen.
      await invalidateApiQueries(mutate, invalidates).catch(() => undefined);

      return { status: "success", value };
    } catch (error) {
      return { status: "error", message: getCaseEditorErrorMessage(error), error };
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [mutate]);

  return { pending, run };
}

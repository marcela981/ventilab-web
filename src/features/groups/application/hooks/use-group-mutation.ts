/*
* Funcionalidad: useGroupMutation
* Descripción: Runs one group mutation at a time (create, update, deactivate, members, leader): ignores a second call while one is pending, invalidates every groups SWR key after a success (GROUP_QUERY_PATHS: list, mine, detail, members, supervisions) and turns a failure into the Spanish message of getGroupErrorMessage (specific groups codes such as group_full or management_forbidden, then status fallbacks). Depends on SWR, @shared/api-client, the groups service and error messages.
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
import { GROUP_QUERY_PATHS } from "../../api/services/groups.service";
import { getGroupErrorMessage } from "../entities/groups-error-messages";

export type MutationOutcome<T> =
  | { status: "success", value: T }
  | { status: "error", message: string }
  | { status: "busy" };

export type UseGroupMutationResult = {
  pending: boolean
  run: <T>(action: () => Promise<T>) => Promise<MutationOutcome<T>>
};

export function useGroupMutation(): UseGroupMutationResult {
  const { mutate } = useSWRConfig();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async<T>(action: () => Promise<T>): Promise<MutationOutcome<T>> => {
    if (pendingRef.current) {
      return { status: "busy" };
    }

    pendingRef.current = true;
    setPending(true);

    try {
      const value = await action();

      // The change is saved; a failed refresh only leaves stale data on screen.
      await invalidateApiQueries(mutate, GROUP_QUERY_PATHS).catch(() => undefined);

      return { status: "success", value };
    } catch (caught) {
      return { status: "error", message: getGroupErrorMessage(caught) };
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [mutate]);

  return { pending, run };
}

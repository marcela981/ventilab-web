/*
* Funcionalidad: useMyGroup
* Descripción: Reads the signed-in user's own groups (`GET /api/groups/mine`: the student's active student group with leader, members and supervising teacher groups, plus every membership) through useApiQuery (SWR cache of the typed api-client) and maps them to the MyGroups entity. Exposes the loading flag, the load error and `reload` (retry button). Depends on @shared/api-client and the groups mappers/service.
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
import { toMyGroups } from "../../api/mappers/groups.mapper";
import { MY_GROUPS_PATH } from "../../api/services/groups.service";
import type { MyGroups } from "../entities/group.entity";

export type UseMyGroupResult = {
  myGroups: MyGroups | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useMyGroup(): UseMyGroupResult {
  const { data, error, isLoading, mutate } = useApiQuery(MY_GROUPS_PATH);
  const myGroups = useMemo(() => (data ? toMyGroups(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { myGroups, isLoading, error: error ?? null, reload };
}

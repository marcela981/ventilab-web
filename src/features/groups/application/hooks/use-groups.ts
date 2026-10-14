/*
* Funcionalidad: useGroups
* Descripción: Reads the groups visible to the signed-in staff user (`GET /api/groups` without filters: every group for an admin; for a teacher the student groups they created or supervise and the teacher groups they belong to) through useApiQuery and maps them to Group entities. The endpoint has no pagination or text search, so the page filters and paginates this list on the client (decision 7). Depends on @shared/api-client and the groups mappers/service.
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
import { toGroup } from "../../api/mappers/groups.mapper";
import { GROUPS_PATH } from "../../api/services/groups.service";
import type { Group } from "../entities/group.entity";

export type UseGroupsResult = {
  groups: Group[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useGroups(): UseGroupsResult {
  const { data, error, isLoading, mutate } = useApiQuery(GROUPS_PATH);
  const groups = useMemo(() => (data ? data.data.map(toGroup) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { groups, isLoading, error: error ?? null, reload };
}

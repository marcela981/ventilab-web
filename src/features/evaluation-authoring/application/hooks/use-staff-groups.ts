/*
* Funcionalidad: useStaffGroups
* Descripción: Reads the student groups an evaluation can be activated for (`GET /api/groups?type=STUDENT&isActive=true`): the backend limits a teacher to the student groups they created or supervise and gives an admin every group. Maps them to sorted group choices. A false `enabled` (dialog closed) disables the request. Depends on React, @shared/api-client, the assignment mapper and the authoring service.
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
import { toGroupChoices } from "../../api/mappers/evaluation-assignment.mapper";
import { STAFF_GROUPS_PATH } from "../../api/services/evaluation-authoring.service";
import type { GroupChoice } from "../entities/evaluation-assignment.entity";

export type UseStaffGroupsResult = {
  groups: GroupChoice[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const GROUPS_QUERY = { type: "STUDENT", isActive: "true" } as const;

export function useStaffGroups(enabled: boolean): UseStaffGroupsResult {
  const { data, error, isLoading, mutate } = useApiQuery(enabled ? STAFF_GROUPS_PATH : null, { query: GROUPS_QUERY });
  const groups = useMemo(() => (data ? toGroupChoices(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { groups, isLoading, error: error ?? null, reload };
}

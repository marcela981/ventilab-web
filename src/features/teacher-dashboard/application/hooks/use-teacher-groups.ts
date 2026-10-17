/*
* Funcionalidad: useTeacherGroups
* Descripción: Reads the STUDENT groups the caller can follow (`GET /api/groups?type=STUDENT`; the backend scopes them: a teacher gets the groups created or supervised, an admin every group) through useApiQuery and maps them to group options. Depends on React, @shared/api-client and the teacher dashboard mapper and service.
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
import { toGroupOptions } from "../../api/mappers/teacher-dashboard.mapper";
import { GROUPS_PATH } from "../../api/services/teacher-dashboard.service";
import type { GroupOption } from "../entities/teacher-dashboard.entity";

export type UseTeacherGroupsResult = {
  groups: GroupOption[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const GROUPS_QUERY = { query: { type: "STUDENT" } } as const;

export function useTeacherGroups(): UseTeacherGroupsResult {
  const { data, error, isLoading, mutate } = useApiQuery(GROUPS_PATH, GROUPS_QUERY);
  const groups = useMemo(() => (data ? toGroupOptions(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { groups, isLoading, error: error ?? null, reload };
}

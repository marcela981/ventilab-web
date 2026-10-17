/*
* Funcionalidad: useAdminGroups
* Descripción: Reads every group (`GET /api/groups`; an admin sees all of them) for the group filter of /admin/users and maps them to options sorted by name. A failure leaves the filter with "Todos" only and reports the error. Depends on React, @shared/api-client and the admin console mapper and service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toGroupFilterOptions } from "../../api/mappers/admin-users.mapper";
import { GROUPS_PATH } from "../../api/services/admin-users.service";
import type { GroupFilterOption } from "../entities/admin-users.entity";

export type UseAdminGroupsResult = {
  groups: GroupFilterOption[] | null
  error: ApiError | null
};

export function useAdminGroups(): UseAdminGroupsResult {
  const { data, error } = useApiQuery(GROUPS_PATH);
  const groups = useMemo(() => (data ? toGroupFilterOptions(data.data) : null), [data]);

  return { groups, error: error ?? null };
}

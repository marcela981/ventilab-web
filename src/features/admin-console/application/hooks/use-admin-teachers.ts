/*
* Funcionalidad: useAdminTeachers
* Descripción: Reads the teachers of the Profesores tab (`GET /api/admin/teachers?search`, ADMIN: teachers and admins ordered by name with the active student groups they created or supervise and the distinct students in them) through useApiQuery and maps them to rows. A new search never shows the previous rows (no keepPreviousData); disabled until the router is ready. Depends on React, @shared/api-client and the admin console mapper, service and entity.
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
import { toAdminTeacherRow } from "../../api/mappers/admin-users.mapper";
import { TEACHERS_PATH } from "../../api/services/admin-users.service";
import type { AdminTeacherRow } from "../entities/admin-teachers.entity";
import { NO_PREVIOUS_DATA } from "./use-audit-log";

export type UseAdminTeachersResult = {
  rows: AdminTeacherRow[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useAdminTeachers(search: string, enabled: boolean): UseAdminTeachersResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    enabled ? TEACHERS_PATH : null,
    { query: search ? { search } : {} },
    NO_PREVIOUS_DATA,
  );
  const rows = useMemo(() => (data ? data.data.map(toAdminTeacherRow) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { rows, isLoading, error: error ?? null, reload };
}

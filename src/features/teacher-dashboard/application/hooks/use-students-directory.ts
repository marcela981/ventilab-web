/*
* Funcionalidad: useStudentsDirectory
* Descripción: Reads one page of `GET /api/admin/students` for the directory URL state (search by name, email or student code, server sort by name or progress, "Mis grupos" → myGroups=true, 25 rows per page) through useApiQuery, and maps the rows and the envelope pagination. keepPreviousData is off: a new page, search or filter never shows the previous rows as its own (the row selection belongs to the rows on screen). Depends on React, @shared/api-client and the students directory mapper, service and entity.
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
import { toDirectoryRow } from "../../api/mappers/students-directory.mapper";
import { ADMIN_STUDENTS_PATH } from "../../api/services/students-directory.service";
import { toAdminStudentsQuery } from "../entities/students-directory.entity";
import type { DirectoryRow, DirectoryState } from "../entities/students-directory.entity";

export type DirectoryPagination = { page: number, pages: number, limit: number, total: number };

export type UseStudentsDirectoryResult = {
  rows: DirectoryRow[] | null
  pagination: DirectoryPagination | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const NO_PREVIOUS_DATA = { keepPreviousData: false } as const;

export function useStudentsDirectory(state: DirectoryState, enabled: boolean): UseStudentsDirectoryResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    enabled ? ADMIN_STUDENTS_PATH : null,
    { query: toAdminStudentsQuery(state) },
    NO_PREVIOUS_DATA,
  );
  const rows = useMemo(() => (data ? data.data.map(toDirectoryRow) : null), [data]);
  const raw = data?.pagination;
  const pagination = raw ? { page: raw.page, pages: raw.pages, limit: raw.limit, total: raw.total } : null;

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { rows, pagination, isLoading, error: error ?? null, reload };
}

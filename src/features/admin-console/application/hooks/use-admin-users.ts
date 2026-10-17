/*
* Funcionalidad: useAdminUsers
* Descripción: Reads one page of `GET /api/users` for the filters of the URL (search by name, email or exact id; role; group; account status; sorted by name) through useApiQuery and maps the rows and the envelope pagination. Keeps the previous page on screen while the next one loads. Depends on React, @shared/api-client and the admin console mapper, service and entity.
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
import { toAdminUserRow } from "../../api/mappers/admin-users.mapper";
import { USERS_PATH } from "../../api/services/admin-users.service";
import { toAdminUsersQuery } from "../entities/admin-users.entity";
import type { AdminUserFilters, AdminUserRow } from "../entities/admin-users.entity";

export type AdminUsersPagination = { page: number, pages: number, limit: number, total: number };

export type UseAdminUsersResult = {
  rows: AdminUserRow[] | null
  pagination: AdminUsersPagination | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const KEEP_PREVIOUS = { keepPreviousData: true } as const;

export function useAdminUsers(filters: AdminUserFilters, enabled: boolean): UseAdminUsersResult {
  const { data, error, isLoading, mutate } = useApiQuery(enabled ? USERS_PATH : null, { query: toAdminUsersQuery(filters) }, KEEP_PREVIOUS);
  const rows = useMemo(() => (data ? data.data.map(toAdminUserRow) : null), [data]);
  const raw = data?.pagination;
  const pagination = raw ? { page: raw.page, pages: raw.pages, limit: raw.limit, total: raw.total } : null;

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { rows, pagination, isLoading, error: error ?? null, reload };
}

/*
* Funcionalidad: useAuditLog
* Descripción: Reads one page of `GET /api/audit` for the filters of the URL (actor, action, target, Bogota days turned into the ISO range, page, sort order) and maps the rows to AuditEntry with the envelope pagination. A null range (invalid dates) sends no request. Previous data is never kept: another filter or page shows the loading or error state, never the rows of the previous key. Depends on React, @shared/api-client and the admin console mapper, service and entities.
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
import { toAuditEntry } from "../../api/mappers/admin-operations.mapper";
import { AUDIT_PATH } from "../../api/services/admin-operations.service";
import { toAuditApiQuery } from "../entities/audit.entity";
import type { AuditEntry, AuditFilters } from "../entities/audit.entity";
import type { IsoRange } from "../entities/date-range.entity";

export type ListPagination = { page: number, pages: number, limit: number, total: number };

export type UseAuditLogResult = {
  entries: AuditEntry[] | null
  pagination: ListPagination | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export const NO_PREVIOUS_DATA = { keepPreviousData: false } as const;

export function useAuditLog(filters: AuditFilters, range: IsoRange | null, enabled: boolean): UseAuditLogResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    enabled && range ? AUDIT_PATH : null,
    { query: toAuditApiQuery(filters, range ?? {}) },
    NO_PREVIOUS_DATA,
  );
  const entries = useMemo(() => (data ? data.data.map(toAuditEntry) : null), [data]);
  const raw = data?.pagination;
  const pagination = raw ? { page: raw.page, pages: raw.pages, limit: raw.limit, total: raw.total } : null;

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { entries, pagination, isLoading, error: error ?? null, reload };
}

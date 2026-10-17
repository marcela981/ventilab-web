/*
* Funcionalidad: useAuditTargetHistory
* Descripción: Reads one page of the audit history of one target (`GET /api/audit/targets/{type}/{id}?page&limit&sortOrder=desc`, newest first) for the detail dialog of /admin/audit. A null target sends no request. Previous data is never kept, so another page shows its own loading or error state. Depends on React, @shared/api-client and the admin console mapper, service, entities and audit log hook.
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
import { AUDIT_TARGET_PATH } from "../../api/services/admin-operations.service";
import { AUDIT_HISTORY_PAGE_SIZE } from "../entities/audit.entity";
import type { AuditEntry } from "../entities/audit.entity";
import { NO_PREVIOUS_DATA } from "./use-audit-log";
import type { ListPagination } from "./use-audit-log";

export type AuditTarget = { type: string, id: string };

export type UseAuditTargetHistoryResult = {
  entries: AuditEntry[] | null
  pagination: ListPagination | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useAuditTargetHistory(target: AuditTarget | null, page: number): UseAuditTargetHistoryResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    target ? AUDIT_TARGET_PATH : null,
    {
      params: { type: target?.type ?? "", id: target?.id ?? "" },
      query: { page, limit: AUDIT_HISTORY_PAGE_SIZE, sortOrder: "desc" },
    },
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

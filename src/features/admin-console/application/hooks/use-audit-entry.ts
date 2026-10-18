/*
* Funcionalidad: useAuditEntry
* Descripción: Reads one audit entry by id for the detail dialog of /admin/audit (`GET /api/audit/{id}`, 404 audit-log.not_found when it does not exist) through useApiQuery and maps it to AuditEntry. A null id sends no request; another id never shows the previous entry (keepPreviousData off). Depends on React, @shared/api-client and the admin console mapper, service and entities.
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
import { AUDIT_ENTRY_PATH } from "../../api/services/admin-operations.service";
import type { AuditEntry } from "../entities/audit.entity";
import { NO_PREVIOUS_DATA } from "./use-audit-log";

export type UseAuditEntryResult = {
  entry: AuditEntry | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useAuditEntry(id: string | null): UseAuditEntryResult {
  const { data, error, isLoading, mutate } = useApiQuery(id ? AUDIT_ENTRY_PATH : null, { params: { id: id ?? "" } }, NO_PREVIOUS_DATA);
  const entry = useMemo(() => (data && data.data.id === id ? toAuditEntry(data.data) : null), [data, id]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { entry, isLoading, error: error ?? null, reload };
}

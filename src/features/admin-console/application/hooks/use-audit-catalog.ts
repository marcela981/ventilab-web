/*
* Funcionalidad: useAuditCatalog
* Descripción: Reads the audit catalog once for /admin/audit (`GET /api/audit/catalog`: every action of the audit action catalog, the target types present in the log and the CSV export row limit) through useApiQuery. A failure leaves catalog null and the filters fall back to free text. Depends on React, @shared/api-client and the admin console mapper, service and entities.
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
import { toAuditCatalog } from "../../api/mappers/admin-operations.mapper";
import { AUDIT_CATALOG_PATH } from "../../api/services/admin-operations.service";
import type { AuditCatalog } from "../entities/audit.entity";

export type UseAuditCatalogResult = {
  catalog: AuditCatalog | null
  error: ApiError | null
};

const QUERY_CONFIG = { revalidateOnFocus: false } as const;

export function useAuditCatalog(): UseAuditCatalogResult {
  const { data, error } = useApiQuery(AUDIT_CATALOG_PATH, undefined, QUERY_CONFIG);
  const catalog = useMemo(() => (data ? toAuditCatalog(data.data) : null), [data]);

  return { catalog, error: error ?? null };
}

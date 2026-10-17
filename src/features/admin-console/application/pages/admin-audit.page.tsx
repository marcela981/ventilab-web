/*
* Funcionalidad: AdminAuditPage
* Descripción: Page /admin/audit (ADMIN): paginated audit log of `GET /api/audit` with actor, action, target type and id, "Desde"/"Hasta" days in America/Bogota (sent as an ISO range, `to` exclusive) and sort order, all kept in the URL (shareable). A row opens the detail dialog (changed fields only, target history). "Exportar CSV" downloads `GET /api/audit/export` with the same filters and shows a notice when the server truncated the file (X-Export-Truncated). A new filter or page never shows the previous rows (no keepPreviousData); an error is shown whenever the request fails; a page beyond the last one (old URL) is moved to the last page. v1.1 (review): changing the filters (not the page) clears the CSV truncation notice, so it only describes the export of the current filters. Depends on MUI, next/head, next/router, React, the design-system components, the admin console components, entities, hooks, service and CSS Module.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { exportAuditCsv } from "../../api/services/admin-operations.service";
import { AuditEntryDialog } from "../components/audit-entry-dialog";
import { AuditFilters } from "../components/audit-filters";
import { AuditTable } from "../components/audit-table";
import { ListPager } from "../components/list-pager";
import { getAdminConsoleErrorMessage } from "../entities/admin-console-error-messages";
import { hasAuditFilters, NO_AUDIT_FILTERS, readAuditFilters, toAuditExportQuery, toAuditFiltersQuery } from "../entities/audit.entity";
import type { AuditEntry, AuditFilters as AuditFiltersValue } from "../entities/audit.entity";
import { DATE_RANGE_ERRORS, isIsoRange, toIsoRange } from "../entities/date-range.entity";
import { useAuditLog } from "../hooks/use-audit-log";
import { useCsvExport } from "../hooks/use-csv-export";
import styles from "../../UI/admin-operations.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const ADMIN_AUDIT_COPY = {
  documentTitle: "Auditoría | VentyLab",
  title: "Auditoría",
  subtitle: "Acciones administrativas registradas por el servidor: quién hizo qué, sobre qué objetivo y qué campos cambiaron.",
  datesNote: "Las fechas se interpretan en hora de Bogotá; «Hasta» incluye el día completo.",
  export: "Exportar CSV",
  exportFile: "auditoria.csv",
  truncated: "La exportación quedó truncada: el servidor dejó filas fuera por su límite de exportación. Acota los filtros (por ejemplo, el rango de fechas) para obtener el resto.",
  loading: "Cargando la auditoría…",
  loadErrorTitle: "No se pudo cargar la auditoría",
  emptyTitle: "No hay registros de auditoría",
  noMatchTitle: "Ningún registro coincide con los filtros",
  noMatchDescription: "Cambia o limpia los filtros.",
  clearFilters: "Limpiar filtros",
} as const;

export function AdminAuditPage() {
  const router = useRouter();
  const filters = useMemo(() => readAuditFilters(router.query), [router.query]);
  const range = toIsoRange(filters.fromDay, filters.toDay);
  const validRange = isIsoRange(range) ? range : null;
  const list = useAuditLog(filters, validRange, router.isReady);
  const csv = useCsvExport();
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const { entries, pagination } = list;
  const filtered = hasAuditFilters(filters);

  const replaceQuery = (next: AuditFiltersValue) => {
    void router.replace({ pathname: router.pathname, query: toAuditFiltersQuery(next) }, undefined, { shallow: true });
  };

  const setFilters = (next: AuditFiltersValue) => {
    // New filters mean a different export: the previous truncation notice no longer applies.
    csv.reset();
    replaceQuery(next);
  };

  useEffect(() => {
    // A page beyond the last one (shared URL, deleted filters): show the last page instead of an empty list.
    if (entries && entries.length === 0 && pagination && pagination.total > 0 && filters.page > pagination.pages) {
      void router.replace(
        { pathname: router.pathname, query: toAuditFiltersQuery({ ...filters, page: Math.max(1, pagination.pages) }) },
        undefined,
        { shallow: true },
      );
    }
  }, [entries, pagination, filters, router]);

  const exportCsv = () => {
    if (validRange) {
      void csv.run(() => exportAuditCsv(toAuditExportQuery(filters, validRange)), ADMIN_AUDIT_COPY.exportFile);
    }
  };

  const renderList = () => {
    if (list.error) {
      return (
        <ErrorState
          title={ADMIN_AUDIT_COPY.loadErrorTitle}
          description={getAdminConsoleErrorMessage(list.error)}
          onRetry={() => void list.reload()}
        />
      );
    }

    if (!entries || !pagination) {
      return validRange && (list.isLoading || !router.isReady) ? <ListSkeleton rows={5} label={ADMIN_AUDIT_COPY.loading} /> : null;
    }

    if (entries.length === 0) {
      if (pagination.total > 0) {
        return <ListSkeleton rows={5} label={ADMIN_AUDIT_COPY.loading} />;
      }

      return filtered ? (
        <EmptyState
          title={ADMIN_AUDIT_COPY.noMatchTitle}
          description={ADMIN_AUDIT_COPY.noMatchDescription}
          action={<Button onClick={() => setFilters(NO_AUDIT_FILTERS)}>{ADMIN_AUDIT_COPY.clearFilters}</Button>}
        />
      ) : (
        <EmptyState icon={<HistoryIcon />} title={ADMIN_AUDIT_COPY.emptyTitle} />
      );
    }

    return (
      <div className={cx(styles.results)}>
        <AuditTable entries={entries} onOpen={setSelected} />
        <ListPager
          page={filters.page}
          pages={pagination.pages}
          total={pagination.total}
          limit={pagination.limit}
          onChange={(page) => replaceQuery({ ...filters, page })}
        />
      </div>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{ADMIN_AUDIT_COPY.documentTitle}</title>
      </Head>
      <PageHeader
        title={ADMIN_AUDIT_COPY.title}
        subtitle={ADMIN_AUDIT_COPY.subtitle}
        actions={(
          <AsyncButton variant="outlined" startIcon={<DownloadIcon />} loading={csv.exporting} disabled={!validRange} onClick={exportCsv}>
            {ADMIN_AUDIT_COPY.export}
          </AsyncButton>
        )}
      />
      <div className={cx(styles.content)}>
        <AuditFilters value={filters} onChange={setFilters} />
        <p className={cx(styles.note)}>{ADMIN_AUDIT_COPY.datesNote}</p>
        {isIsoRange(range) ? null : <Alert severity="error">{DATE_RANGE_ERRORS[range]}</Alert>}
        {csv.truncated ? <Alert severity="warning">{ADMIN_AUDIT_COPY.truncated}</Alert> : null}
        {renderList()}
      </div>
      <AuditEntryDialog key={selected?.id ?? "none"} entry={selected} onOpen={setSelected} onClose={() => setSelected(null)} />
    </div>
  );
}

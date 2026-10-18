/*
* Funcionalidad: AuditEntryDialog
* Descripción: Detail dialog of one audit entry of /admin/audit, read by id from `GET /api/audit/{id}` (loading skeleton, error with retry, 404 message): date, action, actor and actor role, target type, id and collection, description, reason, IP and request id, then the before/after diff with ONLY the changed fields (diffAuditChanges over the stored before/after objects, dotted keys). "Historial del objetivo" loads the paginated history of the same target (`GET /api/audit/targets/{type}/{id}`) under the detail; a history row can be opened in turn. The page mounts it with key = entry id, so the history panel starts closed for every entry. v1.1 (closure B2): the dialog takes the entry id and reads the detail endpoint instead of reusing the list row. Depends on MUI, React, @shared/lib, the design-system states and skeleton, the admin console audit entity, hooks, components, error messages and CSS Module.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useMemo, useState } from "react";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { getAdminConsoleErrorMessage } from "../entities/admin-console-error-messages";
import { MISSING_VALUE } from "../entities/admin-format";
import { diffAuditChanges, formatAuditValue } from "../entities/audit.entity";
import type { AuditEntry } from "../entities/audit.entity";
import { useAuditEntry } from "../hooks/use-audit-entry";
import { useAuditTargetHistory } from "../hooks/use-audit-target-history";
import { AuditTable } from "./audit-table";
import { ListPager } from "./list-pager";
import styles from "../../UI/admin-operations.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AUDIT_DIALOG_COPY = {
  title: (action: string) => `Registro: ${action}`,
  date: "Fecha",
  actor: "Actor",
  actorRole: "Rol del actor",
  target: "Objetivo",
  collection: "Colección",
  description: "Descripción",
  reason: "Motivo",
  ip: "IP",
  requestId: "ID de la solicitud",
  system: "Sistema",
  changesTitle: "Campos que cambiaron",
  changesCaption: "Valores antes y después de los campos que cambiaron",
  field: "Campo",
  before: "Antes",
  after: "Después",
  noChanges: "El registro no guarda cambios de campos.",
  history: "Historial del objetivo",
  hideHistory: "Ocultar historial",
  historyTitle: (type: string, id: string) => `Historial de ${type} ${id}`,
  historyLoading: "Cargando el historial…",
  historyError: "No se pudo cargar el historial",
  historyEmpty: "No hay más registros de este objetivo.",
  close: "Cerrar",
  loadingTitle: "Registro de auditoría",
  entryLoading: "Cargando el registro…",
  entryError: "No se pudo cargar el registro",
} as const;

function TargetHistory({ entry, onOpen }: { entry: AuditEntry, onOpen: (entry: AuditEntry) => void }) {
  const [page, setPage] = useState(1);
  const history = useAuditTargetHistory({ type: entry.targetType, id: entry.targetId }, page);
  const { entries, pagination } = history;

  // Out-of-range page (the history shrank): move to the last page that exists while rendering.
  if (entries && entries.length === 0 && pagination && pagination.total > 0 && page > pagination.pages) {
    setPage(Math.max(1, pagination.pages));
  }

  const title = AUDIT_DIALOG_COPY.historyTitle(entry.targetType, entry.targetId);

  return (
    <section className={cx(styles.section)} aria-label={title}>
      <h3 className={cx(styles.sectionTitle)}>{title}</h3>
      {history.error ? (
        <ErrorState
          title={AUDIT_DIALOG_COPY.historyError}
          description={getAdminConsoleErrorMessage(history.error)}
          onRetry={() => void history.reload()}
        />
      ) : null}
      {!history.error && !entries ? <ListSkeleton rows={3} label={AUDIT_DIALOG_COPY.historyLoading} /> : null}
      {!history.error && entries && entries.length === 0 ? <p className={cx(styles.note)}>{AUDIT_DIALOG_COPY.historyEmpty}</p> : null}
      {!history.error && entries && entries.length > 0 && pagination ? (
        <div className={cx(styles.results)}>
          <AuditTable entries={entries} onOpen={onOpen} caption={title} />
          <ListPager page={page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onChange={setPage} />
        </div>
      ) : null}
    </section>
  );
}

export type AuditEntryDialogProps = {
  // Id of the entry to show; the dialog reads it from `GET /api/audit/{id}`.
  entryId: string | null
  onOpen: (entry: AuditEntry) => void
  onClose: () => void
};

export function AuditEntryDialog({ entryId, onOpen, onClose }: AuditEntryDialogProps) {
  const { entry, error, reload } = useAuditEntry(entryId);

  if (!entryId) {
    return null;
  }

  // One dialog for the whole read: only its content changes from the loading or error state to the detail.
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="audit-entry-title">
      {entry ? <AuditEntryDetail entry={entry} onOpen={onOpen} onClose={onClose} /> : (
        <>
          <DialogTitle id="audit-entry-title">{AUDIT_DIALOG_COPY.loadingTitle}</DialogTitle>
          <DialogContent>
            {error ? (
              <ErrorState
                title={AUDIT_DIALOG_COPY.entryError}
                description={getAdminConsoleErrorMessage(error)}
                onRetry={() => void reload()}
              />
            ) : <ListSkeleton rows={4} label={AUDIT_DIALOG_COPY.entryLoading} />}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>{AUDIT_DIALOG_COPY.close}</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

function AuditEntryDetail({ entry, onOpen, onClose }: { entry: AuditEntry, onOpen: (entry: AuditEntry) => void, onClose: () => void }) {
  const [showHistory, setShowHistory] = useState(false);
  const changes = useMemo(() => diffAuditChanges(entry.before, entry.after), [entry]);

  const details: [string, string][] = [
    [AUDIT_DIALOG_COPY.date, formatDateTime(entry.performedAt)],
    [AUDIT_DIALOG_COPY.actor, entry.actorId ?? AUDIT_DIALOG_COPY.system],
    [AUDIT_DIALOG_COPY.actorRole, entry.actorRole ?? MISSING_VALUE],
    [AUDIT_DIALOG_COPY.target, `${entry.targetType} · ${entry.targetId}`],
    [AUDIT_DIALOG_COPY.collection, entry.targetCollection],
    [AUDIT_DIALOG_COPY.description, entry.description ?? MISSING_VALUE],
    [AUDIT_DIALOG_COPY.reason, entry.reason ?? MISSING_VALUE],
    [AUDIT_DIALOG_COPY.ip, entry.ip ?? MISSING_VALUE],
    [AUDIT_DIALOG_COPY.requestId, entry.requestId ?? MISSING_VALUE],
  ];

  return (
    <>
      <DialogTitle id="audit-entry-title">{AUDIT_DIALOG_COPY.title(entry.action)}</DialogTitle>
      <DialogContent>
        <div className={cx(styles.dialogBody)}>
          <dl className={cx(styles.detailList)}>
            {details.map(([label, value]) => (
              <div key={label} className={cx(styles.detailRow)}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <section className={cx(styles.section)} aria-label={AUDIT_DIALOG_COPY.changesTitle}>
            <h3 className={cx(styles.sectionTitle)}>{AUDIT_DIALOG_COPY.changesTitle}</h3>
            {changes.length === 0 ? <p className={cx(styles.note)}>{AUDIT_DIALOG_COPY.noChanges}</p> : (
              <div className={cx(styles.tableContainer)}>
                <table className={cx(styles.table)}>
                  <caption className={cx(styles.visuallyHidden)}>{AUDIT_DIALOG_COPY.changesCaption}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{AUDIT_DIALOG_COPY.field}</th>
                      <th scope="col">{AUDIT_DIALOG_COPY.before}</th>
                      <th scope="col">{AUDIT_DIALOG_COPY.after}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((change) => (
                      <tr key={change.path}>
                        <th scope="row" className={cx(styles.mono)}>{change.path}</th>
                        <td className={cx(styles.mono, styles.before)}>{formatAuditValue(change.before)}</td>
                        <td className={cx(styles.mono, styles.after)}>{formatAuditValue(change.after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {showHistory ? <TargetHistory entry={entry} onOpen={onOpen} /> : null}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowHistory((value) => !value)}>
          {showHistory ? AUDIT_DIALOG_COPY.hideHistory : AUDIT_DIALOG_COPY.history}
        </Button>
        <Button onClick={onClose}>{AUDIT_DIALOG_COPY.close}</Button>
      </DialogActions>
    </>
  );
}

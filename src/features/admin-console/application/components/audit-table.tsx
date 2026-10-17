/*
* Funcionalidad: AuditTable
* Descripción: Rows of the audit log in /admin/audit: date (es-CO, America/Bogota), action, actor (role and id, or "Sistema" when the API has no actor), target (type and id), description and a "Ver detalle" button that opens the detail dialog of the row. Shows the values as the API returns them. Depends on MUI, @shared/lib, the admin console audit entity and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { MISSING_VALUE } from "../entities/admin-format";
import type { AuditEntry } from "../entities/audit.entity";
import styles from "../../UI/admin-operations.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AUDIT_TABLE_COPY = {
  caption: "Registros de auditoría",
  date: "Fecha",
  action: "Acción",
  actor: "Actor",
  target: "Objetivo",
  description: "Descripción",
  actions: "Acciones",
  system: "Sistema",
  detail: "Ver detalle",
  detailOf: (action: string, date: string) => `Ver detalle de ${action} del ${date}`,
} as const;

export type AuditTableProps = {
  entries: readonly AuditEntry[]
  onOpen: (entry: AuditEntry) => void
  caption?: string
};

export function AuditTable({ entries, onOpen, caption = AUDIT_TABLE_COPY.caption }: AuditTableProps) {
  return (
    <div className={cx(styles.tableContainer)}>
      <table className={cx(styles.table)}>
        <caption className={cx(styles.visuallyHidden)}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{AUDIT_TABLE_COPY.date}</th>
            <th scope="col">{AUDIT_TABLE_COPY.action}</th>
            <th scope="col">{AUDIT_TABLE_COPY.actor}</th>
            <th scope="col">{AUDIT_TABLE_COPY.target}</th>
            <th scope="col">{AUDIT_TABLE_COPY.description}</th>
            <th scope="col">{AUDIT_TABLE_COPY.actions}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const date = formatDateTime(entry.performedAt);

            return (
              <tr key={entry.id}>
                <td>{date}</td>
                <th scope="row" className={cx(styles.mono)}>{entry.action}</th>
                <td>
                  {entry.actorId ? (
                    <>
                      <span>{entry.actorRole ?? MISSING_VALUE}</span>
                      <span className={cx(styles.secondary, styles.mono)}>{entry.actorId}</span>
                    </>
                  ) : AUDIT_TABLE_COPY.system}
                </td>
                <td>
                  <span>{entry.targetType}</span>
                  <span className={cx(styles.secondary, styles.mono)}>{entry.targetId}</span>
                </td>
                <td>{entry.description ?? MISSING_VALUE}</td>
                <td>
                  <Button size="small" onClick={() => onOpen(entry)} aria-label={AUDIT_TABLE_COPY.detailOf(entry.action, date)}>
                    {AUDIT_TABLE_COPY.detail}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/*
* Funcionalidad: UsersTable
* Descripción: Table of one page of users in /admin/users: name, email, role, account status (text label, never colour alone), creation date and the row actions "Cambiar rol" and "Desactivar"/"Activar". The signed-in admin's own row keeps its actions disabled with the reason "No puedes cambiar tu propia cuenta" (the backend refuses both changes on one's own account). Superadmin rows cannot be told apart (no DTO flag, BACKEND GAP): their actions stay enabled and the backend 403 is shown. Depends on MUI, @shared/lib and the admin console config, entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { formatDate } from "@shared/lib/format";
import { ROLE_LABELS } from "../config/admin-console.config";
import { OWN_ACCOUNT_MESSAGE } from "../entities/admin-console-error-messages";
import { isOwnAccount } from "../entities/admin-users.entity";
import type { AdminUserRow } from "../entities/admin-users.entity";
import styles from "../../UI/admin-users.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const USERS_TABLE_COPY = {
  caption: "Usuarios de la plataforma",
  name: "Nombre",
  email: "Correo",
  role: "Rol",
  status: "Estado",
  createdAt: "Creado",
  actions: "Acciones",
  noName: "Sin nombre",
  active: "Activa",
  inactive: "Desactivada",
  changeRole: "Cambiar rol",
  deactivate: "Desactivar",
  activate: "Activar",
  you: "(tú)",
  actionsFor: (name: string) => `Acciones de ${name}`,
} as const;

export type UsersTableProps = {
  rows: readonly AdminUserRow[]
  sessionUserId: string | null
  onChangeRole: (row: AdminUserRow) => void
  onChangeStatus: (row: AdminUserRow) => void
};

function displayName(row: AdminUserRow): string {
  return row.name?.trim() || row.email;
}

function UserRowView({ row, own, onChangeRole, onChangeStatus }: { row: AdminUserRow, own: boolean } & Omit<UsersTableProps, "rows" | "sessionUserId">) {
  const reasonId = useId();
  const disabledProps = own ? { disabled: true, "aria-describedby": reasonId } : {};

  return (
    <tr>
      <th scope="row">
        <span className={cx(styles.userName)}>
          {row.name?.trim() || USERS_TABLE_COPY.noName}
          {own ? ` ${USERS_TABLE_COPY.you}` : null}
        </span>
        <span className={cx(styles.secondary)}>{row.id}</span>
      </th>
      <td>{row.email}</td>
      <td>{ROLE_LABELS[row.role]}</td>
      <td>
        <span className={cx(styles.statusBadge)} data-active={row.isActive ? "true" : "false"}>
          {row.isActive ? USERS_TABLE_COPY.active : USERS_TABLE_COPY.inactive}
        </span>
      </td>
      <td>{formatDate(row.createdAt)}</td>
      <td>
        <div className={cx(styles.rowActions)} role="group" aria-label={USERS_TABLE_COPY.actionsFor(displayName(row))}>
          <Button size="small" onClick={() => onChangeRole(row)} {...disabledProps}>{USERS_TABLE_COPY.changeRole}</Button>
          <Button size="small" color={row.isActive ? "error" : "primary"} onClick={() => onChangeStatus(row)} {...disabledProps}>
            {row.isActive ? USERS_TABLE_COPY.deactivate : USERS_TABLE_COPY.activate}
          </Button>
        </div>
        {own ? <span id={reasonId} className={cx(styles.secondary)}>{OWN_ACCOUNT_MESSAGE}</span> : null}
      </td>
    </tr>
  );
}

export function UsersTable({ rows, sessionUserId, onChangeRole, onChangeStatus }: UsersTableProps) {
  return (
    <div className={cx(styles.tableContainer)}>
      <table className={cx(styles.table)}>
        <caption className={cx(styles.visuallyHidden)}>{USERS_TABLE_COPY.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{USERS_TABLE_COPY.name}</th>
            <th scope="col">{USERS_TABLE_COPY.email}</th>
            <th scope="col">{USERS_TABLE_COPY.role}</th>
            <th scope="col">{USERS_TABLE_COPY.status}</th>
            <th scope="col">{USERS_TABLE_COPY.createdAt}</th>
            <th scope="col">{USERS_TABLE_COPY.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <UserRowView
              key={row.id}
              row={row}
              own={isOwnAccount(row, sessionUserId)}
              onChangeRole={onChangeRole}
              onChangeStatus={onChangeStatus}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

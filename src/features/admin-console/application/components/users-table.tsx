/*
* Funcionalidad: UsersTable
* Descripción: Table of one page of users in /admin/users: name, email, student code, role, account status (text label, never colour alone), creation date and the row actions "Cambiar rol", "Desactivar"/"Activar" and "Editar código". The signed-in admin's own row keeps its role and status actions disabled with the reason "No puedes cambiar tu propia cuenta" (the backend refuses both changes on one's own account). v1.1 (closure B2): the superadmin row comes from `UserDTO.isSuperadmin`: it is marked "Superadministrador" and its role and status actions are disabled with the protected-account reason (no backend 403 round trip); the student code column and its edit action. Depends on MUI, @shared/lib and the admin console config, entities and CSS Module.
* Versión: 1.1
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
import { OWN_ACCOUNT_MESSAGE, SUPERADMIN_PROTECTED_MESSAGE } from "../entities/admin-console-error-messages";
import { lockedReason } from "../entities/admin-users.entity";
import type { AdminUserRow } from "../entities/admin-users.entity";
import styles from "../../UI/admin-users.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const USERS_TABLE_COPY = {
  caption: "Usuarios de la plataforma",
  name: "Nombre",
  email: "Correo",
  studentCode: "Código",
  role: "Rol",
  status: "Estado",
  createdAt: "Creado",
  actions: "Acciones",
  noName: "Sin nombre",
  noCode: "—",
  active: "Activa",
  inactive: "Desactivada",
  changeRole: "Cambiar rol",
  deactivate: "Desactivar",
  activate: "Activar",
  editCode: "Editar código",
  you: "(tú)",
  superadmin: "Superadministrador",
  actionsFor: (name: string) => `Acciones de ${name}`,
} as const;

const LOCK_MESSAGES = { superadmin: SUPERADMIN_PROTECTED_MESSAGE, own: OWN_ACCOUNT_MESSAGE } as const;

export type UsersTableProps = {
  rows: readonly AdminUserRow[]
  sessionUserId: string | null
  onChangeRole: (row: AdminUserRow) => void
  onChangeStatus: (row: AdminUserRow) => void
  onEditCode: (row: AdminUserRow) => void
};

function displayName(row: AdminUserRow): string {
  return row.name?.trim() || row.email;
}

type RowProps = { row: AdminUserRow, sessionUserId: string | null } & Omit<UsersTableProps, "rows" | "sessionUserId">;

function UserRowView({ row, sessionUserId, onChangeRole, onChangeStatus, onEditCode }: RowProps) {
  const reasonId = useId();
  const lock = lockedReason(row, sessionUserId);
  const own = sessionUserId !== null && row.id === sessionUserId;
  const disabledProps = lock ? { disabled: true, "aria-describedby": reasonId } : {};

  return (
    <tr>
      <th scope="row">
        <span className={cx(styles.userName)}>
          {row.name?.trim() || USERS_TABLE_COPY.noName}
          {own ? ` ${USERS_TABLE_COPY.you}` : null}
        </span>
        {row.isSuperadmin ? <span className={cx(styles.protectedBadge)}>{USERS_TABLE_COPY.superadmin}</span> : null}
        <span className={cx(styles.secondary)}>{row.id}</span>
      </th>
      <td>{row.email}</td>
      <td className={cx(styles.code)}>{row.studentCode ?? USERS_TABLE_COPY.noCode}</td>
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
          <Button size="small" onClick={() => onEditCode(row)}>{USERS_TABLE_COPY.editCode}</Button>
        </div>
        {lock ? <span id={reasonId} className={cx(styles.secondary)}>{LOCK_MESSAGES[lock]}</span> : null}
      </td>
    </tr>
  );
}

export function UsersTable({ rows, sessionUserId, onChangeRole, onChangeStatus, onEditCode }: UsersTableProps) {
  return (
    <div className={cx(styles.tableContainer)}>
      <table className={cx(styles.table)}>
        <caption className={cx(styles.visuallyHidden)}>{USERS_TABLE_COPY.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{USERS_TABLE_COPY.name}</th>
            <th scope="col">{USERS_TABLE_COPY.email}</th>
            <th scope="col">{USERS_TABLE_COPY.studentCode}</th>
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
              sessionUserId={sessionUserId}
              onChangeRole={onChangeRole}
              onChangeStatus={onChangeStatus}
              onEditCode={onEditCode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

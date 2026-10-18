/*
* Funcionalidad: UsersFilters
* Descripción: Filter bar of /admin/users: search box (name, email, student code or exact user id, applied on submit), role, group (every group from `GET /api/groups`) and account status selects. Every change goes to the URL through onChange and returns to the first page. Depends on MUI, the design-system form field and the admin console config, entities and CSS Module. v1.1 (closure B2): the server search also matches the student code.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import SearchIcon from "@mui/icons-material/Search";
import Button from "@mui/material/Button";
import { useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { ROLE_LABELS, USER_ROLES } from "../config/admin-console.config";
import type { UserRole } from "../config/admin-console.config";
import type { ActiveFilter, AdminUserFilters, GroupFilterOption } from "../entities/admin-users.entity";
import styles from "../../UI/admin-users.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const USERS_FILTERS_COPY = {
  label: "Filtros de usuarios",
  search: "Buscar por nombre, correo, código o ID",
  searchAction: "Buscar",
  role: "Rol",
  group: "Grupo",
  status: "Estado de la cuenta",
  all: "Todos",
  active: "Activas",
  inactive: "Desactivadas",
  studentGroup: "estudiantes",
  teacherGroup: "docentes",
  groupsUnavailable: "No se pudieron cargar los grupos.",
} as const;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type UsersFiltersProps = {
  value: AdminUserFilters
  groups: readonly GroupFilterOption[] | null
  groupsFailed: boolean
  onChange: (next: AdminUserFilters) => void
};

export function UsersFilters({ value, groups, groupsFailed, onChange }: UsersFiltersProps) {
  const [search, setSearch] = useState(value.search);
  const [lastSearch, setLastSearch] = useState(value.search);

  // The URL is the source of truth: a back/forward navigation replaces the typed text.
  if (lastSearch !== value.search) {
    setLastSearch(value.search);
    setSearch(value.search);
  }

  const apply = (next: Partial<AdminUserFilters>) => onChange({ ...value, ...next, page: 1 });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    apply({ search: search.trim() });
  };

  return (
    <div className={cx(styles.filters)} role="group" aria-label={USERS_FILTERS_COPY.label}>
      <form className={cx(styles.searchForm)} role="search" onSubmit={submit}>
        <FormField
          label={USERS_FILTERS_COPY.search}
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>{USERS_FILTERS_COPY.searchAction}</Button>
      </form>
      <FormField
        select
        size="small"
        label={USERS_FILTERS_COPY.role}
        value={value.role}
        onChange={(event) => apply({ role: event.target.value as UserRole | "" })}
        slotProps={NATIVE_SELECT}
      >
        <option value="">{USERS_FILTERS_COPY.all}</option>
        {USER_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
      </FormField>
      <FormField
        select
        size="small"
        label={USERS_FILTERS_COPY.group}
        value={value.groupId}
        onChange={(event) => apply({ groupId: event.target.value })}
        slotProps={NATIVE_SELECT}
        helperText={groupsFailed ? USERS_FILTERS_COPY.groupsUnavailable : undefined}
      >
        <option value="">{USERS_FILTERS_COPY.all}</option>
        {/* A group id from a shared URL stays selectable until the list arrives. */}
        {value.groupId && !groups?.some((group) => group.id === value.groupId) ? <option value={value.groupId}>{value.groupId}</option> : null}
        {(groups ?? []).map((group) => (
          <option key={group.id} value={group.id}>
            {`${group.name} (${group.type === "STUDENT" ? USERS_FILTERS_COPY.studentGroup : USERS_FILTERS_COPY.teacherGroup})`}
          </option>
        ))}
      </FormField>
      <FormField
        select
        size="small"
        label={USERS_FILTERS_COPY.status}
        value={value.isActive}
        onChange={(event) => apply({ isActive: event.target.value as ActiveFilter })}
        slotProps={NATIVE_SELECT}
      >
        <option value="">{USERS_FILTERS_COPY.all}</option>
        <option value="true">{USERS_FILTERS_COPY.active}</option>
        <option value="false">{USERS_FILTERS_COPY.inactive}</option>
      </FormField>
    </div>
  );
}

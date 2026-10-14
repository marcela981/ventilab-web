/*
* Funcionalidad: GroupFilters
* Descripción: Filter bar of the staff group list: a labelled search field (name, description, period, parent group, leader or creator) and two labelled native selects for the group type (all, student, teacher) and the active state (all, active, inactive). Controlled: every change reports the new filters to the page, which filters on the client. Depends on MUI, the group entity and the groups CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import TextField from "@mui/material/TextField";
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { GROUP_TYPE_LABELS } from "../entities/group.entity";
import type { GroupFilters as GroupFiltersValue, GroupStatusFilter, GroupTypeFilter } from "../entities/group.entity";
import styles from "../../UI/groups.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const FILTER_COPY = {
  label: "Filtros de grupos",
  search: "Buscar",
  searchHelp: "Nombre, descripción, periodo, grupo superior, líder o creador",
  type: "Tipo",
  status: "Estado",
} as const;

const TYPE_OPTIONS: ReadonlyArray<[GroupTypeFilter, string]> = [
  ["all", "Todos"],
  ["STUDENT", GROUP_TYPE_LABELS.STUDENT],
  ["TEACHER", GROUP_TYPE_LABELS.TEACHER],
];

const STATUS_OPTIONS: ReadonlyArray<[GroupStatusFilter, string]> = [
  ["all", "Todos"],
  ["active", "Activos"],
  ["inactive", "Inactivos"],
];

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type GroupFiltersProps = {
  value: GroupFiltersValue
  onChange: (filters: GroupFiltersValue) => void
};

export function GroupFilters({ value, onChange }: GroupFiltersProps) {
  const searchId = useId();
  const typeId = useId();
  const statusId = useId();

  return (
    <div role="search" aria-label={FILTER_COPY.label} className={styles.filters}>
      <TextField
        id={searchId}
        type="search"
        label={FILTER_COPY.search}
        helperText={FILTER_COPY.searchHelp}
        value={value.text}
        onChange={(event) => onChange({ ...value, text: event.target.value })}
        className={cx(styles.search)}
      />
      <TextField
        id={typeId}
        select
        label={FILTER_COPY.type}
        value={value.type}
        onChange={(event) => onChange({ ...value, type: event.target.value as GroupTypeFilter })}
        slotProps={NATIVE_SELECT}
      >
        {TYPE_OPTIONS.map(([option, label]) => (
          <option key={option} value={option}>
            {label}
          </option>
        ))}
      </TextField>
      <TextField
        id={statusId}
        select
        label={FILTER_COPY.status}
        value={value.status}
        onChange={(event) => onChange({ ...value, status: event.target.value as GroupStatusFilter })}
        slotProps={NATIVE_SELECT}
      >
        {STATUS_OPTIONS.map(([option, label]) => (
          <option key={option} value={option}>
            {label}
          </option>
        ))}
      </TextField>
    </div>
  );
}

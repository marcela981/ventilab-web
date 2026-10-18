/*
* Funcionalidad: GroupSelector
* Descripción: Select of the STUDENT group shown by /teacher (name and member count as the API returns them). A group id that is not among the caller's groups (for example another teacher's group opened through ?groupId=) stays selectable as "Grupo no disponible" so the page can show its no-access state. Depends on MUI and the teacher dashboard entities, labels and CSS Module. v1.1 (closure B2): each option marks how the caller follows the group (`GroupDTO.relation`: "A cargo" or "Supervisado").
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { cx } from "@shared/lib/class-names";
import { GROUP_RELATION_LABELS } from "../entities/teacher-dashboard-labels";
import type { GroupOption } from "../entities/teacher-dashboard.entity";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const GROUP_SELECTOR_COPY = {
  label: "Grupo",
  unknown: "Grupo no disponible",
  members: (count: number) => `${count} ${count === 1 ? "integrante" : "integrantes"}`,
} as const;

export type GroupSelectorProps = {
  groups: readonly GroupOption[]
  value: string | null
  disabled?: boolean
  onChange: (groupId: string) => void
};

export function GroupSelector({ groups, value, disabled = false, onChange }: GroupSelectorProps) {
  const known = value === null || groups.some((group) => group.id === value);

  return (
    <TextField
      select
      size="small"
      label={GROUP_SELECTOR_COPY.label}
      value={value ?? ""}
      disabled={disabled}
      className={cx(styles.groupSelect)}
      onChange={(event) => onChange(event.target.value)}
    >
      {groups.map((group) => (
        <MenuItem key={group.id} value={group.id}>
          {`${group.name} (${GROUP_SELECTOR_COPY.members(group.membersCount)})`}
          {group.relation ? <span className={cx(styles.relationMark)}>{GROUP_RELATION_LABELS[group.relation]}</span> : null}
        </MenuItem>
      ))}
      {!known && value ? <MenuItem value={value}>{GROUP_SELECTOR_COPY.unknown}</MenuItem> : null}
    </TextField>
  );
}

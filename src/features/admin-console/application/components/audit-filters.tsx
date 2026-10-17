/*
* Funcionalidad: AuditFilters
* Descripción: Filter bar of /admin/audit: actor id, action (exact text), target type and target id, "Desde"/"Hasta" calendar days in America/Bogota (native date inputs) and the sort order. The fields are a draft that only reaches the URL on "Aplicar" (Enter submits); "Limpiar" resets every filter. A page change is not done here. Depends on MUI, React, the admin console audit entity and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { NO_AUDIT_FILTERS } from "../entities/audit.entity";
import type { AuditFilters as AuditFiltersValue, AuditSortOrder } from "../entities/audit.entity";
import styles from "../../UI/admin-operations.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AUDIT_FILTERS_COPY = {
  form: "Filtros de auditoría",
  actorId: "ID del actor",
  action: "Acción",
  actionHelp: "Texto exacto, p. ej. user_role_changed",
  targetType: "Tipo de objetivo",
  targetId: "ID del objetivo",
  from: "Desde",
  to: "Hasta",
  sortOrder: "Orden",
  newest: "Más recientes primero",
  oldest: "Más antiguos primero",
  apply: "Aplicar",
  clear: "Limpiar",
} as const;

export type AuditFiltersProps = {
  value: AuditFiltersValue
  onChange: (next: AuditFiltersValue) => void
};

const DATE_LABEL_PROPS = { inputLabel: { shrink: true } } as const;

export function AuditFilters({ value, onChange }: AuditFiltersProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const set = (field: keyof AuditFiltersValue) => (event: { target: { value: string } }) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onChange({ ...draft, page: 1 });
  };

  return (
    <form className={cx(styles.filters)} aria-label={AUDIT_FILTERS_COPY.form} onSubmit={submit}>
      <TextField size="small" label={AUDIT_FILTERS_COPY.actorId} value={draft.actorId} onChange={set("actorId")} />
      <TextField
        size="small"
        label={AUDIT_FILTERS_COPY.action}
        helperText={AUDIT_FILTERS_COPY.actionHelp}
        value={draft.action}
        onChange={set("action")}
      />
      <TextField size="small" label={AUDIT_FILTERS_COPY.targetType} value={draft.targetType} onChange={set("targetType")} />
      <TextField size="small" label={AUDIT_FILTERS_COPY.targetId} value={draft.targetId} onChange={set("targetId")} />
      <TextField size="small" type="date" label={AUDIT_FILTERS_COPY.from} value={draft.fromDay} onChange={set("fromDay")} slotProps={DATE_LABEL_PROPS} />
      <TextField size="small" type="date" label={AUDIT_FILTERS_COPY.to} value={draft.toDay} onChange={set("toDay")} slotProps={DATE_LABEL_PROPS} />
      <TextField
        size="small"
        select
        label={AUDIT_FILTERS_COPY.sortOrder}
        value={draft.sortOrder}
        onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value as AuditSortOrder }))}
      >
        <MenuItem value="desc">{AUDIT_FILTERS_COPY.newest}</MenuItem>
        <MenuItem value="asc">{AUDIT_FILTERS_COPY.oldest}</MenuItem>
      </TextField>
      <div className={cx(styles.filterActions)}>
        <Button type="submit" variant="contained">{AUDIT_FILTERS_COPY.apply}</Button>
        <Button type="button" onClick={() => onChange(NO_AUDIT_FILTERS)}>{AUDIT_FILTERS_COPY.clear}</Button>
      </div>
    </form>
  );
}

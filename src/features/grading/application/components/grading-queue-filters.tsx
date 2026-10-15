/*
* Funcionalidad: GradingQueueFilters
* Descripción: Filter bar of the grading queue: evaluation and student group native selects ("Todas"/"Todos" by default) and an order toggle between oldest first (default) and newest first. Controlled: reports the whole filter object on every change. Depends on MUI, @shared/lib, the grading entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { ALL_OPTION } from "../entities/grading.entity";
import type { FilterOption, GradingQueueFilters as Filters, GradingSortOrder } from "../entities/grading.entity";
import styles from "../../UI/grading.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const FILTER_COPY = {
  label: "Filtros de la cola de calificación",
  evaluation: "Evaluación",
  group: "Grupo",
  allEvaluations: "Todas",
  allGroups: "Todos",
  order: "Orden",
  oldest: "Más antiguos primero",
  newest: "Más recientes primero",
} as const;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type GradingQueueFiltersProps = {
  value: Filters
  evaluations: readonly FilterOption[]
  groups: readonly FilterOption[]
  onChange: (filters: Filters) => void
};

export function GradingQueueFilters({ value, evaluations, groups, onChange }: GradingQueueFiltersProps) {
  const evaluationId = useId();
  const groupId = useId();

  return (
    <div role="search" aria-label={FILTER_COPY.label} className={cx(styles.filters)}>
      <TextField
        id={evaluationId}
        select
        label={FILTER_COPY.evaluation}
        value={value.evaluationId}
        onChange={(event) => onChange({ ...value, evaluationId: event.target.value })}
        slotProps={NATIVE_SELECT}
        className={cx(styles.filterField)}
      >
        <option value={ALL_OPTION}>{FILTER_COPY.allEvaluations}</option>
        {evaluations.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </TextField>
      <TextField
        id={groupId}
        select
        label={FILTER_COPY.group}
        value={value.groupId}
        onChange={(event) => onChange({ ...value, groupId: event.target.value })}
        slotProps={NATIVE_SELECT}
        className={cx(styles.filterField)}
      >
        <option value={ALL_OPTION}>{FILTER_COPY.allGroups}</option>
        {groups.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </TextField>
      <ToggleButtonGroup
        exclusive
        size="small"
        aria-label={FILTER_COPY.order}
        value={value.sortOrder}
        onChange={(_event, next: GradingSortOrder | null) => {
          if (next) {
            onChange({ ...value, sortOrder: next });
          }
        }}
      >
        <ToggleButton value="asc">{FILTER_COPY.oldest}</ToggleButton>
        <ToggleButton value="desc">{FILTER_COPY.newest}</ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}

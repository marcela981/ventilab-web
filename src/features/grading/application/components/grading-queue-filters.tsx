/*
* Funcionalidad: GradingQueueFilters
* Descripción: Filter bar of the grading queue: evaluation, student group and student native selects ("Todas"/"Todos" by default) (the queue is always oldest first). Controlled: reports the whole filter object on every change; choosing another group clears the student. Depends on MUI, @shared/lib, the grading entities and CSS Module. v1.1 (G1 review W1): no sort order; the backend ignores sortOrder and always lists the oldest submissions first (evaluation-grading-prisma.repository orderBy submittedAt asc), so the toggle was a no-op and was removed (reported API gap). v1.2 (closure B2): student select (`studentId` of the queue), options from the page.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import TextField from "@mui/material/TextField";
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { ALL_OPTION } from "../entities/grading.entity";
import type { FilterOption, GradingQueueFilters as Filters } from "../entities/grading.entity";
import styles from "../../UI/grading.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const FILTER_COPY = {
  label: "Filtros de la cola de calificación",
  evaluation: "Evaluación",
  group: "Grupo",
  student: "Estudiante",
  allEvaluations: "Todas",
  allGroups: "Todos",
  allStudents: "Todos",
} as const;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type GradingQueueFiltersProps = {
  value: Filters
  evaluations: readonly FilterOption[]
  groups: readonly FilterOption[]
  students: readonly FilterOption[]
  onChange: (filters: Filters) => void
};

export function GradingQueueFilters({ value, evaluations, groups, students, onChange }: GradingQueueFiltersProps) {
  const evaluationId = useId();
  const groupId = useId();
  const studentId = useId();

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
        onChange={(event) => onChange({ ...value, groupId: event.target.value, studentId: ALL_OPTION })}
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
      <TextField
        id={studentId}
        select
        label={FILTER_COPY.student}
        value={value.studentId}
        onChange={(event) => onChange({ ...value, studentId: event.target.value })}
        slotProps={NATIVE_SELECT}
        className={cx(styles.filterField)}
      >
        <option value={ALL_OPTION}>{FILTER_COPY.allStudents}</option>
        {students.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </TextField>
      {/* No sort toggle: the backend ignores sortOrder and always lists the oldest submissions first (API gap). */}
    </div>
  );
}

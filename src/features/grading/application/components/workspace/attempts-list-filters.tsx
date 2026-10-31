/*
* Funcionalidad: AttemptsListFilters
* Descripción: Filters of the attempts list of the unified grading screen: the student group (groups of the evaluation assignments, "Todos los grupos" by default; `?group=`) and the attempt statuses as toggle chips (none selected = every status; `?status=A,B`). Depends on MUI, @shared/lib, the evaluation attempts entities and the grading CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import { cx } from "@shared/lib/class-names";
import { ATTEMPT_STATUSES, GRADING_ATTEMPT_STATUS_LABELS } from "../../entities/evaluation-attempts.entity";
import type { EvaluationAttemptsFilters, GradingAttemptStatus } from "../../entities/evaluation-attempts.entity";
import type { FilterOption } from "../../entities/grading.entity";
import { ALL_OPTION } from "../../entities/grading.entity";
import styles from "../../../UI/grading.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const ATTEMPTS_FILTERS_COPY = {
  group: "Grupo",
  allGroups: "Todos los grupos",
  statuses: "Estado del intento",
} as const;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type AttemptsListFiltersProps = {
  value: EvaluationAttemptsFilters
  groups: readonly FilterOption[]
  onChange: (next: EvaluationAttemptsFilters) => void
};

export function AttemptsListFilters({ value, groups, onChange }: AttemptsListFiltersProps) {
  const toggleStatus = (status: GradingAttemptStatus) => {
    const statuses = value.statuses.includes(status) ? value.statuses.filter((item) => item !== status) : [...value.statuses, status];

    onChange({ ...value, statuses });
  };

  return (
    <div className={cx(styles.attemptsFilters)}>
      {groups.length > 0 ? (
        <TextField
          select
          size="small"
          label={ATTEMPTS_FILTERS_COPY.group}
          value={value.groupId}
          onChange={(event) => onChange({ ...value, groupId: event.target.value })}
          slotProps={NATIVE_SELECT}
        >
          <option value={ALL_OPTION}>{ATTEMPTS_FILTERS_COPY.allGroups}</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
        </TextField>
      ) : null}
      <div className={cx(styles.statusChips)} role="group" aria-label={ATTEMPTS_FILTERS_COPY.statuses}>
        {ATTEMPT_STATUSES.map((status) => {
          const selected = value.statuses.includes(status);

          return (
            <Chip
              key={status}
              size="small"
              label={GRADING_ATTEMPT_STATUS_LABELS[status]}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              aria-pressed={selected}
              onClick={() => toggleStatus(status)}
            />
          );
        })}
      </div>
    </div>
  );
}

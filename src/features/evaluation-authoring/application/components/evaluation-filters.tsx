/*
* Funcionalidad: EvaluationFilters
* Descripción: Filter bar of the evaluation authoring list (role search "Filtros de evaluaciones"): title search (the page debounces it 300 ms before querying), type (all, exam, quiz, workshop), status (current = draft and ready, or one status, archived included) and module. The module select lists only the modules present on the loaded page and filters that page on the client, because `GET /api/evaluations` has no module filter (API gap); it is hidden when the page has no module. Depends on MUI, @shared/lib and the authoring entities and CSS Module.
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
import { ALL_MODULES, EVALUATION_STATUS_LABELS, EVALUATION_TYPE_LABELS } from "../entities/evaluation-authoring.entity";
import type { EvaluationListFilters, EvaluationStatusFilter, EvaluationTypeFilter } from "../entities/evaluation-authoring.entity";
import styles from "../../UI/authoring.module.css";

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const FILTER_COPY = {
  label: "Filtros de evaluaciones",
  search: "Buscar por título",
  type: "Tipo",
  status: "Estado",
  module: "Módulo",
  moduleHelp: "Filtra solo la página actual",
  allTypes: "Todos",
  currentStatus: "Borradores y listas",
  allModules: "Todos",
} as const;

const TYPE_OPTIONS: ReadonlyArray<[EvaluationTypeFilter, string]> = [
  ["all", FILTER_COPY.allTypes],
  ["EXAM", EVALUATION_TYPE_LABELS.EXAM],
  ["QUIZ", EVALUATION_TYPE_LABELS.QUIZ],
  ["WORKSHOP", EVALUATION_TYPE_LABELS.WORKSHOP],
];

const STATUS_OPTIONS: ReadonlyArray<[EvaluationStatusFilter, string]> = [
  ["current", FILTER_COPY.currentStatus],
  ["DRAFT", EVALUATION_STATUS_LABELS.DRAFT],
  ["READY", EVALUATION_STATUS_LABELS.READY],
  ["ARCHIVED", EVALUATION_STATUS_LABELS.ARCHIVED],
];

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type EvaluationFiltersProps = {
  value: EvaluationListFilters
  modules: readonly string[]
  onChange: (filters: EvaluationListFilters) => void
};

export function EvaluationFilters({ value, modules, onChange }: EvaluationFiltersProps) {
  const searchId = useId();
  const typeId = useId();
  const statusId = useId();
  const moduleId = useId();

  return (
    <div role="search" aria-label={FILTER_COPY.label} className={cx(styles.filters)}>
      <TextField
        id={searchId}
        type="search"
        label={FILTER_COPY.search}
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
        className={cx(styles.search)}
      />
      <TextField
        id={typeId}
        select
        label={FILTER_COPY.type}
        value={value.type}
        onChange={(event) => onChange({ ...value, type: event.target.value as EvaluationTypeFilter })}
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
        onChange={(event) => onChange({ ...value, status: event.target.value as EvaluationStatusFilter })}
        slotProps={NATIVE_SELECT}
      >
        {STATUS_OPTIONS.map(([option, label]) => (
          <option key={option} value={option}>
            {label}
          </option>
        ))}
      </TextField>
      {modules.length > 0 ? (
        <TextField
          id={moduleId}
          select
          label={FILTER_COPY.module}
          helperText={FILTER_COPY.moduleHelp}
          value={value.moduleId}
          onChange={(event) => onChange({ ...value, moduleId: event.target.value })}
          slotProps={NATIVE_SELECT}
        >
          <option value={ALL_MODULES}>{FILTER_COPY.allModules}</option>
          {modules.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </TextField>
      ) : null}
    </div>
  );
}

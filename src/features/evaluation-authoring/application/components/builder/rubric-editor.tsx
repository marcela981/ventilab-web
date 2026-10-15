/*
* Funcionalidad: RubricEditor
* Descripción: Rubric editor of a SIMULATION question in the evaluation builder, on the real backend schema: one row per criterion with the ventilator parameter (each parameter at most once), the expected value (number for tidalVolume, respiratoryRate, peep, fio2 and maxPressure; text for ventilationMode and iERatio), the optional min and max (numeric parameters only) and the priority (Crítico, Importante, Opcional; Opcional by default), plus the optional justification. Shows the Spanish rubric issues from the builder validation. Disabled while the structure is locked. Depends on MUI, the design-system FormField, @shared/lib, the simulation rubric entity, the builder copy and the simulation CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { BUILDER_COPY } from "../../entities/builder-copy";
import {
  addCriterionDraft,
  isNumericParameter,
  removeCriterionDraft,
  RUBRIC_PARAMETER_LABELS,
  RUBRIC_PARAMETERS,
  RUBRIC_PRIORITIES,
  RUBRIC_PRIORITY_LABELS,
  updateCriterionDraft,
} from "../../entities/simulation-rubric.entity";
import type { RubricDraft, RubricParameter, RubricPriority } from "../../entities/simulation-rubric.entity";
import styles from "../../../UI/simulation.module.css";

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type RubricEditorProps = {
  rubric: RubricDraft
  issues: readonly string[] | undefined
  disabled: boolean
  newKey: () => string
  onChange: (rubric: RubricDraft) => void
};

export function RubricEditor({ rubric, issues, disabled, newKey, onChange }: RubricEditorProps) {
  const used = new Set(rubric.criteria.map((criterion) => criterion.parameter));
  const canAdd = !disabled && rubric.criteria.length < RUBRIC_PARAMETERS.length;

  return (
    <fieldset className={cx(styles.group)}>
      <legend>{BUILDER_COPY.rubricTitle}</legend>
      <p className={cx(styles.pager)}>{rubric.criteria.length === 0 ? BUILDER_COPY.rubricEmpty : BUILDER_COPY.rubricHelp}</p>
      <ol className={cx(styles.criteria)}>
        {rubric.criteria.map((criterion, index) => {
          const position = index + 1;
          const numeric = criterion.parameter !== "" && isNumericParameter(criterion.parameter);
          const update = (changes: Parameters<typeof updateCriterionDraft>[2]) => onChange(updateCriterionDraft(rubric, criterion.key, changes));

          return (
            <li key={criterion.key} className={cx(styles.criterion)}>
              <FormField
                select
                label={BUILDER_COPY.rubricParameter(position)}
                value={criterion.parameter}
                disabled={disabled}
                size="small"
                className={cx(styles.parameterField)}
                onChange={(event) => update({ parameter: event.target.value as RubricParameter | "" })}
                slotProps={NATIVE_SELECT}
              >
                <option value="">{BUILDER_COPY.rubricChooseParameter}</option>
                {RUBRIC_PARAMETERS.map((parameter) => (
                  <option key={parameter} value={parameter} disabled={parameter !== criterion.parameter && used.has(parameter)}>
                    {RUBRIC_PARAMETER_LABELS[parameter]}
                  </option>
                ))}
              </FormField>
              <FormField
                label={BUILDER_COPY.rubricExpected(position)}
                value={criterion.expectedValue}
                disabled={disabled}
                size="small"
                inputMode={numeric ? "decimal" : "text"}
                className={cx(styles.valueField)}
                onChange={(event) => update({ expectedValue: event.target.value })}
              />
              {numeric ? (
                <>
                  <FormField
                    label={BUILDER_COPY.rubricMin(position)}
                    value={criterion.min}
                    disabled={disabled}
                    size="small"
                    inputMode="decimal"
                    className={cx(styles.valueField)}
                    onChange={(event) => update({ min: event.target.value })}
                  />
                  <FormField
                    label={BUILDER_COPY.rubricMax(position)}
                    value={criterion.max}
                    disabled={disabled}
                    size="small"
                    inputMode="decimal"
                    className={cx(styles.valueField)}
                    onChange={(event) => update({ max: event.target.value })}
                  />
                </>
              ) : null}
              <FormField
                select
                label={BUILDER_COPY.rubricPriority(position)}
                value={criterion.priority}
                disabled={disabled}
                size="small"
                className={cx(styles.priorityField)}
                onChange={(event) => update({ priority: event.target.value as RubricPriority })}
                slotProps={NATIVE_SELECT}
              >
                {RUBRIC_PRIORITIES.map((priority) => <option key={priority} value={priority}>{RUBRIC_PRIORITY_LABELS[priority]}</option>)}
              </FormField>
              <IconButton
                size="small"
                aria-label={BUILDER_COPY.rubricRemove(position)}
                disabled={disabled}
                onClick={() => onChange(removeCriterionDraft(rubric, criterion.key))}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </li>
          );
        })}
      </ol>
      <div>
        <Button size="small" startIcon={<AddIcon />} disabled={!canAdd} onClick={() => onChange(addCriterionDraft(rubric, newKey()))}>
          {BUILDER_COPY.rubricAdd}
        </Button>
      </div>
      <FormField
        label={BUILDER_COPY.rubricJustification}
        value={rubric.justification}
        disabled={disabled}
        multiline
        minRows={2}
        onChange={(event) => onChange({ ...rubric, justification: event.target.value })}
      />
      {issues && issues.length > 0 ? (
        <ul className={cx(styles.issues)} role="alert" aria-label={BUILDER_COPY.rubricIssues}>
          {issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      ) : null}
    </fieldset>
  );
}

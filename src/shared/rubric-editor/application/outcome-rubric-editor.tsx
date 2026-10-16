/*
* Funcionalidad: OutcomeRubricEditor
* Descripción: Controlled editor of the outcome rubric of a clinical case (`defaultRubric`): the AI assistance policy,
*   the passing score and an ordered list of criteria. Each criterion has its type (a type used by another criterion
*   is disabled), its weight in points, its threshold labelled with the unit of its type, the evaluation window only
*   for TIME_IN_RANGE and the penalty only for the safety limits and AI_ASSIST_USAGE, plus move up, move down and
*   remove actions; a new criterion takes the first unused type. The weight total is always shown, with a warning
*   when it differs from the backend total (100). The issues of `outcomeRubricDraftIssues` are shown on their fields
*   (rubric-level ones in an alert list) when `showIssues` is on. `value`/`onChange` keep the draft in the host;
*   `disabled` locks every control. Depends on MUI, the design-system FormField, @shared/lib, the outcome rubric
*   entity, the rubric editor copy and the rubric editor CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import {
  addOutcomeCriterion,
  criterionUsesPenalty,
  criterionUsesWindow,
  moveOutcomeCriterion,
  OUTCOME_ASSISTANCE_POLICIES,
  OUTCOME_CRITERION_LABELS,
  OUTCOME_CRITERION_TYPES,
  OUTCOME_POLICY_LABELS,
  OUTCOME_RUBRIC_TOTAL_WEIGHT,
  OUTCOME_THRESHOLD_LABELS,
  outcomeRubricDraftIssues,
  outcomeRubricIssueMessage,
  outcomeWeightTotal,
  removeOutcomeCriterion,
  updateOutcomeCriterion,
  weightTotalMatches,
} from "./outcome-rubric.entity";
import type {
  OutcomeAssistancePolicy,
  OutcomeCriterionDraft,
  OutcomeCriterionType,
  OutcomeRubricDraft,
  OutcomeRubricField,
  OutcomeRubricIssue,
} from "./outcome-rubric.entity";
import { OUTCOME_RUBRIC_COPY } from "./rubric-editor-copy";
import styles from "../UI/rubric-editor.module.css";

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;
const totalFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export type OutcomeRubricEditorProps = {
  value: OutcomeRubricDraft
  onChange: (value: OutcomeRubricDraft) => void
  /** Stable key of a new criterion (the host keeps it unique). */
  newKey: () => string
  disabled?: boolean | undefined
  /** Show the validation issues on their fields (default true); a host may wait for the first save attempt. */
  showIssues?: boolean | undefined
};

type KeyedIssue = OutcomeRubricIssue & { key: string | null };

function fieldError(issues: readonly KeyedIssue[], key: string | null, field: OutcomeRubricField, type?: OutcomeCriterionType): string | undefined {
  const issue = issues.find((candidate) => candidate.key === key && candidate.field === field);

  return issue ? outcomeRubricIssueMessage({ ...issue, index: null }, type) : undefined;
}

export function OutcomeRubricEditor({ value, onChange, newKey, disabled = false, showIssues = true }: OutcomeRubricEditorProps) {
  const issues: KeyedIssue[] = showIssues ? outcomeRubricDraftIssues(value) : [];
  const used = new Set(value.criteria.map((criterion) => criterion.type));
  const canAdd = !disabled && value.criteria.length < OUTCOME_CRITERION_TYPES.length;
  const total = outcomeWeightTotal(value);
  const totalOk = weightTotalMatches(total);
  const rubricLevel = issues.filter((issue) => issue.key === null && issue.field === "criteria");
  const last = value.criteria.length - 1;

  const update = (criterion: OutcomeCriterionDraft, changes: Partial<Omit<OutcomeCriterionDraft, "key">>) =>
    onChange(updateOutcomeCriterion(value, criterion.key, changes));

  return (
    <fieldset className={cx(styles.group)}>
      <legend>{OUTCOME_RUBRIC_COPY.title}</legend>
      <p className={cx(styles.pager)}>{value.criteria.length === 0 ? OUTCOME_RUBRIC_COPY.empty : OUTCOME_RUBRIC_COPY.help}</p>
      <div className={cx(styles.settings)}>
        <FormField
          select
          label={OUTCOME_RUBRIC_COPY.assistancePolicy}
          value={value.assistancePolicy}
          disabled={disabled}
          size="small"
          className={cx(styles.settingField)}
          error={fieldError(issues, null, "assistancePolicy")}
          onChange={(event) => onChange({ ...value, assistancePolicy: event.target.value as OutcomeAssistancePolicy })}
          slotProps={NATIVE_SELECT}
        >
          {OUTCOME_ASSISTANCE_POLICIES.map((policy) => <option key={policy} value={policy}>{OUTCOME_POLICY_LABELS[policy]}</option>)}
        </FormField>
        <FormField
          label={OUTCOME_RUBRIC_COPY.passingScore}
          value={value.passingScore}
          disabled={disabled}
          size="small"
          inputMode="decimal"
          className={cx(styles.settingField)}
          error={fieldError(issues, null, "passingScore")}
          onChange={(event) => onChange({ ...value, passingScore: event.target.value })}
        />
      </div>
      <ol className={cx(styles.criteria)} aria-label={OUTCOME_RUBRIC_COPY.criteria}>
        {value.criteria.map((criterion, index) => {
          const position = index + 1;
          const { key, type } = criterion;

          return (
            <li key={key} className={cx(styles.criterion)}>
              <FormField
                select
                label={OUTCOME_RUBRIC_COPY.type(position)}
                value={type}
                disabled={disabled}
                size="small"
                className={cx(styles.parameterField)}
                error={fieldError(issues, key, "type")}
                onChange={(event) => update(criterion, { type: event.target.value as OutcomeCriterionType })}
                slotProps={NATIVE_SELECT}
              >
                {OUTCOME_CRITERION_TYPES.map((candidate) => (
                  <option key={candidate} value={candidate} disabled={candidate !== type && used.has(candidate)}>
                    {OUTCOME_CRITERION_LABELS[candidate]}
                  </option>
                ))}
              </FormField>
              <FormField
                label={OUTCOME_RUBRIC_COPY.weight(position)}
                value={criterion.weight}
                disabled={disabled}
                size="small"
                inputMode="decimal"
                className={cx(styles.valueField)}
                error={fieldError(issues, key, "weight")}
                onChange={(event) => update(criterion, { weight: event.target.value })}
              />
              <FormField
                label={OUTCOME_RUBRIC_COPY.threshold(position, OUTCOME_THRESHOLD_LABELS[type])}
                value={criterion.threshold}
                disabled={disabled}
                size="small"
                inputMode="decimal"
                className={cx(styles.thresholdField)}
                error={fieldError(issues, key, "threshold", type)}
                onChange={(event) => update(criterion, { threshold: event.target.value })}
              />
              {criterionUsesWindow(type) ? (
                <FormField
                  label={OUTCOME_RUBRIC_COPY.windowMinutes(position)}
                  value={criterion.windowMinutes}
                  disabled={disabled}
                  size="small"
                  inputMode="decimal"
                  className={cx(styles.valueField)}
                  error={fieldError(issues, key, "windowMinutes")}
                  onChange={(event) => update(criterion, { windowMinutes: event.target.value })}
                />
              ) : null}
              {criterionUsesPenalty(type) ? (
                <FormField
                  label={OUTCOME_RUBRIC_COPY.penaltyPoints(position)}
                  value={criterion.penaltyPoints}
                  disabled={disabled}
                  size="small"
                  inputMode="decimal"
                  className={cx(styles.valueField)}
                  error={fieldError(issues, key, "penaltyPoints")}
                  onChange={(event) => update(criterion, { penaltyPoints: event.target.value })}
                />
              ) : null}
              <div className={cx(styles.actions)}>
                <IconButton
                  size="small"
                  aria-label={OUTCOME_RUBRIC_COPY.moveUp(position)}
                  disabled={disabled || index === 0}
                  onClick={() => onChange(moveOutcomeCriterion(value, key, -1))}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={OUTCOME_RUBRIC_COPY.moveDown(position)}
                  disabled={disabled || index === last}
                  onClick={() => onChange(moveOutcomeCriterion(value, key, 1))}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={OUTCOME_RUBRIC_COPY.remove(position)}
                  disabled={disabled}
                  onClick={() => onChange(removeOutcomeCriterion(value, key))}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ol>
      <div>
        <Button size="small" startIcon={<AddIcon />} disabled={!canAdd} onClick={() => onChange(addOutcomeCriterion(value, newKey()))}>
          {OUTCOME_RUBRIC_COPY.add}
        </Button>
      </div>
      <p className={cx(styles.total)} role="status">
        {OUTCOME_RUBRIC_COPY.weightTotal(totalFormat.format(total), OUTCOME_RUBRIC_TOTAL_WEIGHT)}
      </p>
      {value.criteria.length > 0 && !totalOk ? (
        <p className={cx(styles.total, styles.totalWarning)}>{OUTCOME_RUBRIC_COPY.weightTotalWarning(OUTCOME_RUBRIC_TOTAL_WEIGHT)}</p>
      ) : null}
      {rubricLevel.length > 0 ? (
        <ul className={cx(styles.issues)} role="alert" aria-label={OUTCOME_RUBRIC_COPY.issues}>
          {rubricLevel.map((issue) => <li key={issue.code}>{outcomeRubricIssueMessage(issue)}</li>)}
        </ul>
      ) : null}
    </fieldset>
  );
}

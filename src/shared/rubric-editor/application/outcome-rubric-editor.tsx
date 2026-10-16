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
*   v1.1 (review of 4134725): after a reorder the focus stays on the moved criterion (its arrow in the same direction,
*   or the other one at an edge); after a removal it goes to the next criterion, else the previous one, else the add
*   button; both are announced in a visually hidden `role="status"` region. A criterion with an unknown stored type is
*   shown as an invalid row ("Tipo desconocido: …" selected and disabled, error on the type) until a known type is
*   chosen, whatever `showIssues` says. A weight of 0 shows what it means for the grade, and a total that is not 100
*   shows at least 2 decimals (more when needed to see the difference).
*   v1.2 (review of b23709c): every announcement is a new node (nonce key), so an identical text is announced again;
*   a pending focus request is dropped when the host does not render the expected reordered or reduced list.
* Versión: 1.2
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
import { useEffect, useRef, useState } from "react";
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
  outcomeWeightZeroHint,
  removeOutcomeCriterion,
  updateOutcomeCriterion,
  usedOutcomeTypes,
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
const MAX_TOTAL_DIGITS = 6;

/** The weight total; when it is not 100, at least 2 decimals and as many more as needed to tell it from 100. */
function formatWeightTotal(total: number, ok: boolean): string {
  if (ok) {
    return totalFormat.format(total);
  }

  let formatted = "";

  for (let digits = 2; digits <= MAX_TOTAL_DIGITS; digits += 1) {
    const format = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: digits });

    formatted = format.format(total);

    if (formatted !== format.format(OUTCOME_RUBRIC_TOTAL_WEIGHT)) {
      return formatted;
    }
  }

  return formatted;
}

type CriterionAction = "up" | "down" | "remove";
/** `expected`: the list the host must render for the focus to move (identity of the value passed to onChange). */
type FocusTarget = ({ key: string, action: CriterionAction } | { key: null, action: "add" }) & { expected: OutcomeRubricDraft };

const OPPOSITE_ARROW: Readonly<Record<CriterionAction, CriterionAction>> = { up: "down", down: "up", remove: "remove" };

function criterionControl(list: HTMLOListElement | null, key: string, action: CriterionAction): HTMLButtonElement | null {
  const item = Array.from(list?.children ?? []).find((child) => child instanceof HTMLElement && child.dataset.criterionKey === key);
  const find = (candidate: CriterionAction) => item?.querySelector<HTMLButtonElement>(`[data-action="${candidate}"]`) ?? null;
  const preferred = find(action);

  return preferred && !preferred.disabled ? preferred : find(OPPOSITE_ARROW[action]);
}

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
  const listRef = useRef<HTMLOListElement | null>(null);
  const addRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);
  const [announcement, setAnnouncement] = useState<{ text: string, nonce: number }>({ text: "", nonce: 0 });
  const announce = (text: string) => setAnnouncement((current) => ({ text, nonce: current.nonce + 1 }));
  const issues: KeyedIssue[] = showIssues ? outcomeRubricDraftIssues(value) : [];
  const used = usedOutcomeTypes(value);
  const canAdd = !disabled && value.criteria.length < OUTCOME_CRITERION_TYPES.length;
  const total = outcomeWeightTotal(value);
  const totalOk = weightTotalMatches(total);
  const rubricLevel = issues.filter((issue) => issue.key === null && issue.field === "criteria");
  const last = value.criteria.length - 1;
  const count = value.criteria.length;

  // Restores the focus once the host renders the reordered or reduced list (the moved or removed row unmounts or
  // moves its focused button otherwise, and the focus falls back to the body).
  // The request is dropped when the host rendered something other than the expected list (it ignored or changed
  // the reorder/removal), so a stale request never steals the focus on a later edit.
  useEffect(() => {
    const target = pendingFocus.current;

    if (target === null) {
      return;
    }

    pendingFocus.current = null;

    if (target.expected !== value) {
      return;
    }

    if (target.key === null) {
      addRef.current?.focus();
    } else {
      criterionControl(listRef.current, target.key, target.action)?.focus();
    }
  }, [value]);

  const update = (criterion: OutcomeCriterionDraft, changes: Partial<Omit<OutcomeCriterionDraft, "key">>) =>
    onChange(updateOutcomeCriterion(value, criterion.key, changes));

  const move = (key: string, index: number, offset: -1 | 1) => {
    const next = moveOutcomeCriterion(value, key, offset);

    if (next === value) {
      return;
    }

    pendingFocus.current = { key, action: offset < 0 ? "up" : "down", expected: next };
    announce(OUTCOME_RUBRIC_COPY.moved(index + offset + 1, count));
    onChange(next);
  };

  const remove = (key: string, index: number) => {
    const neighbour = value.criteria[index + 1] ?? value.criteria[index - 1];
    const next = removeOutcomeCriterion(value, key);

    pendingFocus.current = neighbour ? { key: neighbour.key, action: "remove", expected: next } : { key: null, action: "add", expected: next };
    announce(neighbour ? OUTCOME_RUBRIC_COPY.removed(index + 1) : OUTCOME_RUBRIC_COPY.removedLast(index + 1));
    onChange(next);
  };

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
      <ol ref={listRef} className={cx(styles.criteria)} aria-label={OUTCOME_RUBRIC_COPY.criteria}>
        {value.criteria.map((criterion, index) => {
          const position = index + 1;
          const { key, type, unknownType } = criterion;
          const weightHint = outcomeWeightZeroHint(criterion);

          return (
            <li key={key} data-criterion-key={key} className={cx(styles.criterion, unknownType !== undefined && styles.criterionInvalid)}>
              <FormField
                select
                label={OUTCOME_RUBRIC_COPY.type(position)}
                value={unknownType === undefined ? type : ""}
                disabled={disabled}
                size="small"
                className={cx(styles.parameterField)}
                error={unknownType === undefined ? fieldError(issues, key, "type") : OUTCOME_RUBRIC_COPY.unknownTypeError(unknownType)}
                onChange={(event) => update(criterion, { type: event.target.value as OutcomeCriterionType })}
                slotProps={NATIVE_SELECT}
              >
                {unknownType === undefined ? null : <option value="" disabled>{OUTCOME_RUBRIC_COPY.unknownTypeOption(unknownType)}</option>}
                {OUTCOME_CRITERION_TYPES.map((candidate) => (
                  <option key={candidate} value={candidate} disabled={(unknownType !== undefined || candidate !== type) && used.has(candidate)}>
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
                helperText={weightHint ?? undefined}
                onChange={(event) => update(criterion, { weight: event.target.value })}
              />
              <FormField
                label={unknownType === undefined
                  ? OUTCOME_RUBRIC_COPY.threshold(position, OUTCOME_THRESHOLD_LABELS[type])
                  : OUTCOME_RUBRIC_COPY.unknownThreshold(position)}
                value={criterion.threshold}
                disabled={disabled}
                size="small"
                inputMode="decimal"
                className={cx(styles.thresholdField)}
                error={fieldError(issues, key, "threshold", unknownType === undefined ? type : undefined)}
                onChange={(event) => update(criterion, { threshold: event.target.value })}
              />
              {unknownType === undefined && criterionUsesWindow(type) ? (
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
              {unknownType === undefined && criterionUsesPenalty(type) ? (
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
                  data-action="up"
                  disabled={disabled || index === 0}
                  onClick={() => move(key, index, -1)}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={OUTCOME_RUBRIC_COPY.moveDown(position)}
                  data-action="down"
                  disabled={disabled || index === last}
                  onClick={() => move(key, index, 1)}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={OUTCOME_RUBRIC_COPY.remove(position)}
                  data-action="remove"
                  disabled={disabled}
                  onClick={() => remove(key, index)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ol>
      <div>
        <Button ref={addRef} size="small" startIcon={<AddIcon />} disabled={!canAdd} onClick={() => onChange(addOutcomeCriterion(value, newKey()))}>
          {OUTCOME_RUBRIC_COPY.add}
        </Button>
      </div>
      <p className={cx(styles.total)} role="status">
        {OUTCOME_RUBRIC_COPY.weightTotal(formatWeightTotal(total, totalOk || value.criteria.length === 0), OUTCOME_RUBRIC_TOTAL_WEIGHT)}
      </p>
      {value.criteria.length > 0 && !totalOk ? (
        <p className={cx(styles.total, styles.totalWarning)}>{OUTCOME_RUBRIC_COPY.weightTotalWarning(OUTCOME_RUBRIC_TOTAL_WEIGHT)}</p>
      ) : null}
      {rubricLevel.length > 0 ? (
        <ul className={cx(styles.issues)} role="alert" aria-label={OUTCOME_RUBRIC_COPY.issues}>
          {rubricLevel.map((issue) => <li key={issue.code}>{outcomeRubricIssueMessage(issue)}</li>)}
        </ul>
      ) : null}
      <p className={cx(styles.visuallyHidden)} role="status" aria-label={OUTCOME_RUBRIC_COPY.announcements}>
        {/* A new node per announcement: a screen reader re-reads identical text only when the content node changes. */}
        {announcement.text ? <span key={announcement.nonce} data-announcement={announcement.nonce}>{announcement.text}</span> : null}
      </p>
    </fieldset>
  );
}

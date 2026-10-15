/*
* Funcionalidad: AnswerGradingCard
* Descripción: One question of the grade-attempt page, with an anchor id for the navigator: title with position and points, a "Pendiente" chip while it needs manual grading, the student answer rendered by QuestionView of the evaluations feature in read-only mode, the correct options and the explanation (staff only), the automatic, manual and counting scores, the server rubric breakdown of a SIMULATION answer, and the grading fields: the score (0 to the question points, up to two decimals) and the comment for the student (required when the answer already has an automatic or manual score). Field errors come from the client validation or from the backend 422 codes mapped by the page; other failures of its save show as an alert on the card. Depends on MUI, the evaluations barrel, the design-system FormField, @shared/lib, the grading components, copy and entities and the grade-attempt CSS Module. v1.1 (G2 review W1/S4): a score change that needs a comment starts an empty override comment (applyScoreChange) with the previous teacher comment shown read-only above the field, and a comment-only edit of an automatic score shows that saving records an equal manual score counted as an override.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import { QuestionView } from "@features/evaluations";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { formatPoints, GRADE_COPY } from "../../entities/grade-attempt-copy";
import {
  applyScoreChange,
  isCommentOnlyOverride,
  isScoreChanged,
  MAX_TEACHER_COMMENT_LENGTH,
  requiresComment,
} from "../../entities/grading-attempt.entity";
import type { GradeDraft, GradeDraftErrors, GradingItem } from "../../entities/grading-attempt.entity";
import { RubricBreakdownTable } from "./rubric-breakdown-table";
import styles from "../../../UI/grade-attempt.module.css";

const CHOICE_TYPES = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]);

export function gradingAnchorId(questionId: string): string {
  return `grade-question-${questionId}`;
}

export type AnswerGradingCardProps = {
  item: GradingItem
  draft: GradeDraft
  errors: GradeDraftErrors
  dirty: boolean
  disabled: boolean
  onChange: (draft: GradeDraft) => void
};

function noop() {}

function ScoreLine({ item }: { item: GradingItem }) {
  const parts = [
    item.autoScore !== null ? GRADE_COPY.autoScore(formatPoints(item.autoScore)) : null,
    item.manualScore !== null ? GRADE_COPY.manualScore(formatPoints(item.manualScore)) : null,
    item.earnedScore !== null ? GRADE_COPY.earnedScore(formatPoints(item.earnedScore)) : null,
  ].filter((part): part is string => part !== null);

  return <p className={cx(styles.scoreLine)}>{parts.length > 0 ? parts.join(" · ") : GRADE_COPY.noScore}</p>;
}

function CorrectAnswer({ item }: { item: GradingItem }) {
  if (!CHOICE_TYPES.has(item.question.type) || item.correctOptionIds.length === 0) {
    return null;
  }

  const correct = item.question.options.filter((option) => item.correctOptionIds.includes(option.id));

  return (
    <div className={cx(styles.reference)}>
      <h4 className={cx(styles.subheading)}>{GRADE_COPY.correctAnswer}</h4>
      <ul className={cx(styles.correctList)}>
        {correct.map((option) => <li key={option.id}>{option.content}</li>)}
      </ul>
    </div>
  );
}

export function AnswerGradingCard({ item, draft, errors, dirty, disabled, onChange }: AnswerGradingCardProps) {
  const { question } = item;
  const points = formatPoints(question.points);
  const commentRequired = requiresComment(item);
  const overriding = commentRequired && isScoreChanged(item, draft);
  const commentOnlyOverride = isCommentOnlyOverride(item, draft);
  const previousComment = item.teacherComment?.trim() ? item.teacherComment : null;
  const commentHint = overriding
    ? GRADE_COPY.overrideCommentHint
    : commentRequired ? GRADE_COPY.commentRequiredHint : GRADE_COPY.commentOptionalHint;

  return (
    <article id={gradingAnchorId(question.id)} className={cx(styles.card, dirty && styles.cardDirty)} aria-labelledby={`${gradingAnchorId(question.id)}-title`}>
      <header className={cx(styles.cardHeader)}>
        <h3 id={`${gradingAnchorId(question.id)}-title`} className={cx(styles.cardTitle)}>
          {GRADE_COPY.questionTitle(question.position, points)}
        </h3>
        {item.pending ? <Chip size="small" color="warning" label={GRADE_COPY.pendingChip} /> : null}
      </header>
      {item.answer === null ? <p className={cx(styles.muted)}>{GRADE_COPY.notAnswered}</p> : null}
      <QuestionView question={question} answer={item.answer} onChange={noop} readOnly />
      <CorrectAnswer item={item} />
      {item.explanation ? (
        <div className={cx(styles.reference)}>
          <h4 className={cx(styles.subheading)}>{GRADE_COPY.explanation}</h4>
          <p className={cx(styles.explanation)}>{item.explanation}</p>
        </div>
      ) : null}
      {question.type === "SIMULATION" && item.practicalScore ? <RubricBreakdownTable practical={item.practicalScore} /> : null}
      <ScoreLine item={item} />
      <div className={cx(styles.gradeFields)}>
        <FormField
          label={GRADE_COPY.scoreField(points)}
          value={draft.score}
          error={errors.score}
          helperText={GRADE_COPY.scoreHint}
          disabled={disabled}
          className={cx(styles.scoreField)}
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
          onChange={(event) => onChange(applyScoreChange(item, draft, event.target.value))}
        />
        {previousComment ? (
          <div className={cx(styles.previousComment)}>
            <h4 className={cx(styles.subheading)}>{GRADE_COPY.previousComment}</h4>
            <p className={cx(styles.explanation)}>{previousComment}</p>
          </div>
        ) : null}
        <FormField
          label={GRADE_COPY.commentField}
          value={draft.comment}
          error={errors.comment}
          helperText={commentHint}
          required={commentRequired}
          disabled={disabled}
          multiline
          minRows={2}
          className={cx(styles.commentField)}
          slotProps={{ htmlInput: { maxLength: MAX_TEACHER_COMMENT_LENGTH } }}
          onChange={(event) => onChange({ ...draft, comment: event.target.value })}
        />
      </div>
      {commentOnlyOverride ? <Alert severity="info">{GRADE_COPY.commentOnlyOverrideHint}</Alert> : null}
      {errors.general ? <Alert severity="error">{errors.general}</Alert> : null}
    </article>
  );
}

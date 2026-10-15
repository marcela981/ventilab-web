/*
* Funcionalidad: GradingFeedbackPanel
* Descripción: AI feedback of an attempt as the staff sees it: one entry for the overall feedback and one per question (by position), each with its status (Generando…, Lista, Falló), its source, provider, model and update time, and its text when ready. Offers "Regenerar retroalimentación IA", enabled only for a GRADED attempt (the backend answers 409 otherwise), and a reload when the polling of a pending feedback gave up. Loading, error and empty states. Depends on MUI, the design-system AsyncButton, @shared/lib, the grading copy and entities and the grade-attempt CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { FEEDBACK_SOURCE_LABELS, FEEDBACK_STATUS_LABELS, GRADE_COPY } from "../../entities/grade-attempt-copy";
import type { FeedbackItem, FeedbackStatus, GradingFeedback } from "../../entities/grading-attempt.entity";
import styles from "../../../UI/grade-attempt.module.css";

const STATUS_CLASS: Record<FeedbackStatus, string | undefined> = {
  PENDING: styles.feedbackPending,
  READY: styles.feedbackReady,
  FAILED: styles.feedbackFailed,
};

export type GradingFeedbackPanelProps = {
  feedback: GradingFeedback | null
  loadFailed: boolean
  pollingStopped: boolean
  // Question id -> position in the attempt.
  positions: ReadonlyMap<string, number>
  canRegenerate: boolean
  regenerating: boolean
  onRegenerate: () => Promise<void>
  onReload: () => void
};

function FeedbackEntry({ title, item }: { title: string, item: FeedbackItem }) {
  const meta = [
    item.source ? FEEDBACK_SOURCE_LABELS[item.source] : null,
    item.provider && item.model ? GRADE_COPY.feedbackMeta(item.provider, item.model, formatDateTime(item.updatedAt)) : GRADE_COPY.feedbackUpdated(formatDateTime(item.updatedAt)),
  ].filter((part): part is string => part !== null);

  return (
    <li className={cx(styles.feedbackItem)}>
      <div className={cx(styles.feedbackHeader)}>
        <span className={cx(styles.feedbackTitle)}>{title}</span>
        <span className={cx(styles.feedbackStatus, STATUS_CLASS[item.status])}>{FEEDBACK_STATUS_LABELS[item.status]}</span>
      </div>
      <p className={cx(styles.muted)}>{meta.join(" · ")}</p>
      {item.status === "READY" && item.content ? <p className={cx(styles.feedbackContent)}>{item.content}</p> : null}
    </li>
  );
}

export function GradingFeedbackPanel({
  feedback,
  loadFailed,
  pollingStopped,
  positions,
  canRegenerate,
  regenerating,
  onRegenerate,
  onReload,
}: GradingFeedbackPanelProps) {
  const renderBody = () => {
    if (!feedback) {
      return loadFailed ? <Alert severity="error">{GRADE_COPY.feedbackError}</Alert> : null;
    }

    if (!feedback.overall && feedback.questions.length === 0) {
      return <p className={cx(styles.muted)}>{GRADE_COPY.feedbackEmpty}</p>;
    }

    return (
      <ul className={cx(styles.feedbackList)}>
        {feedback.overall ? <FeedbackEntry title={GRADE_COPY.feedbackOverall} item={feedback.overall} /> : null}
        {feedback.questions.map((item) => (
          <FeedbackEntry
            key={item.id}
            title={GRADE_COPY.feedbackQuestion(item.questionId ? positions.get(item.questionId) ?? null : null)}
            item={item}
          />
        ))}
      </ul>
    );
  };

  return (
    <section className={cx(styles.panel)} aria-labelledby="grading-feedback-title">
      <div className={cx(styles.panelHeader)}>
        <h2 id="grading-feedback-title" className={cx(styles.panelTitle)}>{GRADE_COPY.feedbackTitle}</h2>
        <AsyncButton variant="outlined" size="small" disabled={!canRegenerate} loading={regenerating} onClick={onRegenerate}>
          {GRADE_COPY.regenerate}
        </AsyncButton>
      </div>
      {!canRegenerate ? <p className={cx(styles.muted)}>{GRADE_COPY.regenerateNeedsGraded}</p> : null}
      {renderBody()}
      {pollingStopped ? (
        <Alert severity="info" action={<Button color="inherit" size="small" onClick={onReload}>{GRADE_COPY.feedbackReload}</Button>}>
          {GRADE_COPY.feedbackPollingStopped}
        </Alert>
      ) : null}
    </section>
  );
}

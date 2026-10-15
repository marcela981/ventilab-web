/*
* Funcionalidad: FeedbackBlock
* Descripción: AI feedback of one question or of the whole attempt on the result page, by status: PENDING shows a labelled skeleton ("Generando retroalimentación…"), READY renders the content as rich text (markdown through RichTextView) with the shared "¿Te fue útil?" widget (ai-ratings GRADE_FEEDBACK target = feedback item id) and, for DETERMINISTIC items, the discreet label "Retroalimentación automática"; FAILED shows a discreet message. Renders nothing without an item. Depends on MUI Skeleton, @shared/ai-rating, the RichTextView, the attempt feedback entities and the attempt result CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Skeleton from "@mui/material/Skeleton";
import { AiRatingWidget } from "@shared/ai-rating";
import { cx } from "@shared/lib/class-names";
import type { FeedbackItem } from "../../entities/attempt-feedback";
import { RichTextView } from "../rich-text-view";
import styles from "../../../UI/attempt-result.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const FEEDBACK_COPY = {
  generating: "Generando retroalimentación…",
  failed: "No fue posible generar la retroalimentación de esta pregunta.",
  deterministic: "Retroalimentación automática",
} as const;

export type FeedbackBlockProps = {
  item: FeedbackItem | null
  title: string
};

export function FeedbackBlock({ item, title }: FeedbackBlockProps) {
  if (!item) {
    return null;
  }

  if (item.status === "PENDING") {
    return (
      <div className={cx(styles.feedback)} role="status" aria-busy="true" aria-label={`${title}: ${FEEDBACK_COPY.generating}`}>
        <p className={cx(styles.feedbackHint)}>{FEEDBACK_COPY.generating}</p>
        <Skeleton variant="text" width="90%" aria-hidden="true" />
        <Skeleton variant="text" width="70%" aria-hidden="true" />
      </div>
    );
  }

  if (item.status === "FAILED") {
    return <p className={cx(styles.feedbackHint)}>{FEEDBACK_COPY.failed}</p>;
  }

  return (
    <section className={cx(styles.feedback)} aria-label={title}>
      <div className={cx(styles.feedbackHeader)}>
        <h3 className={cx(styles.feedbackTitle)}>{title}</h3>
        {item.source === "DETERMINISTIC" ? <span className={cx(styles.feedbackSource)}>{FEEDBACK_COPY.deterministic}</span> : null}
      </div>
      <RichTextView value={item.content ? { kind: "text", text: item.content } : null} />
      <AiRatingWidget key={item.id} targetType="GRADE_FEEDBACK" targetId={item.id} />
    </section>
  );
}

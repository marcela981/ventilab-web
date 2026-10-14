/*
* Funcionalidad: TutorAnswer
* Descripción: One AI tutor answer bubble shared by the Profundizar and Preguntas panels: the markdown text rendered progressively with the shared RichContent (lazy markdown/KaTeX renderers), a "Pensando…" hint while the stream has not sent text yet, a note when the answer was stopped or saved incomplete, and the shared "¿Te fue útil?" widget (ai-ratings MESSAGE target = assistant message id) once the answer is complete. `initialRating` null skips loading a previous rating (fresh answers); undefined loads it (history). Depends on @shared/rich-content, @shared/ai-rating and the tutor CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { AiRatingWidget } from "@shared/ai-rating";
import { cx } from "@shared/lib/class-names";
import { RichContent } from "@shared/rich-content/rich-content";
import styles from "../../../UI/tutor-panel.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
export const TUTOR_ANSWER_COPY = {
  thinking: "Pensando…",
  stopped: "Respuesta detenida. Solo se muestra la parte recibida.",
  incomplete: "Respuesta incompleta: se interrumpió antes de terminar.",
} as const;

export type TutorAnswerProps = {
  text: string
  isStreaming?: boolean
  // "stopped" after Detener in this session, "incomplete" for a history message saved partially.
  interruption?: "stopped" | "incomplete" | null
  // Assistant message id to rate; null hides the widget.
  ratingTargetId?: string | null
  initialRating?: null
};

export function TutorAnswer({ text, isStreaming = false, interruption = null, ratingTargetId = null, initialRating }: TutorAnswerProps) {
  return (
    <div className={cx(styles.bubble, styles.assistantBubble)} aria-busy={isStreaming}>
      {text === "" && isStreaming
        ? <p className={cx(styles.thinking)} role="status">{TUTOR_ANSWER_COPY.thinking}</p>
        : <RichContent content={text} emptyLabel="" />}
      {interruption ? <p className={cx(styles.note)}>{TUTOR_ANSWER_COPY[interruption]}</p> : null}
      {ratingTargetId ? (
        <AiRatingWidget
          key={ratingTargetId}
          targetType="MESSAGE"
          targetId={ratingTargetId}
          {...(initialRating === undefined ? {} : { initialRating })}
        />
      ) : null}
    </div>
  );
}

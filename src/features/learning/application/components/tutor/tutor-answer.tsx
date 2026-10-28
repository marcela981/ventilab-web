/*
* Funcionalidad: TutorAnswer
* Descripción: One AI tutor answer bubble shared by the Profundizar and Preguntas panels, composed from the shared @shared/ai-conversation pieces. A `live` answer (the one being streamed in this session) is a StreamingMessage: "Pensando…" while the stream has not sent text yet, the markdown as it grows and a visually hidden aria-live region that announces it by fragments. A saved answer (history, or an earlier turn of this session) uses the same StreamingMessage without its live region, so it is not announced again. Both carry in their footer a note when the answer was stopped or saved incomplete and the shared "¿Te fue útil?" widget (ai-ratings MESSAGE target = assistant message id) once the answer is complete. `initialRating` null skips loading a previous rating (fresh answers); undefined loads it (history). Depends on @shared/ai-conversation, @shared/ai-rating and the tutor CSS Module. v1.1 (S2 ai-chat): bubbles, typing hint and markdown come from @shared/ai-conversation; same copy and rating placement. v1.2 (S2 review R3): live and saved answers share one element tree (StreamingMessage with `announce`), so a turn that stops being live keeps its mounted rating widget and the rating given in this session. v1.3 (W7, Bloque 2): the rating carries the surface and scope of the answer (ratingSurface, ratingScope) and the waiting hint is configurable (typingLabel, "Consultando IA…" in the deepen accordion).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { StreamingMessage } from "@shared/ai-conversation/application/streaming-message";
import { AiRatingWidget } from "@shared/ai-rating";
import type { AiRatingScope, AiRatingSurface } from "@shared/ai-rating";
import { cx } from "@shared/lib/class-names";
import styles from "../../../UI/tutor-panel.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
export const TUTOR_ANSWER_COPY = {
  thinking: "Pensando…",
  stopped: "Respuesta detenida. Solo se muestra la parte recibida.",
  incomplete: "Respuesta incompleta: se interrumpió antes de terminar.",
} as const;

export type TutorAnswerProps = {
  text: string
  // The answer streamed in this session (announced to screen readers); false for saved history messages.
  live?: boolean
  isStreaming?: boolean
  // "stopped" after Detener in this session, "incomplete" for a history message saved partially.
  interruption?: "stopped" | "incomplete" | null
  // Assistant message id to rate; null hides the widget.
  ratingTargetId?: string | null
  initialRating?: null
  // Surface and scope sent with the rating (thesis analytics).
  ratingSurface?: AiRatingSurface | undefined
  ratingScope?: AiRatingScope | undefined
  // Hint shown while no text has arrived; defaults to "Pensando…".
  typingLabel?: string | undefined
};

export function TutorAnswer({
  text,
  live = false,
  isStreaming = false,
  interruption = null,
  ratingTargetId = null,
  initialRating,
  ratingSurface,
  ratingScope,
  typingLabel = TUTOR_ANSWER_COPY.thinking,
}: TutorAnswerProps) {
  const footer = interruption || ratingTargetId ? (
    <>
      {interruption ? <p className={cx(styles.note)}>{TUTOR_ANSWER_COPY[interruption]}</p> : null}
      {ratingTargetId ? (
        <AiRatingWidget
          key={ratingTargetId}
          targetType="MESSAGE"
          targetId={ratingTargetId}
          surface={ratingSurface}
          scope={ratingScope}
          {...(initialRating === undefined ? {} : { initialRating })}
        />
      ) : null}
    </>
  ) : undefined;

  // One element tree for live and saved answers: when a turn leaves the live state only its live region goes away,
  // so the rating widget in the footer keeps its state (a rating given in this session stays selected).
  return (
    <StreamingMessage
      text={text}
      isStreaming={isStreaming}
      announce={live}
      typingLabel={typingLabel}
      {...(footer === undefined ? {} : { footer })}
    />
  );
}

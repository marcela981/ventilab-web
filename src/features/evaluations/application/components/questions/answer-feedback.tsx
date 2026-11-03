/*
* Funcionalidad: AnswerFeedback
* Descripción: Immediate feedback of one QUIZ or WORKSHOP choice question (DISENO_BLOQUE3 §2.2, §2.12). An aria-live="polite" region that is always rendered (so the screen reader announces the verdict when it appears) and, once the server revealed the answer, shows the July verdict (QUIZ "¡Correcto! 🎉" / `Casi. La respuesta correcta era "{x}"`; WORKSHOP "¡Muy bien! 🌟" / `La respuesta correcta era "{x}".`) and the explanation (in a WORKSHOP, the July generic text when the teacher wrote none). Only paints what the server sent. Depends on the attempt layout rules and the questions CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { revealMessage } from "../../entities/attempt-layout";
import type { AnswerReveal, AttemptQuestion } from "../../entities/evaluation.entity";
import styles from "../../../UI/questions.module.css";

export type AnswerFeedbackProps = {
  kind: "quiz" | "workshop"
  question: AttemptQuestion
  reveal: AnswerReveal | null
};

export function AnswerFeedback({ kind, question, reveal }: AnswerFeedbackProps) {
  const message = reveal ? revealMessage(kind, question, reveal) : null;

  return (
    <div role="status" aria-live="polite" className={cx(styles.feedbackLive)}>
      {message ? (
        <div className={cx(styles.feedbackBox, message.correct ? styles.feedbackCorrect : styles.feedbackWrong)}>
          <p className={cx(styles.feedbackVerdict)}>{message.verdict}</p>
          {message.explanation ? <p className={cx(styles.feedbackExplanation)}>{message.explanation}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

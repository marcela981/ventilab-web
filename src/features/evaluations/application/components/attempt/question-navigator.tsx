/*
* Funcionalidad: QuestionNavigator
* Descripción: Navigator of the attempt player: one numbered button per question with its state (answered, unanswered, marked for review) as text for screen readers and as a class for the colors, the current question marked with aria-current, and a counter of answered questions. On mobile the list collapses behind a toggle button (aria-expanded); on wide screens it is always visible. Depends on MUI Button, the attempt-progress entity and the attempt player CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import { useId, useState } from "react";
import { cx } from "@shared/lib/class-names";
import type { AnswerMap } from "../../entities/attempt-progress";
import { isAnswered } from "../../entities/attempt-progress";
import type { AttemptQuestion } from "../../entities/evaluation.entity";
import styles from "../../../UI/attempt-player.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const NAVIGATOR_COPY = {
  label: "Navegación de preguntas",
  toggle: (answered: number, total: number) => `Preguntas (${answered} de ${total} respondidas)`,
  item: (position: number, answered: boolean, marked: boolean) =>
    `Pregunta ${position}, ${answered ? "respondida" : "sin responder"}${marked ? ", marcada para revisión" : ""}`,
  legendAnswered: "Respondida",
  legendUnanswered: "Sin responder",
  legendMarked: "Marcada para revisión",
} as const;

export type QuestionNavigatorProps = {
  questions: readonly AttemptQuestion[]
  answers: AnswerMap
  marked: ReadonlySet<string>
  currentIndex: number
  onSelect: (index: number) => void
};

export function QuestionNavigator({ questions, answers, marked, currentIndex, onSelect }: QuestionNavigatorProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const answeredCount = questions.filter((question) => isAnswered(question.type, answers[question.id])).length;

  return (
    <nav className={cx(styles.navigator)} aria-label={NAVIGATOR_COPY.label}>
      <Button
        className={cx(styles.navigatorToggle)}
        variant="outlined"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((value) => !value)}
      >
        {NAVIGATOR_COPY.toggle(answeredCount, questions.length)}
      </Button>
      <div id={listId} className={cx(styles.navigatorPanel, !expanded && styles.navigatorPanelCollapsed)}>
        <p className={cx(styles.navigatorCount)}>{NAVIGATOR_COPY.toggle(answeredCount, questions.length)}</p>
        <ol className={cx(styles.navigatorList)}>
          {questions.map((question, index) => {
            const answered = isAnswered(question.type, answers[question.id]);
            const isMarked = marked.has(question.id);
            const current = index === currentIndex;

            return (
              <li key={question.id}>
                <button
                  type="button"
                  className={cx(
                    styles.navigatorItem,
                    answered && styles.navigatorItemAnswered,
                    isMarked && styles.navigatorItemMarked,
                    current && styles.navigatorItemCurrent,
                  )}
                  aria-label={NAVIGATOR_COPY.item(index + 1, answered, isMarked)}
                  aria-current={current ? "step" : undefined}
                  onClick={() => {
                    onSelect(index);
                    setExpanded(false);
                  }}
                >
                  {index + 1}
                </button>
              </li>
            );
          })}
        </ol>
        <ul className={cx(styles.navigatorLegend)}>
          <li><span className={cx(styles.legendSwatch, styles.navigatorItemAnswered)} aria-hidden="true" />{NAVIGATOR_COPY.legendAnswered}</li>
          <li><span className={cx(styles.legendSwatch)} aria-hidden="true" />{NAVIGATOR_COPY.legendUnanswered}</li>
          <li><span className={cx(styles.legendSwatch, styles.navigatorItemMarked)} aria-hidden="true" />{NAVIGATOR_COPY.legendMarked}</li>
        </ul>
      </div>
    </nav>
  );
}

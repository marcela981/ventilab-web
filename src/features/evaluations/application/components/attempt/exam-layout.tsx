/*
* Funcionalidad: ExamLayout
* Descripción: EXAM body of the attempt player (and any SIMULATION question it holds, unchanged): the question navigator (answered, unanswered, marked for review), the sticky clinical scenario of the current question, one question at a time (AttemptQuestionBlock with the "Marcar para revisión" toggle) and Anterior/Siguiente. No immediate feedback. The focus moves to the question heading when the question changes and Alt+←/→ change the question outside text fields (useQuestionPager). The submit button lives in the player header. Depends on MUI, the attempt components, the attempt progress rules, useQuestionPager and the attempt player CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import Button from "@mui/material/Button";
import { cx } from "@shared/lib/class-names";
import { clampQuestionIndex, findScenario } from "../../entities/attempt-progress";
import { useQuestionPager } from "../../hooks/use-question-pager";
import type { AttemptLayoutProps } from "./attempt-question-block";
import { AttemptQuestionBlock } from "./attempt-question-block";
import { QuestionNavigator } from "./question-navigator";
import { ScenarioPanel } from "./scenario-panel";
import styles from "../../../UI/attempt-player.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const PAGER_COPY = {
  mark: "Marcar para revisión",
  unmark: "Quitar marca de revisión",
  previous: "Anterior",
  next: "Siguiente",
  emptyAttempt: "Este intento no tiene preguntas.",
} as const;

export function ExamLayout(props: AttemptLayoutProps) {
  const { attempt, answers, index, onIndexChange, marked, onToggleMarked, timeUp } = props;
  const { questions } = attempt;
  const total = questions.length;
  const headingRef = useQuestionPager({ index, total, onIndexChange });
  const question = questions[index];
  const scenario = findScenario(attempt.scenarios, question);
  const isMarked = question ? marked.has(question.id) : false;

  return (
    <div className={cx(styles.body)}>
      <QuestionNavigator
        questions={questions}
        answers={answers}
        marked={marked}
        currentIndex={index}
        onSelect={(next) => onIndexChange(clampQuestionIndex(next, total))}
      />
      <div className={cx(styles.content, scenario && styles.contentWithScenario)}>
        {scenario ? <ScenarioPanel scenario={scenario} /> : null}
        {question ? (
          <>
            <AttemptQuestionBlock
              {...props}
              kind="exam"
              question={question}
              position={index + 1}
              total={total}
              headingRef={headingRef}
              headerExtra={(
                <Button
                  variant="text"
                  size="small"
                  aria-pressed={isMarked}
                  disabled={timeUp}
                  startIcon={isMarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  onClick={() => onToggleMarked(question.id)}
                >
                  {isMarked ? PAGER_COPY.unmark : PAGER_COPY.mark}
                </Button>
              )}
            />
            <div className={cx(styles.pager)}>
              <Button variant="outlined" disabled={index === 0} onClick={() => onIndexChange(index - 1)}>
                {PAGER_COPY.previous}
              </Button>
              <Button variant="outlined" disabled={index >= total - 1} onClick={() => onIndexChange(index + 1)}>
                {PAGER_COPY.next}
              </Button>
            </div>
          </>
        ) : (
          <p>{PAGER_COPY.emptyAttempt}</p>
        )}
      </div>
    </div>
  );
}

/*
* Funcionalidad: AttemptQuestionBlock
* Descripción: One question of the attempt player, shared by the three layouts (QUIZ, WORKSHOP, EXAM): the question card with its h2 heading (focusable with tabIndex -1 so the paginated layouts move the focus to it when the question changes), the points, an optional extra header control (the EXAM review mark), the WORKSHOP hint (HintToggle, hidden once answered), the QuestionView (read-only while checking, once revealed or locked, or when the attempt is read-only), "Comprobar respuesta" for the immediate-feedback questions that are not checked on select (multiple choice, or a single choice whose check failed), the AnswerFeedback live region and the autosave status. Also AttemptLayoutProps, the contract between the player and its layouts. Depends on React, MUI Button, the attempt layout rules, the question components, the save status indicator and the attempt player CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import type { ReactNode, Ref } from "react";
import { cx } from "@shared/lib/class-names";
import type { AnswerMap } from "../../entities/attempt-progress";
import { isAnswered } from "../../entities/attempt-progress";
import type { AttemptLayoutKind } from "../../entities/attempt-layout";
import { checksOnSelect, FEEDBACK_COPY, hasImmediateFeedback } from "../../entities/attempt-layout";
import type { AutosaveStatus } from "../../entities/autosave-queue";
import type { AnswerReveal, AttemptAnswer, AttemptDetail, AttemptQuestion } from "../../entities/evaluation.entity";
import { AnswerFeedback } from "../questions/answer-feedback";
import { HintToggle } from "../questions/hint-toggle";
import { QuestionView } from "../questions/question-view";
import { SaveStatusIndicator } from "./save-status-indicator";
import styles from "../../../UI/attempt-player.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const QUESTION_BLOCK_COPY = {
  questionPosition: (position: number, total: number) => `Pregunta ${position} de ${total}`,
  points: (points: number) => `${points} ${points === 1 ? "punto" : "puntos"}`,
} as const;

export type AttemptLayoutProps = {
  attempt: AttemptDetail
  answers: AnswerMap
  index: number
  onIndexChange: (index: number) => void
  marked: ReadonlySet<string>
  onToggleMarked: (questionId: string) => void
  readOnly: boolean
  timeUp: boolean
  saveStatuses: Readonly<Record<string, AutosaveStatus>>
  reveals: Readonly<Record<string, AnswerReveal>>
  locked: ReadonlySet<string>
  checking: ReadonlySet<string>
  // Immediate-feedback questions the server refused to check (422): they fall back to the autosave.
  uncheckable: ReadonlySet<string>
  onChange: (question: AttemptQuestion, answer: AttemptAnswer) => void
  onCheck: (question: AttemptQuestion) => void
  submitButton: ReactNode
};

export type AttemptQuestionBlockProps = Pick<AttemptLayoutProps, "attempt" | "answers" | "readOnly" | "saveStatuses" | "reveals" | "locked" | "checking" | "uncheckable" | "onChange" | "onCheck"> & {
  kind: AttemptLayoutKind
  question: AttemptQuestion
  position: number
  total: number
  headingRef?: Ref<HTMLHeadingElement> | undefined
  headerExtra?: ReactNode
};

export function AttemptQuestionBlock({ headingRef, headerExtra, ...props }: AttemptQuestionBlockProps) {
  const { attempt, kind, question, position, total, answers, readOnly, saveStatuses, reveals, locked, checking, uncheckable, onChange, onCheck } = props;
  const immediate = hasImmediateFeedback(attempt.evaluation.type, question) && !uncheckable.has(question.id);
  const reveal = reveals[question.id] ?? null;
  const isLocked = reveal !== null || locked.has(question.id);
  const isChecking = checking.has(question.id);
  const answer = answers[question.id] ?? null;
  const answered = isAnswered(question.type, answer);
  const showCheck = immediate && !isLocked && !isChecking && (!checksOnSelect(question) || answered);
  const heading = QUESTION_BLOCK_COPY.questionPosition(position, total);

  return (
    <section className={cx(styles.questionCard)} aria-label={heading}>
      <div className={cx(styles.questionHeader)}>
        <h2 ref={headingRef} tabIndex={-1} className={cx(styles.questionTitle)}>{heading}</h2>
        <span className={cx(styles.questionPoints)}>{QUESTION_BLOCK_COPY.points(question.points)}</span>
        {headerExtra}
      </div>
      {kind === "workshop" && !isLocked ? <HintToggle hint={question.hint} /> : null}
      <QuestionView
        key={question.id}
        question={question}
        answer={answer}
        onChange={(next) => onChange(question, next)}
        readOnly={readOnly || isLocked || isChecking}
      />
      {showCheck ? (
        <div className={cx(styles.checkRow)}>
          <Button variant="outlined" disabled={readOnly || !answered} onClick={() => onCheck(question)}>
            {FEEDBACK_COPY.check}
          </Button>
        </div>
      ) : null}
      {isChecking ? <p className={cx(styles.saveStatus)}>{FEEDBACK_COPY.checking}</p> : null}
      {immediate && kind !== "exam" ? <AnswerFeedback kind={kind} question={question} reveal={reveal} /> : null}
      {immediate ? null : <SaveStatusIndicator status={saveStatuses[question.id] ?? null} />}
    </section>
  );
}

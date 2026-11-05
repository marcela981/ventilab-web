/*
* Funcionalidad: AttemptQuestionBlock
* Descripción: One question of the attempt player, shared by the three layouts (QUIZ, WORKSHOP, EXAM): the question card with its h2 heading (focusable with tabIndex -1 so the paginated layouts move the focus to it when the question changes), the points, an optional extra header control (the EXAM review mark), the WORKSHOP hint (HintToggle), the QuestionView (read-only when the attempt is read-only) and the autosave status. Also AttemptLayoutProps, the contract between the player and its layouts. Depends on React, the attempt layout rules, the question components, the save status indicator and the attempt player CSS Module. v1.1 (ajustes C1): no immediate feedback in any type: every answer is autosaved and shows its save status; "Comprobar respuesta", the check-on-select and the answer feedback are gone (the results wait for the teacher release).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactNode, Ref } from "react";
import { cx } from "@shared/lib/class-names";
import type { AnswerMap } from "../../entities/attempt-progress";
import type { AttemptLayoutKind } from "../../entities/attempt-layout";
import type { AutosaveStatus } from "../../entities/autosave-queue";
import type { AttemptAnswer, AttemptDetail, AttemptQuestion } from "../../entities/evaluation.entity";
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
  onChange: (question: AttemptQuestion, answer: AttemptAnswer) => void
  submitButton: ReactNode
};

export type AttemptQuestionBlockProps = Pick<AttemptLayoutProps, "answers" | "readOnly" | "saveStatuses" | "onChange"> & {
  kind: AttemptLayoutKind
  question: AttemptQuestion
  position: number
  total: number
  headingRef?: Ref<HTMLHeadingElement> | undefined
  headerExtra?: ReactNode
};

export function AttemptQuestionBlock({ headingRef, headerExtra, ...props }: AttemptQuestionBlockProps) {
  const { kind, question, position, total, answers, readOnly, saveStatuses, onChange } = props;
  const heading = QUESTION_BLOCK_COPY.questionPosition(position, total);

  return (
    <section className={cx(styles.questionCard)} aria-label={heading}>
      <div className={cx(styles.questionHeader)}>
        <h2 ref={headingRef} tabIndex={-1} className={cx(styles.questionTitle)}>{heading}</h2>
        <span className={cx(styles.questionPoints)}>{QUESTION_BLOCK_COPY.points(question.points)}</span>
        {headerExtra}
      </div>
      {kind === "workshop" ? <HintToggle hint={question.hint} /> : null}
      <QuestionView
        key={question.id}
        question={question}
        answer={answers[question.id] ?? null}
        onChange={(next) => onChange(question, next)}
        readOnly={readOnly}
      />
      <SaveStatusIndicator status={saveStatuses[question.id] ?? null} />
    </section>
  );
}

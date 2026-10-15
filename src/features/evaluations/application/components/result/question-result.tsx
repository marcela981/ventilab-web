/*
* Funcionalidad: QuestionResult
* Descripción: One question of a published attempt on the result page: position and earned points over the question points, the student's answer rendered with QuestionView in read-only mode, the option review of choice questions (correct options highlighted, the student's selection marked as correct or incorrect, option feedback when the teacher wrote it), the teacher explanation as rich text, the rubric criteria of SIMULATION questions and the AI feedback of the question. Only used for published attempts, the only case where correctness, explanation, rubric and earned score exist. Depends on MUI icons, the question components, RichTextView, RubricCriteriaTable, FeedbackBlock, the entities and the attempt result CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { cx } from "@shared/lib/class-names";
import type { FeedbackItem } from "../../entities/attempt-feedback";
import type { AttemptQuestion } from "../../entities/evaluation.entity";
import { QuestionView } from "../questions/question-view";
import { RichTextView } from "../rich-text-view";
import { FeedbackBlock } from "./feedback-block";
import { RubricCriteriaTable } from "./rubric-criteria-table";
import styles from "../../../UI/attempt-result.module.css";

const scoreFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const QUESTION_RESULT_COPY = {
  title: (position: number, total: number) => `Pregunta ${position} de ${total}`,
  points: (earned: number | null, points: number) =>
    `${earned === null ? "—" : scoreFormatter.format(earned)} / ${scoreFormatter.format(points)} ${points === 1 ? "punto" : "puntos"}`,
  review: "Revisión de las opciones",
  correct: "Respuesta correcta",
  yourAnswerCorrect: "Tu respuesta (correcta)",
  yourAnswerWrong: "Tu respuesta (incorrecta)",
  explanation: "Explicación del docente",
  feedback: "Retroalimentación de la pregunta",
} as const;

const CHOICE_TYPES: ReadonlySet<AttemptQuestion["type"]> = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]);

const noop = () => undefined;

function OptionReview({ question }: { question: AttemptQuestion }) {
  const selected = new Set(question.answer?.selectedOptionIds ?? []);
  const relevant = question.options.filter((option) => option.isCorrect === true || selected.has(option.id));

  if (relevant.length === 0) {
    return null;
  }

  return (
    <ul className={cx(styles.optionReview)} aria-label={QUESTION_RESULT_COPY.review}>
      {relevant.map((option) => {
        const isSelected = selected.has(option.id);
        const isCorrect = option.isCorrect === true;
        let label: string = QUESTION_RESULT_COPY.correct;

        if (isSelected) {
          label = isCorrect ? QUESTION_RESULT_COPY.yourAnswerCorrect : QUESTION_RESULT_COPY.yourAnswerWrong;
        }

        return (
          <li key={option.id} className={cx(styles.reviewItem, isCorrect ? styles.reviewCorrect : styles.reviewWrong)}>
            {isCorrect ? <CheckCircleIcon aria-hidden="true" /> : <CancelIcon aria-hidden="true" />}
            <span className={cx(styles.reviewText)}>
              <span className={cx(styles.reviewLabel)}>{label}:</span> {option.content}
              {option.feedback ? <span className={cx(styles.reviewFeedback)}>{option.feedback}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export type QuestionResultProps = {
  question: AttemptQuestion
  index: number
  total: number
  feedback: FeedbackItem | null
};

export function QuestionResult({ question, index, total, feedback }: QuestionResultProps) {
  const title = QUESTION_RESULT_COPY.title(index + 1, total);

  return (
    <section className={cx(styles.questionCard)} aria-label={title}>
      <div className={cx(styles.questionHeader)}>
        <h2 className={cx(styles.questionTitle)}>{title}</h2>
        <span className={cx(styles.questionPoints)}>{QUESTION_RESULT_COPY.points(question.earnedScore ?? null, question.points)}</span>
      </div>
      <QuestionView question={question} answer={question.answer} onChange={noop} readOnly />
      {CHOICE_TYPES.has(question.type) ? <OptionReview question={question} /> : null}
      {question.explanation ? (
        <div className={cx(styles.explanation)}>
          <h3 className={cx(styles.blockTitle)}>{QUESTION_RESULT_COPY.explanation}</h3>
          <RichTextView value={{ kind: "text", text: question.explanation }} />
        </div>
      ) : null}
      {question.type === "SIMULATION" ? <RubricCriteriaTable rubric={question.rubric} /> : null}
      <FeedbackBlock item={feedback} title={QUESTION_RESULT_COPY.feedback} />
    </section>
  );
}

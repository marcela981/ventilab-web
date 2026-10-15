/*
* Funcionalidad: QuestionView
* Descripción: Renders one evaluation question: its prompt (rich text), its media and the answer control of its type (SingleChoiceQuestion, MultipleChoiceQuestion, TrueFalseQuestion, OpenTextQuestion, or the PracticalQuestionSlot for SIMULATION). Props {question, answer, onChange, readOnly}: readOnly disables every control so the authoring preview and the result page reuse it. Never reads correctness, explanation or rubric. Depends on RichTextView, the question components, the evaluation entities and the questions CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import type { QuestionViewProps } from "../../entities/practical-question-renderer";
import { RichTextView } from "../rich-text-view";
import { EvaluationMediaList } from "./evaluation-media-list";
import { MultipleChoiceQuestion } from "./multiple-choice-question";
import { OpenTextQuestion } from "./open-text-question";
import { PracticalQuestionSlot } from "./practical-question-slot";
import { SingleChoiceQuestion } from "./single-choice-question";
import { TrueFalseQuestion } from "./true-false-question";
import styles from "../../../UI/questions.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const MEDIA_LABEL = "Material de la pregunta";

function AnswerControl(props: QuestionViewProps) {
  switch (props.question.type) {
    case "SINGLE_CHOICE":
      return <SingleChoiceQuestion {...props} />;
    case "MULTIPLE_CHOICE":
      return <MultipleChoiceQuestion {...props} />;
    case "TRUE_FALSE":
      return <TrueFalseQuestion {...props} />;
    case "OPEN_TEXT":
      return <OpenTextQuestion {...props} />;
    case "SIMULATION":
      return <PracticalQuestionSlot {...props} />;
    default:
      return null;
  }
}

export function QuestionView(props: QuestionViewProps) {
  const { question } = props;

  return (
    <div className={cx(styles.question)}>
      <RichTextView value={question.prompt} className={cx(styles.prompt)} />
      <EvaluationMediaList media={question.media} label={MEDIA_LABEL} />
      <AnswerControl {...props} />
    </div>
  );
}

/*
* Funcionalidad: TrueFalseQuestion
* Descripción: Answer control of a TRUE_FALSE question: the two options sent by the backend as a single choice laid out in a row. Supports readOnly like every question component. Depends on SingleChoiceQuestion.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { QuestionViewProps } from "../../entities/practical-question-renderer";
import { SingleChoiceQuestion } from "./single-choice-question";

export function TrueFalseQuestion(props: QuestionViewProps) {
  return <SingleChoiceQuestion {...props} row />;
}

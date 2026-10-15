/*
* Funcionalidad: Practical question renderer registry
* Descripción: Module-level extension point for SIMULATION questions. The evaluations feature ships a disabled placeholder (PracticalQuestionSlot) until the simulator exists; a future simulator feature calls registerPracticalQuestionRenderer(Component) once at startup and every SIMULATION question (attempt player and authoring preview) renders that component instead, with the same props as any question (question, answer, onChange, readOnly), without changing this feature. Passing null restores the placeholder. Depends only on React types and the evaluation entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ComponentType } from "react";
import type { AttemptAnswer, AttemptQuestion } from "./evaluation.entity";

export type QuestionViewProps = {
  question: AttemptQuestion
  answer: AttemptAnswer | null
  onChange: (answer: AttemptAnswer) => void
  readOnly?: boolean | undefined
};

export type PracticalQuestionRendererProps = QuestionViewProps;

let renderer: ComponentType<PracticalQuestionRendererProps> | null = null;

export function registerPracticalQuestionRenderer(component: ComponentType<PracticalQuestionRendererProps> | null): void {
  renderer = component;
}

export function getPracticalQuestionRenderer(): ComponentType<PracticalQuestionRendererProps> | null {
  return renderer;
}

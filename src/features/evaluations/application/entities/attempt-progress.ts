/*
* Funcionalidad: Attempt progress
* Descripción: Pure rules of the attempt player over the answers the student has on screen: whether one answer counts as answered (choices with at least one option, a non-blank text, a simulation session), the number of unanswered questions shown in the submit dialog, the state of each navigator item (answered, unanswered, marked for review), the scenario of a question, the clamped question index and the autosave delay per question type (typing waits longer than a click). Never reads correctness, explanation or rubric. Depends on the evaluation entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AttemptAnswer, AttemptQuestion, AttemptScenario, QuestionType } from "./evaluation.entity";

export type AnswerMap = Readonly<Record<string, AttemptAnswer | null>>;

// An unsaved answer with the type of its question (the PUT body depends on it).
export type PendingAnswer = {
  type: QuestionType
  answer: AttemptAnswer
};

export const TEXT_AUTOSAVE_DELAY_MS = 800;
export const CHOICE_AUTOSAVE_DELAY_MS = 150;
export const OPEN_TEXT_MAX_LENGTH = 10_000;

export function emptyAnswer(): AttemptAnswer {
  return { selectedOptionIds: [], textAnswer: null, simulationSessionId: null };
}

export function isAnswered(type: QuestionType, answer: AttemptAnswer | null | undefined): boolean {
  if (!answer) {
    return false;
  }

  if (type === "OPEN_TEXT") {
    return (answer.textAnswer ?? "").trim() !== "";
  }

  if (type === "SIMULATION") {
    return answer.simulationSessionId !== null;
  }

  return answer.selectedOptionIds.length > 0;
}

export function countUnanswered(questions: readonly AttemptQuestion[], answers: AnswerMap): number {
  return questions.filter((question) => !isAnswered(question.type, answers[question.id])).length;
}

export function autosaveDelay(type: QuestionType): number {
  return type === "OPEN_TEXT" ? TEXT_AUTOSAVE_DELAY_MS : CHOICE_AUTOSAVE_DELAY_MS;
}

export function clampQuestionIndex(index: number, total: number): number {
  if (total <= 0 || !Number.isInteger(index)) {
    return 0;
  }

  return Math.min(Math.max(index, 0), total - 1);
}

export function findScenario(scenarios: readonly AttemptScenario[], question: AttemptQuestion | undefined): AttemptScenario | null {
  if (!question?.scenarioId) {
    return null;
  }

  return scenarios.find((scenario) => scenario.id === question.scenarioId) ?? null;
}

export function initialAnswers(questions: readonly AttemptQuestion[], restored: Readonly<Record<string, PendingAnswer>>): Record<string, AttemptAnswer | null> {
  const answers: Record<string, AttemptAnswer | null> = {};

  for (const question of questions) {
    // A value restored from a reload was typed after the last save: it wins over the server copy.
    answers[question.id] = restored[question.id]?.answer ?? question.answer;
  }

  return answers;
}

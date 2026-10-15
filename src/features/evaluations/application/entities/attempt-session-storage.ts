/*
* Funcionalidad: Attempt session storage
* Descripción: Per-attempt, per-tab client state of the attempt player kept in sessionStorage so a reload resumes where the student was: the current question index, the questions marked for review (client only, never sent to the backend) and the answers still unsaved (resent after a reload). Every read and write is wrapped in try/catch because storage can be missing or blocked (private mode, previews); a failure falls back to the defaults and never breaks the player. Depends on the evaluation and attempt-progress entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { PendingAnswer } from "./attempt-progress";
import type { AttemptAnswer, QuestionType } from "./evaluation.entity";

const PREFIX = "vl:attempt";

export const attemptStorageKeys = (attemptId: string) => ({
  questionIndex: `${PREFIX}:${attemptId}:question`,
  marked: `${PREFIX}:${attemptId}:marked`,
  pendingAnswers: `${PREFIX}:${attemptId}:pending-answers`,
});

function read(key: string): string | null {
  try {
    return globalThis.sessionStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) {
      globalThis.sessionStorage?.removeItem(key);
    } else {
      globalThis.sessionStorage?.setItem(key, value);
    }
  } catch {
    // Storage unavailable: the player keeps working without resume.
  }
}

function readJson(key: string): unknown {
  const raw = read(key);

  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function readQuestionIndex(attemptId: string): number | null {
  const value = Number(read(attemptStorageKeys(attemptId).questionIndex));

  return Number.isInteger(value) && value >= 0 ? value : null;
}

export function writeQuestionIndex(attemptId: string, index: number): void {
  write(attemptStorageKeys(attemptId).questionIndex, String(index));
}

export function readMarkedQuestions(attemptId: string): string[] {
  const value = readJson(attemptStorageKeys(attemptId).marked);

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function writeMarkedQuestions(attemptId: string, questionIds: readonly string[]): void {
  write(attemptStorageKeys(attemptId).marked, questionIds.length > 0 ? JSON.stringify(questionIds) : null);
}

function isAnswer(value: unknown): value is AttemptAnswer {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AttemptAnswer>;

  return Array.isArray(candidate.selectedOptionIds)
    && candidate.selectedOptionIds.every((item) => typeof item === "string")
    && (candidate.textAnswer === null || typeof candidate.textAnswer === "string")
    && (candidate.simulationSessionId === null || typeof candidate.simulationSessionId === "string");
}

const QUESTION_TYPES: readonly QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "OPEN_TEXT", "SIMULATION"];

function isPendingAnswer(value: unknown): value is PendingAnswer {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as { type?: unknown, answer?: unknown };

  return QUESTION_TYPES.includes(candidate.type as QuestionType) && isAnswer(candidate.answer);
}

export function readPendingAnswers(attemptId: string): Record<string, PendingAnswer> {
  const value = readJson(attemptStorageKeys(attemptId).pendingAnswers);
  const answers: Record<string, PendingAnswer> = {};

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return answers;
  }

  for (const [questionId, answer] of Object.entries(value)) {
    if (isPendingAnswer(answer)) {
      answers[questionId] = answer;
    }
  }

  return answers;
}

export function writePendingAnswers(attemptId: string, answers: Readonly<Record<string, PendingAnswer>>): void {
  write(attemptStorageKeys(attemptId).pendingAnswers, Object.keys(answers).length > 0 ? JSON.stringify(answers) : null);
}

export function clearAttemptStorage(attemptId: string): void {
  const keys = attemptStorageKeys(attemptId);

  write(keys.questionIndex, null);
  write(keys.marked, null);
  write(keys.pendingAnswers, null);
}

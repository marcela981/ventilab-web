/*
* Funcionalidad: Attempt layout rules
* Descripción: Pure rules of the attempt player per evaluation type (DISENO_BLOQUE3 §2.1-§2.3, §2.12): the layout of each type (QUIZ: every question visible with immediate feedback; WORKSHOP: one step at a time, "Paso n de N", hint and explanation after answering; EXAM: paginated with the navigator, no feedback), the July submit labels ("Enviar quiz", "Enviar taller", "Enviar examen"), the clock warning thresholds (EXAM at 10 and 5 minutes as in July, otherwise 5 and 1), which questions get immediate feedback (choice questions of QUIZ and WORKSHOP; SIMULATION and OPEN_TEXT never) and whether a choice auto-checks on select (single choice and true/false) or needs "Comprobar respuesta" (multiple choice), the July feedback texts (QUIZ "¡Correcto! 🎉" / `Casi. La respuesta correcta era "{x}"`, WORKSHOP "¡Muy bien! 🌟" / `La respuesta correcta era "{x}".` plus the explanation or the July generic text after answering) and the Alt+←/→ shortcut, ignored inside text fields. The correction itself always comes from the server. Depends on the evaluation entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { MINUTE_MS } from "./attempt-timer";
import type { AnswerReveal, AttemptQuestion, EvaluationType } from "./evaluation.entity";

export type AttemptLayoutKind = "quiz" | "workshop" | "exam";

export function layoutFor(type: EvaluationType): AttemptLayoutKind {
  if (type === "QUIZ") {
    return "quiz";
  }

  return type === "WORKSHOP" ? "workshop" : "exam";
}

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const SUBMIT_LABELS: Record<EvaluationType, string> = {
  QUIZ: "Enviar quiz",
  WORKSHOP: "Enviar taller",
  EXAM: "Enviar examen",
};

export const EXAM_WARNING_THRESHOLDS_MS = [10 * MINUTE_MS, 5 * MINUTE_MS] as const;
export const DEFAULT_WARNING_THRESHOLDS_MS = [5 * MINUTE_MS, MINUTE_MS] as const;

export function warningThresholdsFor(type: EvaluationType): readonly number[] {
  return type === "EXAM" ? EXAM_WARNING_THRESHOLDS_MS : DEFAULT_WARNING_THRESHOLDS_MS;
}

const CHOICE_TYPES = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]);

export function hasImmediateFeedback(type: EvaluationType, question: Pick<AttemptQuestion, "type">): boolean {
  return type !== "EXAM" && CHOICE_TYPES.has(question.type);
}

// A single choice is checked as soon as it is picked; a multiple choice waits for "Comprobar respuesta".
export function checksOnSelect(question: Pick<AttemptQuestion, "type">): boolean {
  return question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE";
}

export const FEEDBACK_COPY = {
  quizCorrect: "¡Correcto! 🎉",
  quizWrong: (correct: string) => `Casi. La respuesta correcta era "${correct}"`,
  workshopCorrect: "¡Muy bien! 🌟",
  workshopWrong: (correct: string) => `La respuesta correcta era "${correct}".`,
  workshopFallback: (correct: string) =>
    `La opción correcta es "${correct}". Revisa el material del módulo para profundizar en este tema.`,
  check: "Comprobar respuesta",
  checking: "Comprobando…",
  hintShow: "Pista 💡",
  hintHide: "Ocultar pista",
  hintLabel: "Pista",
} as const;

export function correctOptionText(question: Pick<AttemptQuestion, "options">, reveal: Pick<AnswerReveal, "correctOptionIds">): string {
  const ids = new Set(reveal.correctOptionIds);

  return question.options.filter((option) => ids.has(option.id)).map((option) => option.content).join(", ");
}

export type RevealMessage = {
  correct: boolean
  verdict: string
  // Shown under the verdict: the explanation, or in a WORKSHOP the July generic text when there is none.
  explanation: string | null
};

export function revealMessage(kind: "quiz" | "workshop", question: Pick<AttemptQuestion, "options">, reveal: AnswerReveal): RevealMessage {
  const correctText = correctOptionText(question, reveal);

  if (kind === "quiz") {
    return {
      correct: reveal.isCorrect,
      verdict: reveal.isCorrect ? FEEDBACK_COPY.quizCorrect : FEEDBACK_COPY.quizWrong(correctText),
      explanation: reveal.explanation,
    };
  }

  return {
    correct: reveal.isCorrect,
    verdict: reveal.isCorrect ? FEEDBACK_COPY.workshopCorrect : FEEDBACK_COPY.workshopWrong(correctText),
    explanation: reveal.explanation ?? FEEDBACK_COPY.workshopFallback(correctText),
  };
}

export type PagerDirection = "previous" | "next";

type KeyLike = {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  target: EventTarget | null
};

function isTextField(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
    return true;
  }

  if (target.tagName === "INPUT") {
    const type = (target as HTMLInputElement).type;

    return !["radio", "checkbox", "button", "submit", "reset"].includes(type);
  }

  return false;
}

// Alt+← / Alt+→ move between questions, except while typing in a text field.
export function pagerShortcut(event: KeyLike): PagerDirection | null {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTextField(event.target)) {
    return null;
  }

  if (event.key === "ArrowLeft") {
    return "previous";
  }

  return event.key === "ArrowRight" ? "next" : null;
}

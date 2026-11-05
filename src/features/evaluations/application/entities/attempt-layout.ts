/*
* Funcionalidad: Attempt layout rules
* Descripción: Pure rules of the attempt player per evaluation type (DISENO_BLOQUE3 §2.1-§2.3, §2.12): the layout of each type (QUIZ: every question visible with immediate feedback; WORKSHOP: one step at a time, "Paso n de N", hint and explanation after answering; EXAM: paginated with the navigator, no feedback), the July submit labels ("Enviar quiz", "Enviar taller", "Enviar examen"), the clock warning thresholds (EXAM at 10 and 5 minutes as in July, otherwise 5 and 1), which questions get immediate feedback (choice questions of QUIZ and WORKSHOP; SIMULATION and OPEN_TEXT never) and whether a choice auto-checks on select (single choice and true/false) or needs "Comprobar respuesta" (multiple choice), the July feedback texts (QUIZ "¡Correcto! 🎉" / `Casi. La respuesta correcta era "{x}"`, WORKSHOP "¡Muy bien! 🌟" / `La respuesta correcta era "{x}".` plus the explanation or the July generic text after answering) and the Alt+←/→ shortcut, ignored inside text fields. The correction itself always comes from the server. Depends on the evaluation entities. v1.1 (ajustes C1): no immediate feedback in any type (the results wait for the teacher release): hasImmediateFeedback, checksOnSelect, the verdict texts and revealMessage are gone; HINT_COPY keeps the WORKSHOP "Pista 💡" / "Ocultar pista".
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { MINUTE_MS } from "./attempt-timer";
import type { EvaluationType } from "./evaluation.entity";

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

export const HINT_COPY = {
  show: "Pista 💡",
  hide: "Ocultar pista",
  label: "Pista",
} as const;

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

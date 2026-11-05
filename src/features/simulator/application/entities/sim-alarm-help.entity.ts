/*
* Funcionalidad: Simulator alarm help rules
* Descripción: Pure rules of the "¿Cómo estabilizar?" help of an alarm (Bloque A, DISENO_AJUSTES_A §5, A-9, A-10): the
*   parser of the deterministic `rules` frame (each rule with its text and source reference; malformed rules dropped),
*   the guard of the `done` frame ({aiCallId, source, aiHelpEventId?}), the availability of the help under the
*   assistance policy of the session (FREE and the real monitor allowed, EXAM DISABLED or unknown unavailable without
*   any request, EXAM with penalty asked before each request). A DETERMINISTIC answer is never rated (rating
*   constants in sim-assist.config). Depends on the shared AI conversation types
*   and the assist entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { StreamDoneMetadata } from "@shared/ai-conversation";
import type { AssistPolicy } from "./sim-assist.entity";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const ALARM_HELP_COPY = {
  unavailableExam: "Ayuda no disponible durante el examen",
  penalty: "En este examen cada ayuda de alarma queda registrada y descuenta puntos de tu nota.",
} as const;

export type AlarmRule = { id: string, text: string, reference: string };

export type AlarmRules = { alarmCode: string, rules: readonly AlarmRule[] };

/** `done` frame of the alarm help (and of the real-mode assistance): aiHelpEventId only for a simulation session. */
export type AlarmHelpDone = StreamDoneMetadata & {
  source: "LLM" | "DETERMINISTIC"
  aiHelpEventId?: string | undefined
};

export type AlarmHelpAvailability =
  | { status: "available" }
  /** Ask before each request (every answer is penalised). */
  | { status: "penalty", message: string }
  /** EXAM with the help disabled (or an unknown policy): only the alarm description, no request. */
  | { status: "unavailable", reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The deterministic rules of the `rules` frame; null when the payload is not an object. */
export function parseAlarmRules(value: unknown): AlarmRules | null {
  if (!isRecord(value)) {
    return null;
  }

  const rules = Array.isArray(value.rules)
    ? value.rules.flatMap((rule: unknown): AlarmRule[] => (
      isRecord(rule) && typeof rule.text === "string" && rule.text.trim() !== ""
        ? [{ id: typeof rule.id === "string" ? rule.id : rule.text, text: rule.text, reference: typeof rule.reference === "string" ? rule.reference : "" }]
        : []
    ))
    : [];

  return { alarmCode: typeof value.alarmCode === "string" ? value.alarmCode : "", rules };
}

export function isAlarmHelpDone(value: unknown): value is AlarmHelpDone {
  return isRecord(value) && typeof value.aiCallId === "string" && value.aiCallId !== "";
}

/** The alarm help follows the assistance policy of the session (A-9): DISABLED shows no rules nor AI. */
export function alarmHelpAvailability(policy: AssistPolicy): AlarmHelpAvailability {
  if (policy.status === "disabled") {
    return { status: "unavailable", reason: ALARM_HELP_COPY.unavailableExam };
  }

  return policy.status === "penalty" ? { status: "penalty", message: ALARM_HELP_COPY.penalty } : { status: "available" };
}

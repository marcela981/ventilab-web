/*
* Funcionalidad: Simulator AI assist entities
* Descripción: Types and pure rules of the AI assist of a running session (T7). The assistance policy comes from the
*   rubric (`ClinicalCaseRubricDTO.assistancePolicy`: DISABLED | ALLOWED_WITH_PENALTY); a student cannot read it from
*   any endpoint during the session (the case `defaultRubric` is only in the staff `/definition`, the EXAM question
*   rubric only after the grade is published), so the host may inject it and `resolveAssistPolicy` fails safe: FREE is
*   allowed unless a policy says DISABLED; EXAM without a known policy is disabled ("No se pudo verificar la política de
*   asesoría"), DISABLED is disabled and ALLOWED_WITH_PENALTY asks for a confirmation before every request (every
*   answer is recorded as an AI_HELP event that the score penalizes). Also the `done` metadata of the assist stream
*   ({aiHelpEventId, aiCallId, source}) and an answered turn kept in the panel. Type-only imports of the AI
*   conversation module, so the console chunk does not load it. Depends on the generated OpenAPI types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { StreamDoneMetadata } from "@shared/ai-conversation";
import type { components } from "@shared/api-client/generated/schema";
import type { SimulationMode } from "../config/simulator.config";

export type AssistancePolicyValue = components["schemas"]["ClinicalCaseRubricDTO"]["assistancePolicy"];

export type AssistPolicy =
  | { status: "allowed" }
  | { status: "disabled", reason: string }
  /** Confirm before each request: every answer is penalized. */
  | { status: "penalty", message: string };

// TODO(i18n): move to a simulator namespace in src/i18n.
export const ASSIST_POLICY_COPY = {
  unverified: "No se pudo verificar la política de asesoría",
  disabled: "La asesoría de IA está desactivada en este examen.",
  penalty: "En este examen cada asesoría queda registrada y descuenta puntos de tu nota. La penalización se aplica cada vez que la solicitas.",
} as const;

/** FREE: allowed unless the policy says DISABLED. EXAM: only a known ALLOWED_WITH_PENALTY allows it (fail safe). */
export function resolveAssistPolicy(mode: SimulationMode, policy: AssistancePolicyValue | null | undefined): AssistPolicy {
  if (policy === "DISABLED") {
    return { status: "disabled", reason: ASSIST_POLICY_COPY.disabled };
  }

  if (mode === "FREE") {
    return { status: "allowed" };
  }

  return policy === "ALLOWED_WITH_PENALTY"
    ? { status: "penalty", message: ASSIST_POLICY_COPY.penalty }
    : { status: "disabled", reason: ASSIST_POLICY_COPY.unverified };
}

/**
 * `done` frame of POST /simulation/sessions/{id}/assist. The shared stream hook types its metadata with `messageId`;
 * this route does not send it and it is never read.
 */
export type AssistStreamDone = StreamDoneMetadata & {
  aiHelpEventId: string
  source: "LLM" | "DETERMINISTIC"
};

export function isAssistDone(value: unknown): value is AssistStreamDone {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const done = value as Partial<AssistStreamDone>;

  return typeof done.aiHelpEventId === "string" && done.aiHelpEventId !== "" && typeof done.aiCallId === "string";
}

/** One answered request of this session, listed in the panel and rated through its AI_HELP event. */
export type AssistTurn = {
  aiHelpEventId: string
  aiCallId: string
  question: string
  answer: string
  source: AssistStreamDone["source"]
};

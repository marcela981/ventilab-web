/*
* Funcionalidad: AI conversation entity
* Descripción: Feature-agnostic types and rules of a streamed AI conversation: message roles, the source citations an answer may carry, the minimum `done` metadata of an AI stream (aiCallId, messageId, optional sources; routes add their own fields such as conversationId), the near-limit rule of the composer counter and the http(s)-only check of citation URLs. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type MessageRole = "user" | "assistant";

export type AiSourceCitation = {
  title: string
  url?: string | undefined
};

// Minimum payload of an AI stream `done` frame; each route may add fields (e.g. conversationId).
export type StreamDoneMetadata = {
  aiCallId: string
  messageId: string
  sources?: readonly AiSourceCitation[] | undefined
};

// Share of maxLength from which the composer shows its character counter.
export const COMPOSER_COUNTER_THRESHOLD = 0.9;

export function isNearLimit(length: number, maxLength: number): boolean {
  return maxLength > 0 && length >= Math.ceil(maxLength * COMPOSER_COUNTER_THRESHOLD);
}

export function isSafeExternalUrl(url: string | undefined): url is string {
  if (typeof url !== "string") {
    return false;
  }

  try {
    const { protocol } = new URL(url);

    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

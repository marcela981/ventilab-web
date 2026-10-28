/*
* Funcionalidad: AI tutor error messages
* Descripción: Spanish messages for the errors of the AI tutor streams (deepen a page, lesson/module questions), shared by the Profundizar and Preguntas panels. Thin learning wrapper over the generic core of @shared/ai-conversation (quota with the local reset time hh:mm, provider unavailable, interrupted stream, generic stream failure): it keeps the "tutor de IA" wording, adds the unpublished-page text for a 404 of Profundizar and sends the remaining errors (network, plain 429 wait, 404 default, other HTTP) to getLearningErrorMessage. v1.1 (S1 ai-chat): the generic logic moved to @shared/ai-conversation; same messages and same public API. v1.2 (W7, Bloque 2): getDeepenErrorMessage with the July deepen accordion texts (429/quota → "Demasiadas solicitudes…", network.unavailable → "Sin conexión", network.timeout → "Tiempo de espera agotado", anything else → "Error al expandir el tema").
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { AI_ERROR_CODES, getAiErrorMessage as getAiStreamErrorMessage } from "@shared/ai-conversation/application/ai-error-messages";
import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import { getLearningErrorMessage } from "./learning-error-messages";

export { AI_ERROR_CODES, formatResetTime } from "@shared/ai-conversation/application/ai-error-messages";

// TODO(i18n): move to a learning namespace in src/i18n.
export const AI_ERROR_MESSAGES = {
  quotaExceeded: "Alcanzaste el límite de uso del tutor de IA.",
  providerUnavailable: "El tutor de IA no está disponible en este momento. Inténtalo más tarde.",
  pageNotPublished: "Esta página no está publicada o ya no existe, así que el tutor no puede profundizar en ella.",
  interrupted: "La respuesta se interrumpió antes de terminar. Inténtalo de nuevo.",
  failed: "El tutor de IA no pudo responder. Inténtalo de nuevo.",
} as const;

export type AiErrorMessageOptions = {
  // Message for a 404 (e.g. the deepened page is not published); defaults to the learning not-found text.
  notFound?: string
  now?: number
};

// July deepen accordion texts (ai.json topicExpander.panel).
export const DEEPEN_ERROR_MESSAGES = {
  rateLimit: "Demasiadas solicitudes. Por favor, espera un momento.",
  network: "Sin conexión",
  timeout: "Tiempo de espera agotado",
  failed: "Error al expandir el tema",
} as const;

export function getDeepenErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.status === 429 || apiError.code === AI_ERROR_CODES.quotaExceeded) {
    return DEEPEN_ERROR_MESSAGES.rateLimit;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return DEEPEN_ERROR_MESSAGES.network;
  }

  return apiError.code === CLIENT_ERROR_CODES.networkTimeout ? DEEPEN_ERROR_MESSAGES.timeout : DEEPEN_ERROR_MESSAGES.failed;
}

export function getAiErrorMessage(error: unknown, { notFound, now }: AiErrorMessageOptions = {}): string {
  return getAiStreamErrorMessage(error, { notFound, now, messages: AI_ERROR_MESSAGES, fallback: getLearningErrorMessage });
}

/*
* Funcionalidad: AI tutor error messages
* Descripción: Spanish messages for the errors of the AI tutor streams (deepen a page, lesson/module questions), shared by the Profundizar and Preguntas panels. Errors before the stream (JSON envelope) and `event: error` frames after it started arrive as ApiError (stream errors with status 0 and the backend code). Daily quota (`ai.quota_exceeded`, 429 + Retry-After) shows the local reset time hh:mm; a plain 429 keeps the learning wait message; `ai.providers_unavailable` / 503 says the tutor is unavailable; 404 uses the caller's message (deepen: unpublished page) or the learning default; an interrupted stream (`network.stream_interrupted`, `ai.stream_interrupted`, 502) and other stream failures get their own text; network and HTTP fallbacks reuse getLearningErrorMessage. Depends on the api-client ApiError and the learning error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import { getLearningErrorMessage, LEARNING_FALLBACK_MESSAGES } from "./learning-error-messages";

// Backend codes (ventylab-server features/ai and ai-tutor).
export const AI_ERROR_CODES = {
  quotaExceeded: "ai.quota_exceeded",
  providersUnavailable: "ai.providers_unavailable",
  streamInterrupted: "ai.stream_interrupted",
  streamFailed: "ai-tutor.stream_failed",
} as const;

// TODO(i18n): move to a learning namespace in src/i18n.
export const AI_ERROR_MESSAGES = {
  quotaExceeded: "Alcanzaste el límite de uso del tutor de IA.",
  providerUnavailable: "El tutor de IA no está disponible en este momento. Inténtalo más tarde.",
  pageNotPublished: "Esta página no está publicada o ya no existe, así que el tutor no puede profundizar en ella.",
  interrupted: "La respuesta se interrumpió antes de terminar. Inténtalo de nuevo.",
  failed: "El tutor de IA no pudo responder. Inténtalo de nuevo.",
} as const;

const NETWORK_CODES = new Set<string>([CLIENT_ERROR_CODES.networkUnavailable, CLIENT_ERROR_CODES.networkTimeout]);
const INTERRUPTED_CODES = new Set<string>([CLIENT_ERROR_CODES.streamInterrupted, AI_ERROR_CODES.streamInterrupted]);

const RESET_TIME_FORMAT = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// Local wall-clock time ("hh:mm") at which a wait of `retryAfterSeconds` ends.
export function formatResetTime(retryAfterSeconds: number, now: number = Date.now()): string {
  return RESET_TIME_FORMAT.format(new Date(now + retryAfterSeconds * 1000));
}

export type AiErrorMessageOptions = {
  // Message for a 404 (e.g. the deepened page is not published); defaults to the learning not-found text.
  notFound?: string
  now?: number
};

export function getAiErrorMessage(error: unknown, { notFound, now }: AiErrorMessageOptions = {}): string {
  const apiError = toApiError(error);

  if (apiError.code === AI_ERROR_CODES.quotaExceeded) {
    return apiError.retryAfter === undefined
      ? `${AI_ERROR_MESSAGES.quotaExceeded} Inténtalo más tarde.`
      : `${AI_ERROR_MESSAGES.quotaExceeded} Podrás usarlo de nuevo a las ${formatResetTime(apiError.retryAfter, now)}.`;
  }

  if (apiError.code === AI_ERROR_CODES.providersUnavailable || apiError.status === 503) {
    return AI_ERROR_MESSAGES.providerUnavailable;
  }

  if (INTERRUPTED_CODES.has(apiError.code) || apiError.status === 502) {
    return AI_ERROR_MESSAGES.interrupted;
  }

  if (apiError.status === 404) {
    return notFound ?? LEARNING_FALLBACK_MESSAGES.notFound;
  }

  // An `event: error` frame after the stream started carries the backend code without HTTP status.
  if (apiError.status === 0 && !NETWORK_CODES.has(apiError.code)) {
    return AI_ERROR_MESSAGES.failed;
  }

  return getLearningErrorMessage(apiError);
}

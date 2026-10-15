/*
* Funcionalidad: AI conversation error messages
* Descripción: Generic Spanish messages for the errors of AI answer streams, shared by every AI conversation (learning tutor panels, AI chat). Errors before the stream (JSON envelope) and `event: error` frames after it started arrive as ApiError (stream errors with status 0 and the backend code). Daily quota (`ai.quota_exceeded`, 429 + Retry-After or resetAt, already turned into seconds by the SSE helper) shows the local reset time hh:mm; `ai.providers_unavailable` / 503 says the AI is unavailable; a connection lost mid-stream (`network.stream_interrupted`, `ai.stream_interrupted`, 502) and other stream failures get their own text; 404 uses the caller's message; the rest (network, timeout, plain 429 with its wait, 5xx, other HTTP errors) goes to the caller's fallback or the generic one. Callers may replace any message (e.g. learning keeps its "tutor de IA" wording). Depends on the api-client ApiError.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import type { ApiError } from "@shared/api-client/api-error";

// Backend codes (ventylab-server features/ai and ai-tutor).
export const AI_ERROR_CODES = {
  quotaExceeded: "ai.quota_exceeded",
  providersUnavailable: "ai.providers_unavailable",
  streamInterrupted: "ai.stream_interrupted",
  streamFailed: "ai-tutor.stream_failed",
} as const;

export type AiStreamErrorMessages = {
  quotaExceeded: string
  providerUnavailable: string
  interrupted: string
  failed: string
};

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const AI_STREAM_ERROR_MESSAGES: AiStreamErrorMessages = {
  quotaExceeded: "Alcanzaste el límite de uso de la IA.",
  providerUnavailable: "El asistente de IA no está disponible en este momento. Inténtalo más tarde.",
  interrupted: "La respuesta se interrumpió antes de terminar. Inténtalo de nuevo.",
  failed: "El asistente de IA no pudo responder. Inténtalo de nuevo.",
};

export const AI_FALLBACK_MESSAGES = {
  notFound: "La conversación no existe o ya no está disponible.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la solicitud. Inténtalo de nuevo.",
} as const;

const NETWORK_CODES = new Set<string>([CLIENT_ERROR_CODES.networkUnavailable, CLIENT_ERROR_CODES.networkTimeout]);
const INTERRUPTED_CODES = new Set<string>([CLIENT_ERROR_CODES.streamInterrupted, AI_ERROR_CODES.streamInterrupted]);

const RESET_TIME_FORMAT = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// Local wall-clock time ("hh:mm") at which a wait of `retryAfterSeconds` ends.
export function formatResetTime(retryAfterSeconds: number, now: number = Date.now()): string {
  return RESET_TIME_FORMAT.format(new Date(now + retryAfterSeconds * 1000));
}

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

// Generic message for errors that are not specific to AI streams.
export function getGenericErrorMessage(apiError: ApiError): string {
  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return AI_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return AI_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? AI_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return AI_FALLBACK_MESSAGES.server;
  }

  return apiError.status === 404 ? AI_FALLBACK_MESSAGES.notFound : AI_FALLBACK_MESSAGES.unknown;
}

export type AiErrorMessageOptions = {
  // Message for a 404 (e.g. a deleted conversation); defaults to the fallback.
  notFound?: string | undefined
  // Replaces some or all of the AI stream messages.
  messages?: Partial<AiStreamErrorMessages> | undefined
  // Message for the errors that are not AI-specific; defaults to getGenericErrorMessage.
  fallback?: ((error: ApiError) => string) | undefined
  now?: number | undefined
};

export function getAiErrorMessage(error: unknown, { notFound, messages, fallback = getGenericErrorMessage, now }: AiErrorMessageOptions = {}): string {
  const apiError = toApiError(error);
  const copy = { ...AI_STREAM_ERROR_MESSAGES, ...messages };

  if (apiError.code === AI_ERROR_CODES.quotaExceeded) {
    return apiError.retryAfter === undefined
      ? `${copy.quotaExceeded} Inténtalo más tarde.`
      : `${copy.quotaExceeded} Podrás usarlo de nuevo a las ${formatResetTime(apiError.retryAfter, now)}.`;
  }

  if (apiError.code === AI_ERROR_CODES.providersUnavailable || apiError.status === 503) {
    return copy.providerUnavailable;
  }

  if (INTERRUPTED_CODES.has(apiError.code) || apiError.status === 502) {
    return copy.interrupted;
  }

  if (apiError.status === 404) {
    return notFound ?? fallback(apiError);
  }

  // An `event: error` frame after the stream started carries the backend code without HTTP status.
  if (apiError.status === 0 && !NETWORK_CODES.has(apiError.code)) {
    return copy.failed;
  }

  return fallback(apiError);
}

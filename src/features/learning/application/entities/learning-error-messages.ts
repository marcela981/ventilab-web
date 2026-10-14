/*
* Funcionalidad: Learning error messages
* Descripción: Spanish message for any failure of a learning request (curriculum tree, lessons, Pages, progress, page views): fallbacks by status (403, 404 for missing or unpublished content, 409, 400/422, 429 with Retry-After, 5xx), client timeout (the backend may be waking up), network and unknown errors. Follows groups-error-messages. Depends on the api-client errors.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to a learning namespace in src/i18n.
export const LEARNING_FALLBACK_MESSAGES = {
  forbidden: "No tienes acceso a este contenido.",
  notFound: "Este contenido no existe o todavía no está publicado.",
  conflict: "No se pudo completar la operación por un conflicto con el estado actual del contenido.",
  invalid: "La solicitud no es válida.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo cargar el contenido. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  400: LEARNING_FALLBACK_MESSAGES.invalid,
  403: LEARNING_FALLBACK_MESSAGES.forbidden,
  404: LEARNING_FALLBACK_MESSAGES.notFound,
  409: LEARNING_FALLBACK_MESSAGES.conflict,
  422: LEARNING_FALLBACK_MESSAGES.invalid,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

export function getLearningErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return LEARNING_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return LEARNING_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? LEARNING_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return LEARNING_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? LEARNING_FALLBACK_MESSAGES.unknown;
}

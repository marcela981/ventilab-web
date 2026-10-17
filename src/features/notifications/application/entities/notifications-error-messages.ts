/*
* Funcionalidad: Notifications error messages
* Descripción: Spanish message for any failure of a notifications request: the backend code notifications.not_found (404, also for a notification of another user), then fallbacks by status (403, 404, 400/422, 429 with Retry-After, 5xx), timeout, network and unknown errors. Depends on the api-client errors.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to a notifications namespace in src/i18n.
export const NOTIFICATIONS_ERROR_MESSAGES = {
  "notifications.not_found": "La notificación ya no existe. Actualiza la lista.",
} as const satisfies Record<string, string>;

export const NOTIFICATIONS_FALLBACK_MESSAGES = {
  forbidden: "No tienes permiso para realizar esta acción.",
  notFound: "La notificación ya no existe. Actualiza la lista.",
  invalid: "La solicitud no es válida. Actualiza la página e inténtalo de nuevo.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la operación. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  400: NOTIFICATIONS_FALLBACK_MESSAGES.invalid,
  403: NOTIFICATIONS_FALLBACK_MESSAGES.forbidden,
  404: NOTIFICATIONS_FALLBACK_MESSAGES.notFound,
  422: NOTIFICATIONS_FALLBACK_MESSAGES.invalid,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function isKnownCode(code: string): code is keyof typeof NOTIFICATIONS_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(NOTIFICATIONS_ERROR_MESSAGES, code);
}

export function getNotificationsErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownCode(apiError.code)) {
    return NOTIFICATIONS_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return NOTIFICATIONS_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return NOTIFICATIONS_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? NOTIFICATIONS_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return NOTIFICATIONS_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? NOTIFICATIONS_FALLBACK_MESSAGES.unknown;
}

/*
* Funcionalidad: Lab error messages
* Descripción: Spanish message of a failed lab read: the client network codes, the 429 wait from Retry-After and a message per HTTP status. Later tasks add the backend reservation, control and command codes. Depends on the api-client error helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const LAB_FALLBACK_MESSAGES = {
  forbidden: "No tienes permiso para realizar esta acción.",
  notFound: "No se encontró el recurso solicitado.",
  conflict: "La operación no se pudo completar por el estado actual de la reserva.",
  invalid: "Revisa los datos enviados.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la operación. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  400: LAB_FALLBACK_MESSAGES.invalid,
  403: LAB_FALLBACK_MESSAGES.forbidden,
  404: LAB_FALLBACK_MESSAGES.notFound,
  409: LAB_FALLBACK_MESSAGES.conflict,
  422: LAB_FALLBACK_MESSAGES.invalid,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

export function getLabErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return LAB_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return LAB_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? LAB_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return LAB_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? LAB_FALLBACK_MESSAGES.unknown;
}

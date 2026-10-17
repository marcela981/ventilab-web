/*
* Funcionalidad: Teacher dashboard error messages
* Descripción: Spanish message for any failure of a teacher dashboard request: backend codes of analytics and users (analytics.out_of_scope → "No tienes acceso a este grupo", group/evaluation not found, invalid timeline range, student not found or not a student), then fallbacks by status (403, 404, 400/422, 429 with Retry-After, 5xx), timeout, network and unknown errors. isForbiddenError tells the pages when to show the no-access state. Depends on the api-client errors.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const TEACHER_DASHBOARD_ERROR_MESSAGES = {
  "analytics.out_of_scope": "No tienes acceso a este grupo.",
  "analytics.group_not_found": "El grupo ya no existe. Elige otro grupo.",
  "analytics.evaluation_not_found": "La evaluación ya no existe.",
  "analytics.invalid_range": "El rango de fechas no es válido: debe empezar antes de terminar y abarcar como máximo 366 días.",
  "users.user_not_found": "El estudiante no existe.",
  "users.user_not_student": "El usuario no es un estudiante.",
} as const satisfies Record<string, string>;

export const TEACHER_DASHBOARD_FALLBACK_MESSAGES = {
  forbidden: "No tienes acceso a este grupo.",
  notFound: "El recurso solicitado ya no existe. Actualiza la página.",
  invalid: "La solicitud no es válida. Actualiza la página e inténtalo de nuevo.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la operación. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  400: TEACHER_DASHBOARD_FALLBACK_MESSAGES.invalid,
  403: TEACHER_DASHBOARD_FALLBACK_MESSAGES.forbidden,
  404: TEACHER_DASHBOARD_FALLBACK_MESSAGES.notFound,
  422: TEACHER_DASHBOARD_FALLBACK_MESSAGES.invalid,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function isKnownCode(code: string): code is keyof typeof TEACHER_DASHBOARD_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(TEACHER_DASHBOARD_ERROR_MESSAGES, code);
}

export function isForbiddenError(error: unknown): boolean {
  return error !== null && error !== undefined && toApiError(error).status === 403;
}

export function getTeacherDashboardErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownCode(apiError.code)) {
    return TEACHER_DASHBOARD_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return TEACHER_DASHBOARD_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return TEACHER_DASHBOARD_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? TEACHER_DASHBOARD_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return TEACHER_DASHBOARD_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? TEACHER_DASHBOARD_FALLBACK_MESSAGES.unknown;
}

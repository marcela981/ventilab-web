/*
* Funcionalidad: Student space error messages
* Descripción: Spanish message for any failure of a student space request (summary, notes, grades): backend codes of the notes (notes.not_found), then fallbacks by status (403, 404, 400/422, 429 with Retry-After, 5xx), timeout, network and unknown errors. getModuleAnalysisErrorMessage covers the module notes analysis (`POST /api/notes/analyze` with moduleId): 422 without notes in the module, 502 failed AI call, 503 AI unavailable. Depends on the api-client errors.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to a student-space namespace in src/i18n.
export const STUDENT_SPACE_ERROR_MESSAGES = {
  "notes.not_found": "La nota ya no existe. Actualiza la lista.",
} as const satisfies Record<string, string>;

export const STUDENT_SPACE_FALLBACK_MESSAGES = {
  forbidden: "No tienes permiso para ver esta información.",
  notFound: "El recurso solicitado ya no existe. Actualiza la página.",
  invalid: "La solicitud no es válida. Actualiza la página e inténtalo de nuevo.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la operación. Inténtalo de nuevo.",
} as const;

export const MODULE_ANALYSIS_MESSAGES = {
  noNotes: "Todavía no tienes notas en este módulo para analizar.",
  failed: "El servicio de IA no pudo generar el análisis. Inténtalo de nuevo.",
  unavailable: "El servicio de IA no está disponible en este momento. Inténtalo más tarde.",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  400: STUDENT_SPACE_FALLBACK_MESSAGES.invalid,
  403: STUDENT_SPACE_FALLBACK_MESSAGES.forbidden,
  404: STUDENT_SPACE_FALLBACK_MESSAGES.notFound,
  422: STUDENT_SPACE_FALLBACK_MESSAGES.invalid,
};

const ANALYSIS_STATUS_MESSAGES: Record<number, string> = {
  422: MODULE_ANALYSIS_MESSAGES.noNotes,
  502: MODULE_ANALYSIS_MESSAGES.failed,
  503: MODULE_ANALYSIS_MESSAGES.unavailable,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function isKnownCode(code: string): code is keyof typeof STUDENT_SPACE_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(STUDENT_SPACE_ERROR_MESSAGES, code);
}

export function getStudentSpaceErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownCode(apiError.code)) {
    return STUDENT_SPACE_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return STUDENT_SPACE_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return STUDENT_SPACE_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? STUDENT_SPACE_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return STUDENT_SPACE_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? STUDENT_SPACE_FALLBACK_MESSAGES.unknown;
}

export function getModuleAnalysisErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  return ANALYSIS_STATUS_MESSAGES[apiError.status] ?? getStudentSpaceErrorMessage(apiError);
}

/*
* Funcionalidad: Grading error messages
* Descripción: Spanish message for any failure of a grading request: the grading error codes of the backend (evaluation.errors.ts mapped in common/presentation/errors-map.ts: evaluation_not_found 404, question_not_found 404, attempt_not_found 404, management_forbidden 403, grading_forbidden 403, attempt_read_only 409, attempt_not_gradable 409, attempt_not_graded 409, manual_score_invalid 422, grade_override_comment_required 422, grade_feedback_not_available 404, grade_feedback_attempt_not_graded 409, grade_feedback_forbidden 403; analytics.evaluation_not_found 404 and analytics.out_of_scope 403 for the evaluation stats), then fallbacks by status (403, 404, 409, 400/422, 429 with Retry-After, 5xx), timeout, network and unknown errors. Depends on the api-client errors.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to a grading namespace in src/i18n.
export const GRADING_ERROR_MESSAGES = {
  "evaluation.evaluation_not_found": "La evaluación ya no existe o no tienes acceso a ella.",
  "evaluation.question_not_found": "La pregunta no pertenece a esta evaluación. Actualiza la página.",
  "evaluation.attempt_not_found": "El intento ya no existe o no tienes acceso a él. Actualiza la lista.",
  "evaluation.management_forbidden": "No tienes permiso para gestionar esta evaluación.",
  "evaluation.grading_forbidden": "No puedes calificar intentos de este grupo de estudiantes.",
  "evaluation.attempt_read_only": "Los intentos migrados del sistema anterior son de solo lectura.",
  "evaluation.attempt_not_gradable": "El intento todavía está en curso, así que aún no se puede calificar.",
  "evaluation.attempt_not_graded": "Solo se pueden publicar los intentos calificados por completo.",
  "evaluation.manual_score_invalid": "El puntaje debe estar entre 0 y el máximo de la pregunta.",
  "evaluation.grade_override_comment_required": "Para cambiar un puntaje ya asignado debes escribir un comentario.",
  "evaluation.grade_feedback_not_available": "La retroalimentación estará disponible cuando se publique la calificación.",
  "evaluation.grade_feedback_attempt_not_graded": "La retroalimentación solo se puede generar para un intento calificado.",
  "evaluation.grade_feedback_forbidden": "No tienes permiso para revisar este intento.",
  "analytics.evaluation_not_found": "La evaluación ya no existe o no tienes acceso a sus estadísticas.",
  "analytics.out_of_scope": "Las estadísticas solicitadas incluyen grupos que no administras.",
} as const satisfies Record<string, string>;

export const GRADING_FALLBACK_MESSAGES = {
  forbidden: "No tienes permiso para realizar esta acción.",
  notFound: "No se encontró el intento o ya no tienes acceso a él.",
  conflict: "La operación no se pudo completar por un conflicto con el estado actual del intento.",
  invalid: "Revisa los datos ingresados.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la operación. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  400: GRADING_FALLBACK_MESSAGES.invalid,
  403: GRADING_FALLBACK_MESSAGES.forbidden,
  404: GRADING_FALLBACK_MESSAGES.notFound,
  409: GRADING_FALLBACK_MESSAGES.conflict,
  422: GRADING_FALLBACK_MESSAGES.invalid,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function isKnownCode(code: string): code is keyof typeof GRADING_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(GRADING_ERROR_MESSAGES, code);
}

export function getGradingErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownCode(apiError.code)) {
    return GRADING_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return GRADING_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return GRADING_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? GRADING_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return GRADING_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? GRADING_FALLBACK_MESSAGES.unknown;
}

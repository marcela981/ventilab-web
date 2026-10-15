/*
* Funcionalidad: Evaluations error messages
* Descripción: Spanish message for any failure of a student evaluations request: the evaluation error codes the student endpoints can return (backend evaluation.errors.ts mapped in common/presentation/errors-map.ts: not_open 403, max_attempts_reached 409, attempt_deadline_passed 409, attempt_not_in_progress 409, attempt_read_only 409, answer_invalid 422, assignment_closed 409, evaluation/assignment/attempt/question/option not found 404, grade_feedback_not_available 404), then fallbacks by status (403, 404, 409, 400/422, 429 with Retry-After, 5xx), timeout, network and unknown errors. Depends on the api-client errors. v1.1 (A3 review follow-up): isRetryableEvaluationError tells transient failures (network, timeout, 429, 5xx) from permanent ones.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const EVALUATION_ERROR_MESSAGES = {
  "evaluation.not_open": "La evaluación no está abierta en este momento.",
  "evaluation.max_attempts_reached": "Ya usaste todos los intentos permitidos para esta evaluación.",
  "evaluation.attempt_deadline_passed":
    "El tiempo del intento terminó. Se cerró con las respuestas que alcanzaste a guardar.",
  "evaluation.attempt_not_in_progress": "Este intento ya fue enviado.",
  "evaluation.attempt_read_only": "Este intento es de solo lectura.",
  "evaluation.answer_invalid": "La respuesta no es válida para esta pregunta.",
  "evaluation.assignment_closed": "La evaluación ya cerró.",
  "evaluation.assignment_not_found": "No se encontró la evaluación o ya no está asignada a tu grupo.",
  "evaluation.evaluation_not_found": "No se encontró la evaluación.",
  "evaluation.attempt_not_found": "No se encontró el intento o no tienes acceso a él.",
  "evaluation.question_not_found": "La pregunta no pertenece a esta evaluación.",
  "evaluation.option_not_found": "La opción no pertenece a esta pregunta.",
  "evaluation.grade_feedback_not_available": "La retroalimentación estará disponible cuando se publique la nota.",
} as const satisfies Record<string, string>;

export const EVALUATION_FALLBACK_MESSAGES = {
  forbidden: "No tienes permiso para realizar esta acción.",
  notFound: "No se encontró la evaluación o ya no tienes acceso a ella.",
  conflict: "La operación no se pudo completar por un conflicto con el estado actual de la evaluación.",
  invalid: "Revisa los datos ingresados.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la operación. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  400: EVALUATION_FALLBACK_MESSAGES.invalid,
  403: EVALUATION_FALLBACK_MESSAGES.forbidden,
  404: EVALUATION_FALLBACK_MESSAGES.notFound,
  409: EVALUATION_FALLBACK_MESSAGES.conflict,
  422: EVALUATION_FALLBACK_MESSAGES.invalid,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function isKnownCode(code: string): code is keyof typeof EVALUATION_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(EVALUATION_ERROR_MESSAGES, code);
}

export function getEvaluationErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownCode(apiError.code)) {
    return EVALUATION_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return EVALUATION_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return EVALUATION_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? EVALUATION_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return EVALUATION_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? EVALUATION_FALLBACK_MESSAGES.unknown;
}

// Transient failures worth retrying automatically: no connection, timeout, rate limit or server error.
export function isRetryableEvaluationError(error: unknown): boolean {
  const apiError = toApiError(error);

  return apiError.code === CLIENT_ERROR_CODES.networkUnavailable
    || apiError.code === CLIENT_ERROR_CODES.networkTimeout
    || apiError.status === 429
    || apiError.status >= 500;
}

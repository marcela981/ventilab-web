/*
* Funcionalidad: Evaluation authoring error messages
* Descripción: Spanish message for any failure of an evaluation authoring request: the authoring error codes of the backend (evaluation.errors.ts mapped in common/presentation/errors-map.ts: evaluation_not_found 404, management_forbidden 403, has_submitted_attempts 409, invalid_status_transition 409, not_ready 422, options_not_allowed 422, media_not_found 422, reference_not_found 422, invalid_reorder 400, invalid_rich_text 400, assignment_not_found 404, assignment_forbidden 403, not_activatable 409, assignment_group_invalid 422, assignment_window_invalid 422, assignment_overlap 409, assignment_closed 409, assignment_has_attempts 409), then fallbacks by status (403, 404, 409, 400/422, 429 with Retry-After, 5xx), timeout, network and unknown errors. Depends on the api-client errors. v1.1 (A4): getAssignmentErrorMessage for the activations page: the same map, but a 403 without a more specific code explains that the caller can only activate or change activations of the groups they manage.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const AUTHORING_ERROR_MESSAGES = {
  "evaluation.evaluation_not_found": "La evaluación ya no existe o no tienes acceso a ella. Actualiza la lista.",
  "evaluation.management_forbidden": "No tienes permiso para gestionar esta evaluación.",
  "evaluation.has_submitted_attempts":
    "La evaluación ya tiene intentos enviados, así que su estructura no se puede cambiar. Duplícala para crear una versión nueva.",
  "evaluation.invalid_status_transition": "La evaluación no puede pasar a ese estado desde su estado actual. Actualiza la lista.",
  "evaluation.not_ready": "La evaluación todavía no está lista: revisa las preguntas pendientes en el editor.",
  "evaluation.options_not_allowed": "Solo las preguntas de selección tienen opciones.",
  "evaluation.media_not_found": "Uno de los archivos multimedia ya no existe. Vuelve a subirlo.",
  "evaluation.reference_not_found": "El módulo, nivel, lección o caso clínico indicado ya no existe.",
  "evaluation.invalid_reorder": "El nuevo orden no coincide con los elementos actuales. Actualiza la página.",
  "evaluation.invalid_rich_text": "El contenido tiene un formato no válido.",
  "evaluation.assignment_not_found": "Esa activación ya no existe. Actualiza la página.",
  "evaluation.assignment_forbidden": "No tienes permiso para gestionar esta activación.",
  "evaluation.not_activatable": "Solo una evaluación lista se puede activar.",
  "evaluation.assignment_group_invalid": "Uno de los grupos elegidos no es válido para esta activación.",
  "evaluation.assignment_window_invalid": "Revisa las fechas: el inicio debe ser anterior al cierre y el cierre debe estar en el futuro.",
  "evaluation.assignment_overlap": "La evaluación ya está activa para ese grupo en esas fechas.",
  "evaluation.assignment_closed": "Esta activación ya está cerrada.",
  "evaluation.assignment_has_attempts": "La activación ya tiene intentos, así que no se puede modificar.",
} as const satisfies Record<string, string>;

export const AUTHORING_FALLBACK_MESSAGES = {
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
  400: AUTHORING_FALLBACK_MESSAGES.invalid,
  403: AUTHORING_FALLBACK_MESSAGES.forbidden,
  404: AUTHORING_FALLBACK_MESSAGES.notFound,
  409: AUTHORING_FALLBACK_MESSAGES.conflict,
  422: AUTHORING_FALLBACK_MESSAGES.invalid,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function isKnownCode(code: string): code is keyof typeof AUTHORING_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(AUTHORING_ERROR_MESSAGES, code);
}

export function getAuthoringErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownCode(apiError.code)) {
    return AUTHORING_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return AUTHORING_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return AUTHORING_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? AUTHORING_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return AUTHORING_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? AUTHORING_FALLBACK_MESSAGES.unknown;
}

export const ASSIGNMENT_FORBIDDEN_MESSAGE =
  "No tienes permiso para gestionar las activaciones de esta evaluación o de alguno de esos grupos. Solo puedes usar los grupos que administras.";

// The activations page: same messages, with a clearer 403 when the backend sends no specific code.
export function getAssignmentErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.status === 403 && !isKnownCode(apiError.code)) {
    return ASSIGNMENT_FORBIDDEN_MESSAGE;
  }

  return getAuthoringErrorMessage(apiError);
}

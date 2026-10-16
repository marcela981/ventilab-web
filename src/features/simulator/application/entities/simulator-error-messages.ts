/*
* Funcionalidad: Simulator error messages
* Descripción: Spanish messages for the simulator API errors: the backend domain codes of the simulation sessions (simulation.case_not_found, case_not_ready, case_required, rubric_invalid, exam_access_denied, session_not_found, session_access_denied, session_not_active), then the client network codes, 429 with its Retry-After wait, 5xx and a per-status fallback. Depends on the api-client error helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const SIMULATOR_ERROR_MESSAGES = {
  "simulation.case_not_found": "No se encontró el caso clínico o ya no está publicado.",
  "simulation.case_not_ready": "Este caso todavía no se puede simular. Elige otro caso.",
  "simulation.case_required": "Elige un caso clínico para iniciar la práctica.",
  "simulation.rubric_invalid": "La rúbrica del caso no es válida. Avísale a tu docente.",
  "simulation.exam_access_denied": "El intento o la pregunta del examen no permiten esta simulación.",
  "simulation.session_not_found": "No se encontró la sesión de simulación.",
  "simulation.session_access_denied": "No tienes acceso a esta sesión de simulación.",
  "simulation.session_not_active": "La sesión de simulación ya terminó.",
} as const satisfies Record<string, string>;

export const SIMULATOR_FALLBACK_MESSAGES = {
  forbidden: "No tienes permiso para realizar esta acción.",
  notFound: "No se encontró el recurso solicitado.",
  conflict: "La operación no se pudo completar por el estado actual del caso o de la sesión.",
  invalid: "Revisa los datos enviados.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la operación. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  400: SIMULATOR_FALLBACK_MESSAGES.invalid,
  403: SIMULATOR_FALLBACK_MESSAGES.forbidden,
  404: SIMULATOR_FALLBACK_MESSAGES.notFound,
  409: SIMULATOR_FALLBACK_MESSAGES.conflict,
  422: SIMULATOR_FALLBACK_MESSAGES.invalid,
};

function isKnownCode(code: string): code is keyof typeof SIMULATOR_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(SIMULATOR_ERROR_MESSAGES, code);
}

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

export function getSimulatorErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownCode(apiError.code)) {
    return SIMULATOR_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return SIMULATOR_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return SIMULATOR_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? SIMULATOR_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return SIMULATOR_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? SIMULATOR_FALLBACK_MESSAGES.unknown;
}

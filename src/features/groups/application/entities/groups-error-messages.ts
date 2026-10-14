/*
* Funcionalidad: Groups error messages
* Descripción: Spanish message for any failure of a groups request: every groups error code of the backend (openapi Backend facts: student_already_in_group 409, member_role_not_allowed 422, leader_not_allowed 422, group_full 409, management_forbidden 403, type_creation_forbidden 403; plus group_has_subgroups and lead_not_member from the backend domain errors, used by slice B), then fallbacks by status (403, 404, 409, 400/422, 429 with Retry-After, 5xx), timeout, network and unknown errors. The UI hides actions the role cannot use, but a 403 is always handled here. Depends on the api-client errors.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to a groups namespace in src/i18n.
export const GROUP_ERROR_MESSAGES = {
  "groups.student_already_in_group": "Este estudiante ya pertenece a otro grupo activo de estudiantes.",
  "groups.member_role_not_allowed":
    "Ese usuario no puede integrar este grupo: los grupos de estudiantes solo admiten estudiantes y los de docentes solo docentes o administradores.",
  "groups.leader_not_allowed": "Solo los grupos de estudiantes tienen líder.",
  "groups.group_full": "El grupo ya alcanzó su límite de estudiantes.",
  "groups.management_forbidden": "No tienes permiso para gestionar este grupo.",
  "groups.type_creation_forbidden": "No tienes permiso para crear este tipo de grupo.",
  "groups.group_has_subgroups": "Elimina o desactiva primero los subgrupos de este grupo.",
  "groups.lead_not_member": "El líder debe ser integrante del grupo.",
} as const satisfies Record<string, string>;

export const GROUP_FALLBACK_MESSAGES = {
  forbidden: "No tienes permiso para realizar esta acción.",
  notFound: "No se encontró el grupo o ya no tienes acceso a él.",
  conflict: "La operación no se pudo completar por un conflicto con el estado actual del grupo.",
  invalid: "Revisa los datos ingresados.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la operación. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  400: GROUP_FALLBACK_MESSAGES.invalid,
  403: GROUP_FALLBACK_MESSAGES.forbidden,
  404: GROUP_FALLBACK_MESSAGES.notFound,
  409: GROUP_FALLBACK_MESSAGES.conflict,
  422: GROUP_FALLBACK_MESSAGES.invalid,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function isKnownCode(code: string): code is keyof typeof GROUP_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(GROUP_ERROR_MESSAGES, code);
}

export function getGroupErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownCode(apiError.code)) {
    return GROUP_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return GROUP_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return GROUP_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? GROUP_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return GROUP_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? GROUP_FALLBACK_MESSAGES.unknown;
}

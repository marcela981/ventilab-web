/*
* Funcionalidad: Lab error messages
* Descripción: Spanish message of a failed lab read: the client network codes, the 429 wait from Retry-After and a message per HTTP status. v1.1 (T2): the Spanish messages of POST /api/reservations by backend code (upcoming limit, outside the booking window, slot in the past, overlap, misaligned, too long, forbidden or missing holder), with the configured values from the lab settings. v1.2 (T3): getCreateReservationFailureMessage, the create or preemption failure with the "only an admin can preempt" message for an overlap with a teacher's or admin's reservation. v1.3 (T4): getCancelReservationErrorMessage, the Spanish messages of POST /api/reservations/{id}/cancel by backend code (forbidden, no longer scheduled, not found). v1.4 (T3 review fix S2): the admin-only preemption message also names a group of teachers (a TEACHER-type group holder). Later tasks add the control and command codes. Depends on the api-client error helpers, the date format helper and the create reservation entities.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import { formatDuration } from "@shared/lib/format";
import { requiresAdminToPreempt, RESERVATION_ERROR_CODES } from "./create-reservation.entity";
import type { ReservationConflict } from "./create-reservation.entity";
import type { LabSettings } from "./lab-settings.entity";
import { CANCEL_RESERVATION_ERROR_CODES } from "./my-reservations.entity";

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

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const CREATE_RESERVATION_ERROR_COPY = {
  limitReached: "Ya tienes el máximo de reservas próximas permitido. Cancela una o espera a que termine para reservar otra.",
  tooFarAhead: (days: number) => `Esa franja está fuera de la ventana de reserva: solo puedes reservar con hasta ${days} ${days === 1 ? "día" : "días"} de antelación.`,
  inPast: "Esa franja ya pasó. Elige la franja en curso o una futura.",
  overlap: "La franja se solapa con otra reserva. Elige otra franja o una duración menor.",
  notAligned: (minutes: number) => `La reserva debe empezar y terminar en franjas de ${minutes} minutos.`,
  tooLong: (minutes: number) => `La reserva no puede durar más de ${formatDuration(minutes)}.`,
  invalidWindow: "La reserva debe terminar después de empezar.",
  forbidden: "No puedes reservar el ventilador para este usuario o grupo.",
  holderNotFound: "El usuario o grupo elegido ya no existe. Elige otro titular.",
  invalidHolder: "Elige para quién es la reserva.",
  adminOnlyPreempt: "La franja se solapa con una reserva de un docente, de un administrador o de un grupo de docentes. Solo un administrador puede desplazarla; elige otra franja.",
} as const;

/** Spanish message of a failed POST /api/reservations, by backend code; the generic lab message otherwise. */
export function getCreateReservationErrorMessage(error: unknown, settings: LabSettings): string {
  const apiError = toApiError(error);

  switch (apiError.code) {
    case RESERVATION_ERROR_CODES.limitReached:
      return CREATE_RESERVATION_ERROR_COPY.limitReached;
    case RESERVATION_ERROR_CODES.tooFarAhead:
      return CREATE_RESERVATION_ERROR_COPY.tooFarAhead(settings["reservations.maxAdvanceDays"]);
    case RESERVATION_ERROR_CODES.inPast:
      return CREATE_RESERVATION_ERROR_COPY.inPast;
    case RESERVATION_ERROR_CODES.conflict:
    case RESERVATION_ERROR_CODES.conflictPreemptable:
      return CREATE_RESERVATION_ERROR_COPY.overlap;
    case RESERVATION_ERROR_CODES.notAligned:
      return CREATE_RESERVATION_ERROR_COPY.notAligned(settings["reservations.slotMinutes"]);
    case RESERVATION_ERROR_CODES.tooLong:
      return CREATE_RESERVATION_ERROR_COPY.tooLong(settings["reservations.maxDurationMinutes"]);
    case RESERVATION_ERROR_CODES.invalidWindow:
      return CREATE_RESERVATION_ERROR_COPY.invalidWindow;
    case RESERVATION_ERROR_CODES.reserveForbidden:
      return CREATE_RESERVATION_ERROR_COPY.forbidden;
    case RESERVATION_ERROR_CODES.holderNotFound:
      return CREATE_RESERVATION_ERROR_COPY.holderNotFound;
    case RESERVATION_ERROR_CODES.invalidHolder:
      return CREATE_RESERVATION_ERROR_COPY.invalidHolder;
    default:
      return getLabErrorMessage(apiError);
  }
}

/**
 * Message of a failed create, also for the staff preemption retry: an overlap with a teacher's or admin's reservation
 * says that only an admin can preempt it; anything else uses the backend code message.
 */
export function getCreateReservationFailureMessage(error: unknown, conflict: ReservationConflict | null, settings: LabSettings): string {
  return requiresAdminToPreempt(conflict)
    ? CREATE_RESERVATION_ERROR_COPY.adminOnlyPreempt
    : getCreateReservationErrorMessage(error, settings);
}

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const CANCEL_RESERVATION_ERROR_COPY = {
  forbidden: "No puedes cancelar esta reserva. Solo pueden hacerlo quien la creó, su titular, el líder del grupo titular, un docente que supervise ese grupo o un administrador.",
  notScheduled: "Esta reserva ya no está programada: fue cancelada, desplazada o ya terminó.",
  notFound: "La reserva ya no existe.",
} as const;

/** Spanish message of a failed POST /api/reservations/{id}/cancel, by backend code; the generic lab message otherwise. */
export function getCancelReservationErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  switch (apiError.code) {
    case CANCEL_RESERVATION_ERROR_CODES.forbidden:
      return CANCEL_RESERVATION_ERROR_COPY.forbidden;
    case CANCEL_RESERVATION_ERROR_CODES.notScheduled:
      return CANCEL_RESERVATION_ERROR_COPY.notScheduled;
    case CANCEL_RESERVATION_ERROR_CODES.notFound:
      return CANCEL_RESERVATION_ERROR_COPY.notFound;
    default:
      return getLabErrorMessage(apiError);
  }
}

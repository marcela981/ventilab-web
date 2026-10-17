/*
* Funcionalidad: My reservations entity
* Descripción: Pure model of "Mis reservas" on /lab/reservations. GET /api/reservations/mine returns only reservations whose window has not ended (any status), so the split is by status: upcoming = scheduled and not ended (ordered by start; the one in progress is labelled "En curso"); past = cancelled, preempted, completed or already ended (most recent first). canCancelReservation mirrors the backend cancel rules (reservation-access-policy.canCancel + Reservation.cancel: an admin, the creator, the holder user, the leader of the holder group or a teacher who supervises it, and only while the reservation is SCHEDULED) only to show or hide the button: the backend stays the authority and its errors are shown. Also the cancel error codes. Depends on the reservation entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { reservationStatusLabel, UPCOMING_STATUS } from "./reservation.entity";
import type { LabReservation } from "./reservation.entity";

/** Backend codes of POST /api/reservations/{id}/cancel (reservations.errors.ts). */
export const CANCEL_RESERVATION_ERROR_CODES = {
  forbidden: "reservations.cancel_forbidden",
  notScheduled: "reservations.not_scheduled",
  notFound: "reservations.reservation_not_found",
} as const;

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const IN_PROGRESS_LABEL = "En curso";

export type MyReservationsSplit = {
  upcoming: LabReservation[]
  past: LabReservation[]
};

/** Who asks to cancel: session user and role, the groups they lead and (teachers) the groups they supervise. */
export type CancelActor = {
  userId: string | null
  role: string | null
  leadGroupIds: ReadonlySet<string>
  supervisedGroupIds: ReadonlySet<string>
};

const startMs = (reservation: LabReservation): number => new Date(reservation.startsAt).getTime();
const endMs = (reservation: LabReservation): number => new Date(reservation.endsAt).getTime();

function isOpenScheduled(reservation: LabReservation, now: Date): boolean {
  return reservation.status === UPCOMING_STATUS && endMs(reservation) > now.getTime();
}

export function isInProgress(reservation: LabReservation, now: Date): boolean {
  return isOpenScheduled(reservation, now) && startMs(reservation) <= now.getTime();
}

export function splitMyReservations(reservations: readonly LabReservation[], now: Date): MyReservationsSplit {
  const upcoming = reservations.filter((reservation) => isOpenScheduled(reservation, now));
  const past = reservations.filter((reservation) => !isOpenScheduled(reservation, now));

  return {
    upcoming: upcoming.sort((a, b) => startMs(a) - startMs(b)),
    past: past.sort((a, b) => startMs(b) - startMs(a)),
  };
}

export function myReservationStatusLabel(reservation: LabReservation, now: Date): string {
  return isInProgress(reservation, now) ? IN_PROGRESS_LABEL : reservationStatusLabel(reservation.status);
}

/** Whether to offer "Cancelar" (backend: ReservationCancelForbiddenError / ReservationNotScheduledError otherwise). */
export function canCancelReservation(reservation: LabReservation, actor: CancelActor, now: Date): boolean {
  if (reservation.visibility !== "full" || !isOpenScheduled(reservation, now) || actor.userId === null) {
    return false;
  }

  if (actor.role === "ADMIN" || reservation.createdById === actor.userId || reservation.holderUserId === actor.userId) {
    return true;
  }

  if (reservation.holderType !== "GROUP" || reservation.groupId === null) {
    return false;
  }

  return actor.leadGroupIds.has(reservation.groupId)
    || (actor.role === "TEACHER" && actor.supervisedGroupIds.has(reservation.groupId));
}

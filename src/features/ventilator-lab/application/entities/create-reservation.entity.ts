/*
* Funcionalidad: Create reservation entities
* Descripción: Client model of booking the ventilator: the holder options offered by role (the caller; the student groups the caller leads, supervises or, for an admin, any active group; any user for an admin), the request built by the dialog (holder, start, duration in minutes, optional purpose, confirmPreempt reserved for the staff preemption flow), the overlap conflict the backend returns with a 409 (whether confirmPreempt would preempt and the overlapping reservations as the backend describes them) and the backend error codes of the create endpoint. Names come only from the backend. v1.1 (T3): requiresAdminToPreempt, the teacher-versus-teacher case (a non-preemptable overlap with a teacher's or admin's reservation, as the backend canPreempt decides). No dependencies.
*   v1.2 (W7, Bloque 1): a request without start (startsAt null) is an immediate reservation from now; the immediate durations 15/30/45/60 min (default 30).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReservationHolderType } from "./reservation.entity";

export type HolderKind = "self" | "group" | "user";

export type HolderOption = {
  kind: HolderKind
  /** Stable key of the option (the group or user id; "self" for the caller). */
  key: string
  holderType: ReservationHolderType
  /** Holder user; null for the caller (the backend uses the caller when userId is omitted). */
  userId: string | null
  groupId: string | null
  /** Group name, or user name (its email when empty), exactly as returned by the backend. */
  label: string
};

export const SELF_HOLDER: HolderOption = {
  kind: "self",
  key: "self",
  holderType: "USER",
  userId: null,
  groupId: null,
  label: "Para mí",
};

export type CreateReservationRequest = {
  holder: HolderOption
  /** Start on a slot boundary; null books an immediate reservation from now ("Reservar ahora"). */
  startsAt: Date | null
  durationMinutes: number
  /** Trimmed by the mapper; empty is not sent. */
  purpose: string
  /** Staff only: preempt the overlapping reservations they may preempt (T3 flow). */
  confirmPreempt?: boolean
};

export type ReservationConflictItem = {
  reservationId: string | null
  holderType: string | null
  holderRole: string | null
  holderName: string | null
  holderIdentifier: string | null
  groupName: string | null
  startsAt: string
  endsAt: string
};

export type ReservationConflict = {
  /** The caller may preempt every overlapping reservation by retrying with confirmPreempt. */
  preemptable: boolean
  conflicts: ReservationConflictItem[]
};

/** Error codes of POST /api/reservations (ventylab-server reservations.errors.ts, i18n keys of the error envelope). */
export const RESERVATION_ERROR_CODES = {
  conflict: "reservations.conflict",
  conflictPreemptable: "reservations.conflict_preemptable",
  limitReached: "reservations.limit_reached",
  tooFarAhead: "reservations.too_far_ahead",
  inPast: "reservations.in_past",
  notAligned: "reservations.not_aligned",
  tooLong: "reservations.too_long",
  invalidWindow: "reservations.invalid_window",
  invalidHolder: "reservations.invalid_holder",
  holderNotFound: "reservations.holder_not_found",
  reserveForbidden: "reservations.reserve_forbidden",
} as const;

export const MAX_PURPOSE_LENGTH = 500;

export function reservationEnd(request: { startsAt: Date, durationMinutes: number }): Date {
  return new Date(request.startsAt.getTime() + request.durationMinutes * 60_000);
}

/** Durations (minutes) of an immediate reservation (backend CreateReservationDTO.durationMinutes) and the default. */
export const IMMEDIATE_DURATIONS = [15, 30, 45, 60] as const;

export type ImmediateDuration = (typeof IMMEDIATE_DURATIONS)[number];

export const DEFAULT_IMMEDIATE_DURATION: ImmediateDuration = 30;

/** How the booking dialog places the reservation: a calendar slot, or now (immediate). */
export type ReservationTiming = "slot" | "now";

export function isImmediateDuration(minutes: number): minutes is ImmediateDuration {
  return IMMEDIATE_DURATIONS.some((duration) => duration === minutes);
}

/** Holder roles whose reservations only an admin may preempt (ventylab-server reservation-access-policy canPreempt). */
const ADMIN_ONLY_PREEMPT_ROLES: ReadonlySet<string> = new Set(["TEACHER", "ADMIN"]);

/**
 * A 409 overlap the caller may not preempt because a teacher or an admin holds one of the reservations: only an admin
 * can preempt it. A student's 409 carries no roles, so it is never this case.
 */
export function requiresAdminToPreempt(conflict: ReservationConflict | null): boolean {
  return conflict !== null
    && !conflict.preemptable
    && conflict.conflicts.some((item) => item.holderRole !== null && ADMIN_ONLY_PREEMPT_ROLES.has(item.holderRole));
}

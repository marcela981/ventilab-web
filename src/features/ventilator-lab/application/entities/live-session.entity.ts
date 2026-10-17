/*
* Funcionalidad: Live session entity
* Descripción: Pure rules of the /lab/live page. resolveLiveAccess decides from the backend current reservation (GET /api/reservations/current: `canControl` is true for the holder user, members of the holder group, teachers and admins) whether the caller sees the console (only with an active reservation: it is the data source and the room the backend opens), the "Equipo ocupado" screen with the occupancy label exactly as the backend returned it for the caller's role, or the nothing-reserved screen. joinRejectedMessage translates the `ventilator:join-rejected` reasons; formatReservationCountdown renders the time left of the reservation. v1.1 (T9 review fix B1): sessionRemainingMs gives the time left only on a synchronised server clock (null while pending or unsynced). Depends on the shared server clock, the reservation entity and the realtime contract types.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { remainingUntilMs } from "@shared/lib/server-clock";
import type { VentilatorJoinRejectedReason } from "@shared/realtime";
import { reservationHolderText } from "./reservation.entity";
import type { CurrentReservation, LabReservation } from "./reservation.entity";

export type LiveAccess =
  | { kind: "console", reservation: LabReservation }
  | { kind: "busy", label: string | null }
  | { kind: "none" };

export function resolveLiveAccess(current: CurrentReservation): LiveAccess {
  const { reservation, canControl } = current;

  if (!reservation) {
    return { kind: "none" };
  }

  return canControl ? { kind: "console", reservation } : { kind: "busy", label: reservationHolderText(reservation) };
}

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const JOIN_REJECTED_MESSAGES: Readonly<Record<VentilatorJoinRejectedReason, string>> = {
  no_active_reservation: "No hay una reserva activa del ventilador en este momento.",
  not_reservation_holder: "La reserva activa no es tuya ni de tu grupo.",
};

const JOIN_REJECTED_FALLBACK = "El servidor no permitió entrar a la sala del ventilador.";

export function joinRejectedMessage(reason: string): string {
  return Object.prototype.hasOwnProperty.call(JOIN_REJECTED_MESSAGES, reason)
    ? JOIN_REJECTED_MESSAGES[reason as VentilatorJoinRejectedReason]
    : JOIN_REJECTED_FALLBACK;
}

/** mm:ss below one hour, h:mm:ss above; partial seconds round up (the last second shows 00:01). */
export function formatReservationCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** The server clock as measured by the page (useServerClockOffset). */
export type ServerClockReading = { status: "pending" | "synced" | "unsynced", offsetMs: number | null };

/**
 * Time left of the session reservation on the SERVER clock, or null while that clock is pending or unsynced (T9 review
 * fix B1): the countdown ends the session for good, so the browser clock (possibly skewed) must never decide it.
 */
export function sessionRemainingMs(endsAt: string, clientNowMs: number, clock: ServerClockReading): number | null {
  if (clock.status !== "synced" || clock.offsetMs === null) {
    return null;
  }

  return remainingUntilMs(endsAt, clientNowMs, clock.offsetMs);
}


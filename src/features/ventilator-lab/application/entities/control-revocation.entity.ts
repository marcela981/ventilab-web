/*
* Funcionalidad: Control revoked (live console session)
* Descripción: Pure model of the end of a live console session and of the loss of the operator control, built only
*   from what the backend sends. Session end (blocking modal): `ventilator:control-changed` with reason
*   reservation_preempted / reservation_ended for the session reservation, `reservation:preempted` of the session
*   reservation (with the backend reason), the reservation countdown on the server clock reaching zero, or a re-read
*   of GET /api/reservations/current that no longer gives the session reservation to the caller; the most specific
*   reason wins (preempted > ended > time up > session changed). The modal copy per reason, the preemption reason as
*   sent, the next holder ONLY as the backend projection of the re-read describes it (holder name / group for staff,
*   the occupancy label for a student; never built on the client) and the next action decided ONLY by the re-read
*   `canControl` of ANOTHER active reservation (watch read-only, or leave to /lab). Control loss while the reservation continues (non-blocking
*   notice, the console goes read-only): takeover / taken by someone else ("<name> tomó el control" only with the name
*   the backend gave, else "Otra persona"), presence_timeout, a release by a teacher/admin, or a loss found on a
*   re-read. Backend semantics (operator-control.service): takeover reassigns the operator and keeps the reservation,
*   so it is a notice, not the revoked modal. Depends on the realtime event types and the reservation entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReservationPreemptedEvent, VentilatorControlChangedEvent } from "@shared/realtime";
import type { ControlLoss } from "./operator-control.entity";
import { reservationHolderText } from "./reservation.entity";
import type { CurrentReservation } from "./reservation.entity";

export type RevocationReason = "reservation_preempted" | "reservation_ended" | "time_up" | "session_changed";

export type Revocation = {
  reason: RevocationReason
  /** Text the backend sent with it (preemption reason), or null. */
  detail: string | null
};

export type RevocationNextAction = "watch" | "leave";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const REVOCATION_COPY = {
  reservation_preempted: {
    title: "La reserva fue desplazada",
    description: "Un docente o un administrador desplazó esta reserva del ventilador. El control del equipo se liberó y ya no se pueden enviar cambios.",
  },
  reservation_ended: {
    title: "La reserva terminó",
    description: "Esta reserva del ventilador se canceló o finalizó. El control del equipo se liberó y ya no se pueden enviar cambios.",
  },
  time_up: {
    title: "Terminó el tiempo de la reserva",
    description: "La reserva llegó a su hora de fin. El control del equipo se libera y ya no se pueden enviar cambios.",
  },
  session_changed: {
    title: "La sesión de esta reserva terminó",
    description: "La reserva activa del ventilador ya no es esta. Ya no se pueden enviar cambios.",
  },
  reasonLabel: (reason: string) => `Motivo: ${reason}`,
  successor: (holder: string) => `Ahora el ventilador está reservado por: ${holder}`,
  successorUnknown: "otra reserva",
  free: "El ventilador quedó sin reserva activa.",
  checking: "Comprobando…",
  acknowledge: "Entendido",
  readOnlyReason: "La reserva de esta sesión terminó: la consola es de solo lectura.",
  readError: "No se pudo comprobar la reserva activa. Inténtalo de nuevo.",
  loss: {
    takenBy: (name: string) => `${name} tomó el control del equipo.`,
    someone: "Otra persona",
    presenceTimeout: "Se liberó tu control del equipo porque tu conexión con el servidor se interrumpió más tiempo del permitido.",
    released: "Un docente o un administrador liberó tu control del equipo.",
    lost: "Ya no tienes el control del equipo.",
    readOnly: "La consola quedó en solo lectura; los cambios sin confirmar se descartaron.",
    retake: "Puedes volver a tomarlo con «Tomar control».",
    dismiss: "Cerrar aviso",
  },
} as const;

/** Most specific first. */
const PRIORITY: Readonly<Record<RevocationReason, number>> = {
  reservation_preempted: 3,
  reservation_ended: 2,
  time_up: 1,
  session_changed: 0,
};

export function revocationFromControlEvent(event: VentilatorControlChangedEvent, sessionReservationId: string): Revocation | null {
  if (event.reservationId !== sessionReservationId) {
    return null;
  }

  if (event.reason === "reservation_preempted" || event.reason === "reservation_ended") {
    return { reason: event.reason, detail: null };
  }

  return null;
}

export function revocationFromPreemption(event: ReservationPreemptedEvent, sessionReservationId: string): Revocation | null {
  if (event.reservationId !== sessionReservationId) {
    return null;
  }

  const detail = event.reason?.trim() ? event.reason.trim() : null;

  return { reason: "reservation_preempted", detail };
}

/** The countdown on the server clock reached zero; an unreadable countdown never ends the session. */
export function isReservationTimeUp(remainingMs: number | null): boolean {
  return remainingMs !== null && remainingMs <= 0;
}

/** A re-read that no longer gives the session reservation to the caller ends the session. */
export function revocationFromRead(current: CurrentReservation, sessionReservationId: string): Revocation | null {
  if (current.reservation?.id === sessionReservationId && current.canControl) {
    return null;
  }

  return { reason: "session_changed", detail: null };
}

export function mergeRevocation(current: Revocation | null, next: Revocation): Revocation {
  if (current === null) {
    return next;
  }

  const winner = PRIORITY[next.reason] > PRIORITY[current.reason] ? next : current;

  return { reason: winner.reason, detail: current.detail ?? next.detail };
}

export type RevocationModal = {
  title: string
  description: string
  detail: string | null
  /** Who holds the ventilator now, per the backend projection of the re-read; null while unknown. */
  successor: string | null
};

export function revocationModal(
  revocation: Revocation,
  current: CurrentReservation | null,
  sessionReservationId: string,
): RevocationModal {
  const copy = REVOCATION_COPY[revocation.reason];
  let successor: string | null = null;

  if (current && current.reservation === null) {
    successor = REVOCATION_COPY.free;
  } else if (current?.reservation && current.reservation.id !== sessionReservationId) {
    successor = REVOCATION_COPY.successor(reservationHolderText(current.reservation) ?? REVOCATION_COPY.successorUnknown);
  }

  return {
    title: copy.title,
    description: copy.description,
    detail: revocation.detail === null ? null : REVOCATION_COPY.reasonLabel(revocation.detail),
    successor,
  };
}

/**
 * Watch (read-only console of the active reservation) only when the backend lets the caller into ANOTHER active
 * reservation; a re-read still returning the ended one (backend not refreshed yet) leaves too.
 */
export function nextActionAfterRevocation(current: CurrentReservation, sessionReservationId: string): RevocationNextAction {
  return current.reservation !== null && current.canControl && current.reservation.id !== sessionReservationId ? "watch" : "leave";
}

export type ControlLossNotice = { text: string, readOnly: string };

export function controlLossNotice(loss: ControlLoss, operatorName: string | null): ControlLossNotice {
  const { loss: copy } = REVOCATION_COPY;
  let text: string;

  switch (loss.reason) {
    case "taken":
    case "takeover":
      text = copy.takenBy(operatorName ?? copy.someone);
      break;
    case "presence_timeout":
      text = copy.presenceTimeout;
      break;
    case "released":
      text = copy.released;
      break;
    default:
      text = copy.lost;
  }

  return { text, readOnly: copy.readOnly };
}

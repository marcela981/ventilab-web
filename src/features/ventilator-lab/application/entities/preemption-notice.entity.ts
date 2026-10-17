/*
* Funcionalidad: Preemption notice entities
* Descripción: Spanish notice shown to the holder of a reservation preempted by a teacher or an admin, keyed by the reservation id so the same preemption is announced once: from the reservation:preempted event (Bogota window, "en curso" when it was active, the reason when the backend sends it) or, as a fallback, from a RESERVATION_PREEMPTED notification:new (its backend body; data.reservationId). No holder names are built. Depends on the slot grid labels.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { slotWindowLabel } from "./slot-grid";

export type PreemptionNotice = {
  reservationId: string
  message: string
};

/** Fields of the reservation:preempted payload the notice needs. */
export type PreemptedReservationInput = {
  reservationId: string
  startsAt: string
  endsAt: string
  reason: string | null
  wasActive: boolean
};

/** Fields of a notification:new payload the notice needs. */
export type PreemptionNotificationInput = {
  type: string
  body: string
  data: unknown
};

export const RESERVATION_PREEMPTED_NOTIFICATION = "RESERVATION_PREEMPTED";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const PREEMPTION_NOTICE_COPY = {
  preempted: (window: string) => `Tu reserva del ventilador (${window}) fue desplazada por un docente o administrador.`,
  activePreempted: (window: string) => `Tu reserva en curso del ventilador (${window}) fue desplazada por un docente o administrador.`,
  reason: (reason: string) => ` Motivo: ${reason}`,
} as const;

export function noticeFromPreemptedEvent(event: PreemptedReservationInput): PreemptionNotice {
  const window = slotWindowLabel(new Date(event.startsAt), new Date(event.endsAt));
  const base = event.wasActive ? PREEMPTION_NOTICE_COPY.activePreempted(window) : PREEMPTION_NOTICE_COPY.preempted(window);
  const reason = event.reason?.trim() ? PREEMPTION_NOTICE_COPY.reason(event.reason.trim()) : "";

  return { reservationId: event.reservationId, message: `${base}${reason}` };
}

/** Notice of a RESERVATION_PREEMPTED notification with its reservation id; null for any other notification. */
export function noticeFromNotification(notification: PreemptionNotificationInput): PreemptionNotice | null {
  if (notification.type !== RESERVATION_PREEMPTED_NOTIFICATION) {
    return null;
  }

  const data = notification.data;
  const reservationId = typeof data === "object" && data !== null ? (data as Record<string, unknown>).reservationId : undefined;

  return typeof reservationId === "string" ? { reservationId, message: notification.body } : null;
}

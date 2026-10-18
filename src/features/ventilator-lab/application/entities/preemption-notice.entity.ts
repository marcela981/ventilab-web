/*
* Funcionalidad: Preemption notice entities
* Descripción: Spanish notice shown to the holder of a reservation preempted by a teacher or an admin, keyed by the reservation id so the same preemption is announced once: from the reservation:preempted event (Bogota window, "en curso" when it was active, the reason when the backend sends it) or, as a fallback, from a RESERVATION_PREEMPTED notification:new (its backend body; data.reservationId). No holder names are built. Depends on the slot grid labels and the realtime event types. v1.1 (B2 closure): the reservation id is read from the typed notification data of the contract (no cast). v1.2 (closure B1): the input is the distributive pick of the per-type notification:new union, so `type` narrows `data` (no `"reservationId" in data` check).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { NotificationNewEvent } from "@shared/realtime";
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

/** Fields of a notification:new payload the notice needs (`data` typed per notification type by the contract). */
export type PreemptionNotificationInput = NotificationNewEvent extends infer Variant
  ? Variant extends NotificationNewEvent ? Pick<Variant, "type" | "body" | "data"> : never
  : never;

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
  // `type` narrows `data` to the RESERVATION_PREEMPTED variant of the contract.
  if (notification.type !== RESERVATION_PREEMPTED_NOTIFICATION || notification.data === null) {
    return null;
  }

  return { reservationId: notification.data.reservationId, message: notification.body };
}

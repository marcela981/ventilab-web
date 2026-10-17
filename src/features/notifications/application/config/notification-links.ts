/*
* Funcionalidad: Notification deep links
* Descripción: The only rule that turns a notification into the route it opens, an exhaustive switch on the typed notification (`type` narrows its `data`, so the ids are read without casts): RESERVATION_PREEMPTED / RESERVATION_CANCELLED → /lab/reservations, EVALUATION_ACTIVATED → /evaluations/[evaluationId], GRADE_PUBLISHED / FEEDBACK_READY → the attempt result /evaluations/[evaluationId]/attempts/[attemptId]/result, ROLE_CHANGED → /profile, VENTILATOR_OFFLINE → /lab. A notification whose `data` is null, or a type the client does not know yet, gives null (no navigation). The evaluations and lab routes mirror the route constants of those features (EVALUATIONS_URL/buildAttemptResultUrl, LAB_URL/LAB_RESERVATIONS_URL; a parity test compares them) because importing those feature barrels would pull their pages into the chunk of the bell. Ids are URI-encoded. Depends on the notification entities (types only). v1.1 (B2 closure): typed by the discriminated union of the contract; the defensive id reads of an untyped `data` record are gone.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { NotificationOf, NotificationType } from "../entities/notification.entity";

const LAB_URL = "/lab";
const LAB_RESERVATIONS_URL = `${LAB_URL}/reservations`;
const EVALUATIONS_URL = "/evaluations";
const PROFILE_URL = "/profile";

/** Every notification type of the contract, in the order of the API enum. */
export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  "RESERVATION_PREEMPTED",
  "RESERVATION_CANCELLED",
  "EVALUATION_ACTIVATED",
  "GRADE_PUBLISHED",
  "FEEDBACK_READY",
  "ROLE_CHANGED",
  "VENTILATOR_OFFLINE",
];

/** Type and data of one notification variant (what the link needs). */
export type NotificationLinkInput = {
  [T in NotificationType]: { type: T, data: NotificationOf<T>["data"] }
}[NotificationType];

const segment = (value: string): string => encodeURIComponent(value);

function attemptResultUrl(evaluationId: string, attemptId: string): string {
  return `${EVALUATIONS_URL}/${segment(evaluationId)}/attempts/${segment(attemptId)}/result`;
}

/** Route a notification opens, or null when its data is missing or its type is unknown to this client. */
export function resolveNotificationLink(notification: NotificationLinkInput): string | null {
  switch (notification.type) {
    case "RESERVATION_PREEMPTED":
    case "RESERVATION_CANCELLED":
      return LAB_RESERVATIONS_URL;
    case "EVALUATION_ACTIVATED":
      return notification.data ? `${EVALUATIONS_URL}/${segment(notification.data.evaluationId)}` : null;
    case "GRADE_PUBLISHED":
    case "FEEDBACK_READY":
      return notification.data ? attemptResultUrl(notification.data.evaluationId, notification.data.attemptId) : null;
    case "ROLE_CHANGED":
      return PROFILE_URL;
    case "VENTILATOR_OFFLINE":
      return LAB_URL;
    default:
      // A type added to the API after this build: render the notification without a link.
      return null;
  }
}

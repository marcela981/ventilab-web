/*
* Funcionalidad: Notification deep links
* Descripción: The only table that turns a notification into the route it opens, keyed by type and built from the ids of its `data` (typed by the API as a plain object, so every id is read defensively): RESERVATION_PREEMPTED / RESERVATION_CANCELLED → /lab/reservations, EVALUATION_ACTIVATED → /evaluations/[evaluationId], GRADE_PUBLISHED / FEEDBACK_READY → the attempt result /evaluations/[evaluationId]/attempts/[attemptId]/result, ROLE_CHANGED → /profile, VENTILATOR_OFFLINE → /lab. An unknown type or a missing id gives null (no navigation) and nothing throws. The evaluations and lab routes are repeated here, as the simulator feature does, because importing those feature barrels would pull their pages into the chunk of the bell, loaded on every page. Ids are URI-encoded. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

type LinkData = Readonly<Record<string, unknown>>;

type LinkBuilder = (data: LinkData) => string | null;

const LAB_URL = "/lab";
const LAB_RESERVATIONS_URL = "/lab/reservations";
const EVALUATIONS_URL = "/evaluations";
const PROFILE_URL = "/profile";

function readId(data: LinkData, key: string): string | null {
  const value = data[key];

  return typeof value === "string" && value.trim() !== "" ? encodeURIComponent(value) : null;
}

function evaluationUrl(data: LinkData): string | null {
  const evaluationId = readId(data, "evaluationId");

  return evaluationId ? `${EVALUATIONS_URL}/${evaluationId}` : null;
}

function attemptResultUrl(data: LinkData): string | null {
  const evaluationId = readId(data, "evaluationId");
  const attemptId = readId(data, "attemptId");

  return evaluationId && attemptId ? `${EVALUATIONS_URL}/${evaluationId}/attempts/${attemptId}/result` : null;
}

export const NOTIFICATION_LINKS: Readonly<Record<string, LinkBuilder>> = {
  RESERVATION_PREEMPTED: () => LAB_RESERVATIONS_URL,
  RESERVATION_CANCELLED: () => LAB_RESERVATIONS_URL,
  EVALUATION_ACTIVATED: evaluationUrl,
  GRADE_PUBLISHED: attemptResultUrl,
  FEEDBACK_READY: attemptResultUrl,
  ROLE_CHANGED: () => PROFILE_URL,
  VENTILATOR_OFFLINE: () => LAB_URL,
};

export type NotificationLinkInput = {
  type: string
  data: unknown
};

/** Route a notification opens, or null when its type is unknown or its data lacks the ids. */
export function resolveNotificationLink({ type, data }: NotificationLinkInput): string | null {
  const build = Object.prototype.hasOwnProperty.call(NOTIFICATION_LINKS, type) ? NOTIFICATION_LINKS[type] : undefined;

  if (!build) {
    return null;
  }

  const record: LinkData = typeof data === "object" && data !== null && !Array.isArray(data) ? (data as LinkData) : {};

  return build(record);
}

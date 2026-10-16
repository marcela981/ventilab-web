/*
* Funcionalidad: Lab reservation entities
* Descripción: Client-side reservation model of the ventilator lab. A reservation is either `full` (own or group reservations, and every reservation for teachers and admins: holder and group as returned by the backend) or `limited` (other people's reservations seen by a student: window, status and the occupancy label only, never names). Also the Spanish status labels, the occupancy labels of the backend label keys and the pure selection of the upcoming reservations shown in the summary. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type ReservationHolderType = "USER" | "GROUP";

export type ReservationStatus = "SCHEDULED" | "CANCELLED" | "PREEMPTED" | "COMPLETED";

export type FullReservation = {
  visibility: "full"
  id: string
  startsAt: string
  endsAt: string
  /** Backend status; unknown values are kept as sent. */
  status: string
  holderType: ReservationHolderType
  holderRole: string
  /** Name of the holder user as returned by the backend (its identifier when the name is empty), or null. */
  holderName: string | null
  groupName: string | null
  purpose: string | null
  preemptedReason: string | null
};

export type LimitedReservation = {
  visibility: "limited"
  id: string
  startsAt: string
  endsAt: string
  status: string
  /** Who holds it, without personal data, as the backend describes it. */
  occupancyLabel: string
};

export type LabReservation = FullReservation | LimitedReservation;

export type CurrentReservation = {
  reservation: LabReservation | null
  /** Holder, member of the holder group, teacher or admin (backend decision). */
  canControl: boolean
};

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const RESERVATION_STATUS_LABELS: Readonly<Record<ReservationStatus, string>> = {
  SCHEDULED: "Programada",
  CANCELLED: "Cancelada",
  PREEMPTED: "Desplazada",
  COMPLETED: "Finalizada",
};

/**
 * Spanish texts of the backend label keys (ventylab-server src/i18n/es/reservations.json, `labels`). The group key
 * carries the group name, which only the backend `label` contains, so it is never rebuilt here.
 */
export const OCCUPANCY_LABELS: Readonly<Record<string, string>> = {
  "reservations.labels.student": "Reservado por un estudiante",
  "reservations.labels.teacher": "Reservado por un docente",
};

export function reservationStatusLabel(status: string): string {
  return Object.prototype.hasOwnProperty.call(RESERVATION_STATUS_LABELS, status)
    ? RESERVATION_STATUS_LABELS[status as ReservationStatus]
    : status;
}

/** Reservations of the user that have not ended, without the active one, ordered by start. */
export function upcomingReservations(
  reservations: readonly LabReservation[],
  now: Date,
  excludeId: string | null = null,
): LabReservation[] {
  return reservations
    .filter((reservation) => reservation.id !== excludeId && new Date(reservation.endsAt).getTime() > now.getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

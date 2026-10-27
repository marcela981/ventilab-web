/*
* Funcionalidad: Lab reservation entities
* Descripción: Client-side reservation model of the ventilator lab. A reservation is either `full` (own or group reservations, and every reservation for teachers and admins: holder and group as returned by the backend) or `limited` (other people's reservations seen by a student: window, status and the occupancy label only, never names). Also the Spanish status labels, the occupancy labels of the backend label keys and the pure selection of the upcoming reservations shown in the summary. v1.1 (T2): reservationHolderText, the holder line shared by the summary and the calendar (the backend occupancy label for limited reservations; the group or holder name as returned for full ones). v1.2 (T0+T1 review fix): upcoming reservations keep only SCHEDULED ones (cancelled, preempted and completed reservations are not upcoming). v1.3 (T4): full reservations keep the backend ids of the holder user, the holder group and the creator (never shown; used only to mirror the backend cancel permission). No dependencies.
*   v1.4 (W7, Bloque 1): CurrentReservation carries the backend relation of the caller (holder, group_leader, group_member, creator, none); full reservations keep the holder student code (staff projection); reservedByText builds the "Reservado por …" line of the /simulador Conexión tab.
* Versión: 1.4
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
  /** Student code of the holder user (staff projection only), or null. */
  holderCode: string | null
  groupName: string | null
  /** Backend ids (not shown): holder user, holder group and creator, or null when not sent. */
  holderUserId: string | null
  groupId: string | null
  createdById: string | null
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

/** How the caller relates to the active reservation (backend `relation`; "none" also when the ventilator is free). */
export type ReservationRelation = "holder" | "group_leader" | "group_member" | "creator" | "none";

export const RESERVATION_RELATIONS: readonly ReservationRelation[] = ["holder", "group_leader", "group_member", "creator", "none"];

export type CurrentReservation = {
  reservation: LabReservation | null
  /** Holder user, leader of the holder group, teacher or admin (backend decision; the other group members observe). */
  canControl: boolean
  relation: ReservationRelation
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

export const groupHolderLabel = (group: string): string => `Grupo ${group}`;

/** Who holds the reservation, only with what the backend returned for the caller role; null when nothing was sent. */
export function reservationHolderText(reservation: LabReservation): string | null {
  if (reservation.visibility === "limited") {
    return reservation.occupancyLabel;
  }

  if (reservation.holderType === "GROUP" && reservation.groupName) {
    return groupHolderLabel(reservation.groupName);
  }

  return reservation.holderName;
}

export const reservedByLabel = (holder: string): string => `Reservado por ${holder}`;

/**
 * "Reservado por …" exactly as the caller's projection allows: the backend occupancy label for a limited reservation
 * (a student sees "Reservado por un estudiante del grupo X"), the holder (with the student code, staff only) or the
 * group for a full one; null when the backend sent no holder.
 */
export function reservedByText(reservation: LabReservation): string | null {
  if (reservation.visibility === "limited") {
    return reservation.occupancyLabel;
  }

  const holder = reservationHolderText(reservation);

  if (holder === null) {
    return null;
  }

  const withCode = reservation.holderType === "USER" && reservation.holderCode ? `${holder} (${reservation.holderCode})` : holder;

  return reservedByLabel(withCode);
}

export function reservationStatusLabel(status: string): string {
  return Object.prototype.hasOwnProperty.call(RESERVATION_STATUS_LABELS, status)
    ? RESERVATION_STATUS_LABELS[status as ReservationStatus]
    : status;
}

/** Backend status of a reservation that still holds its window (ReservationLifecycleStatus SCHEDULED). */
export const UPCOMING_STATUS: ReservationStatus = "SCHEDULED";

/** Scheduled reservations of the user that have not ended, without the active one, ordered by start. */
export function upcomingReservations(
  reservations: readonly LabReservation[],
  now: Date,
  excludeId: string | null = null,
): LabReservation[] {
  return reservations
    .filter((reservation) => reservation.status === UPCOMING_STATUS
      && reservation.id !== excludeId
      && new Date(reservation.endsAt).getTime() > now.getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

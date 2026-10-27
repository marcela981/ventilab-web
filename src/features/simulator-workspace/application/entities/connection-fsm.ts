/*
* Funcionalidad: Lab connection FSM
* Descripción: Pure, derived state machine of the Conexión tab of /simulador (W7, Bloque 1; FLUJOS_JULIO b.4 and b.6,
*   DISENO_BLOQUE1 §2.3 and §3). The state is never stored: deriveConnectionState computes it on every render from the
*   server state (the active reservation with the caller's relation, the operator control and the ventilator room) and
*   the only local state, the caller's intent and the last error. July states, in English: NO_RESERVATION (SIN_RESERVA),
*   RESERVING, RESERVED, CONNECTING, CONNECTED, ERROR and DISCONNECTED. Rules: a reservation of someone else (relation
*   none, without the staff control right) is NO_RESERVATION ("Reservado por …"); connecting joins the room and, only
*   for the holder user or the leader of the holder group, takes the control (a group member, or anyone when another
*   person operates, is an observer: CONNECTED without control); a join rejected with no_active_reservation within
*   JOIN_RETRY_WINDOW_MS of reserving is the backend refreshing its holders, so it stays CONNECTING and retries;
*   disconnecting keeps the reservation (DISCONNECTED); releasing cancels it. Also the enabled actions and the Spanish
*   July texts of each state. No dependencies.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/** States of the July connection FSM (FLUJOS_JULIO b.4 and b.6). */
export const LAB_CONNECTION_STATES = [
  "NO_RESERVATION",
  "RESERVING",
  "RESERVED",
  "CONNECTING",
  "CONNECTED",
  "ERROR",
  "DISCONNECTED",
] as const;

export type LabConnectionState = (typeof LAB_CONNECTION_STATES)[number];

/** Relation of the caller with the active reservation, as the backend states it (GET /api/reservations/current). */
export type ConnectionRelation = "holder" | "group_leader" | "group_member" | "creator" | "none";

/** The active reservation as the FSM needs it; null while it was never read. */
export type ConnectionReservation = {
  /** Active reservation id; null when the ventilator is free. */
  reservationId: string | null
  relation: ConnectionRelation
  /** Backend control right (holder user, leader of the holder group, teacher, admin). */
  canControl: boolean
} | null;

/** Operator control as the FSM needs it. */
export type ConnectionControl = {
  /** Null until it is read for the active reservation. */
  state: { isOperator: boolean } | null
  /** A take or release request is in flight. */
  pending: boolean
};

/** Ventilator room as the FSM needs it. */
export type ConnectionRoom = {
  /** The realtime socket is authenticated. */
  socketOnline: boolean
  /** Reason of the last `ventilator:join-rejected` of the current join, or null. */
  rejectedReason: string | null
  /** When it arrived (epoch ms), or null. */
  rejectedAt: number | null
};

/** What the caller asked for: the only local state of the connection, with the last error. */
export type ConnectionIntent =
  | { kind: "idle" }
  | { kind: "reserving" }
  /** Just reserved (`at`, epoch ms): the anchor of the join retry window. */
  | { kind: "reserved", at: number }
  | { kind: "connect", reservedAt: number | null }
  | { kind: "disconnected" }
  /** Cancelling `reservationId`; `done` once the backend cancelled it (until the read stops returning it). */
  | { kind: "releasing", reservationId: string, done: boolean };

export type ConnectionErrorSource = "reserve" | "release" | "connect";

export type ConnectionError = { source: ConnectionErrorSource, message: string } | null;

export const IDLE_INTENT: ConnectionIntent = { kind: "idle" };

/** A join rejected this soon after reserving is the backend refreshing its holders (every 1 s), not an error. */
export const JOIN_RETRY_WINDOW_MS = 3000;

/** Rejection reason of a join sent before the backend knows the new reservation. */
export const NO_ACTIVE_RESERVATION = "no_active_reservation";

/** The caller has a relation with the active reservation (own, of its group, or created by it). */
export function isOwnReservation(reservation: ConnectionReservation): boolean {
  return reservation !== null && reservation.reservationId !== null && reservation.relation !== "none";
}

/** The caller may connect: own reservation, or the staff control right over someone else's (observer). */
export function hasReservationAccess(reservation: ConnectionReservation): boolean {
  return reservation !== null && reservation.reservationId !== null && (reservation.relation !== "none" || reservation.canControl);
}

/** Only the holder user and the leader of the holder group take the control on connecting (S3b); the rest observe. */
export function takesControl(reservation: ConnectionReservation): boolean {
  return reservation !== null && (reservation.relation === "holder" || reservation.relation === "group_leader");
}

/** Who may cancel it from the tab: its holder user, the leader of its group, or who created it. */
export function canReleaseReservation(reservation: ConnectionReservation): boolean {
  return reservation !== null
    && reservation.reservationId !== null
    && (reservation.relation === "holder" || reservation.relation === "group_leader" || reservation.relation === "creator");
}

/** Someone else holds the active reservation (shown as "Reservado por …"). */
export function isReservedByOther(reservation: ConnectionReservation): boolean {
  return reservation !== null && reservation.reservationId !== null && reservation.relation === "none";
}

/** A join rejected with no_active_reservation within the retry window of reserving: retried, never an error. */
export function isTransientJoinRejection(room: ConnectionRoom, intent: ConnectionIntent): boolean {
  if (intent.kind !== "connect" || intent.reservedAt === null || room.rejectedReason !== NO_ACTIVE_RESERVATION || room.rejectedAt === null) {
    return false;
  }

  return room.rejectedAt - intent.reservedAt <= JOIN_RETRY_WINDOW_MS;
}

export function deriveConnectionState(
  reservation: ConnectionReservation,
  control: ConnectionControl,
  room: ConnectionRoom,
  intent: ConnectionIntent,
  lastError: ConnectionError,
): LabConnectionState {
  if (intent.kind === "reserving" || intent.kind === "releasing") {
    return "RESERVING";
  }

  if (!hasReservationAccess(reservation)) {
    return lastError ? "ERROR" : "NO_RESERVATION";
  }

  if (intent.kind === "connect") {
    if (room.rejectedReason !== null) {
      return isTransientJoinRejection(room, intent) ? "CONNECTING" : "ERROR";
    }

    if (!room.socketOnline) {
      return "CONNECTING";
    }

    if (takesControl(reservation) && (control.state === null || control.pending)) {
      return "CONNECTING";
    }

    return "CONNECTED";
  }

  if (lastError) {
    return "ERROR";
  }

  return intent.kind === "disconnected" ? "DISCONNECTED" : "RESERVED";
}

export type ConnectionActions = {
  reserve: boolean
  release: boolean
  connect: boolean
  disconnect: boolean
};

export type ConnectionActionContext = {
  reservation: ConnectionReservation
  /** Teachers and admins may book over someone else's reservation (preemption flow). */
  isStaff: boolean
};

/** Guards of the July buttons (FLUJOS_JULIO b.4 and b.6), with the reservation the backend reports. */
export function connectionActions(state: LabConnectionState, { reservation, isStaff }: ConnectionActionContext): ConnectionActions {
  const busy = state === "RESERVING" || state === "CONNECTING";
  const linked = state === "CONNECTING" || state === "CONNECTED";
  const access = hasReservationAccess(reservation);

  return {
    reserve: !busy && !linked && !isOwnReservation(reservation) && (!isReservedByOther(reservation) || isStaff),
    release: !busy && canReleaseReservation(reservation),
    connect: !busy && !linked && access,
    disconnect: linked,
  };
}

// TODO(i18n): move to a simulator namespace in src/i18n.
/** July labels of the state indicator (IndicadorEstadoConexion). */
export const CONNECTION_STATE_LABELS: Readonly<Record<LabConnectionState, string>> = {
  NO_RESERVATION: "Sin reserva",
  RESERVING: "Reservando…",
  RESERVED: "Reservado",
  CONNECTING: "Conectando…",
  CONNECTED: "Conectado",
  ERROR: "Error",
  DISCONNECTED: "Desconectado",
};

// TODO(i18n): move to a simulator namespace in src/i18n.
/** July messages of the FSM (useConexionVentilador), by state; the error message is the last error. */
export const CONNECTION_STATE_MESSAGES: Readonly<Record<Exclude<LabConnectionState, "ERROR">, string>> = {
  NO_RESERVATION: "Necesitas una reserva activa para conectar al ventilador.",
  RESERVING: "Procesando la reserva…",
  RESERVED: "Ventilador reservado. Ya puedes conectar.",
  CONNECTING: "Conectando con el ventilador…",
  CONNECTED: "Conectado al ventilador.",
  DISCONNECTED: "Desconectado. Se conserva la reserva: puedes volver a conectar.",
};

/*
* Funcionalidad: Lab connection value
* Descripción: Shape of the lab connection the /simulador workspace shares with every tab through LabConnectionProvider
*   (W5 fixed state, intent, error, connected, connect and disconnect; W7 adds what the Conexión tab and the real monitor
*   need): the derived FSM state and its enabled actions, the active reservation as the caller's projection gives it
*   and "Reservado por …" when it belongs to someone else, the caller's relation, the operator control (whether the
*   caller operates and who operates, for "Opera: <nombre>", plus the control hook result for the control bar), the
*   immediate booking callbacks (RESERVING while it is sent) and the revoked reservation modal. Also the builder of a
*   fixed value (tests, guides). Depends only on the connection FSM and ventilator-lab types.
*   v0.2 (W10, Bloque 1): `canControl`, the backend control right on the active reservation (the recording rule).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { LabReservation, RevocationModal, UseOperatorControlResult } from "@features/ventilator-lab/connection.entry";
import type { ConnectionActions, ConnectionIntent, ConnectionRelation, LabConnectionState } from "./connection-fsm";

/** What the caller asked for locally (the kind of the FSM intent). */
export type LabConnectionIntent = ConnectionIntent["kind"];

export type LabConnectionValue = {
  state: LabConnectionState
  intent: LabConnectionIntent
  /** Last connection error message (Spanish); null without one. */
  error: string | null
  /** Shortcut: the state is CONNECTED (in the room, as operator or observer). */
  connected: boolean
  /** Joins the room; the holder user or the group leader also takes the control. */
  connect: () => void
  /** Leaves (releases the control); the reservation is kept. */
  disconnect: () => void
  /** Cancels the active reservation. */
  release: () => void
  /** Enabled buttons of the current state. */
  actions: ConnectionActions
  /** The realtime socket is authenticated ("Servidor: En línea"). */
  socketOnline: boolean
  /** Active reservation in the caller's projection (null when free, unknown or ended). */
  reservation: LabReservation | null
  /** "Reservado por …" when someone else holds the active reservation; null otherwise. */
  reservedBy: string | null
  relation: ConnectionRelation
  /** W10: backend control right on the active reservation (holder user, group leader, teacher, admin): may record it. */
  canControl: boolean
  /** The caller operates the ventilator now. */
  isOperator: boolean
  /** Who operates, as the backend projects it (name or "Un docente" / "Un estudiante"); null when nobody or unknown. */
  operatorName: string | null
  /** Operator control of the active reservation (take / takeover / release / bar view); null without access. */
  control: UseOperatorControlResult | null
  /** Booking callbacks of the "Reservar ahora" dialog. */
  onReserveStart: () => void
  onReserved: (reservationId: string | null) => void
  onReserveFailed: (message: string | null) => void
  /** Blocking modal of an own reservation that ended or was displaced; null otherwise. */
  revocation: RevocationModal | null
  acknowledgeRevocation: () => void
};

const noop = (): void => undefined;

const NO_ACTIONS: ConnectionActions = { reserve: false, release: false, connect: false, disconnect: false };

/** A fixed value (tests, guides): NO_RESERVATION and no-op callbacks unless overridden. */
export function createLabConnectionValue(overrides: Partial<LabConnectionValue> = {}): LabConnectionValue {
  const state = overrides.state ?? "NO_RESERVATION";

  return {
    state,
    intent: "idle",
    error: null,
    connected: state === "CONNECTED",
    connect: noop,
    disconnect: noop,
    release: noop,
    actions: NO_ACTIONS,
    socketOnline: false,
    reservation: null,
    reservedBy: null,
    relation: "none",
    canControl: false,
    isOperator: false,
    operatorName: null,
    control: null,
    onReserveStart: noop,
    onReserved: noop,
    onReserveFailed: noop,
    revocation: null,
    acknowledgeRevocation: noop,
    ...overrides,
  };
}

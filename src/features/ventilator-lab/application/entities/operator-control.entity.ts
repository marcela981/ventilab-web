/*
* Funcionalidad: Operator control (single operator) of the real ventilator
* Descripción: Pure model of the exclusive control of the physical ventilator, built only from what the backend
*   returns: the state of GET /api/ventilator/control (operator, isOperator, canTake, canTakeover, occupied) and the
*   `ventilator:control-changed` events (taken, takeover, released, presence_timeout, reservation_ended,
*   reservation_preempted). The reducer applies an event of the current reservation at once (operator and isOperator;
*   take / takeover flags only where the backend already granted them, so nothing is widened locally) and the hook
*   re-reads the state, which stays the authority. Requests (take, takeover, release) have a pending state and a Spanish
*   error by backend code; success never invents the new state. Presentation: the banner ("Controlas el equipo" /
*   "Opera: <name>" / "Control libre"), with the name only when the backend returned it for the reservation holder
*   (the control contract carries no operator name: gap); the console permissions (only the operator controls, still
*   subject to the no-data / socket-lost read-only of the page) with the visible reason; the visible actions (take when
*   free and allowed, takeover only when the backend says canTakeover, release only to the operator); the heartbeat
*   interval, three beats per operator presence grace (vendored backend constant, not exposed by the API). Depends on
*   the realtime event types, the api error and the lab error messages. v1.1 (T7 review fix S2, T9): a "suspended"
*   event (page restored from the back-forward cache) marks the state unknown and not operator until the re-read; the
*   view records the control LOSS of the operator while the reservation continues (takeover / taken by someone else,
*   presence_timeout, released by someone else, or a loss found on a re-read of the same reservation) for the
*   non-blocking notice; the operator's own release and the end of the reservation (revoked modal) are not losses; the
*   notice clears when dismissed or when the caller operates again. v1.2 (T9 review fix): W3 the own release is
*   forgotten on a take / takeover request and when an event makes the caller the operator (a `released` event before
*   the 2xx would otherwise keep it and hide a later staff release); S1 "suspended" remembers that the caller operated
*   (`suspendedOperator`), so a loss that happened in the back-forward cache is reported by the re-read.
*   v1.3 (W7, Bloque 1): the state keeps operatorName / operatorLabelKey (projected by role; a control-changed event to another operator leaves them unknown until the re-read); OPERATOR_LABELS (Spanish texts of the generic label keys) and controlOperatorLabel (name, else generic label) for "Opera: <nombre>".
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import type { VentilatorControlChangedEvent } from "@shared/realtime";
import { getLabErrorMessage } from "./lab-error-messages";

export type OperatorControlState = {
  /** Active reservation, null when the ventilator is free. */
  reservationId: string | null
  /** Current operator, null when nobody controls; undefined when the backend does not disclose it. */
  operatorUserId: string | null | undefined
  /** Operator name as the backend projects it; null when hidden or nobody operates; undefined when not disclosed. */
  operatorName?: string | null | undefined
  /** i18n key of the generic label shown instead of a hidden name (OPERATOR_LABELS); null / undefined otherwise. */
  operatorLabelKey?: string | null | undefined
  isOperator: boolean
  canTake: boolean
  canTakeover: boolean
  occupied: boolean
};

export type ControlAction = "take" | "takeover" | "release";

export type ControlLossReason = "taken" | "takeover" | "released" | "presence_timeout" | "lost";

/** The operator lost the control while the reservation continues; operatorUserId is the new operator, if any. */
export type ControlLoss = { reason: ControlLossReason, operatorUserId: string | null };

export type ControlView = {
  /** Null until the first read. */
  state: OperatorControlState | null
  pending: ControlAction | null
  error: string | null
  /** Last control loss of the caller (notice), null when none or dismissed. */
  loss: ControlLoss | null
  /** The caller's own release succeeded and its `released` event / re-read has not arrived yet. */
  ownRelease: boolean
  /** The caller was the operator when the page went into the back-forward cache (until the next read or event). */
  suspendedOperator: boolean
};

export type ControlEvent =
  | { type: "loaded", state: OperatorControlState }
  | { type: "changed", event: VentilatorControlChangedEvent, selfUserId: string | null }
  | { type: "requested", action: ControlAction }
  | { type: "succeeded", action: ControlAction }
  | { type: "failed", action: ControlAction, message: string }
  | { type: "suspended" }
  | { type: "dismissLoss" };

export const INITIAL_CONTROL_VIEW: ControlView = {
  state: null,
  pending: null,
  error: null,
  loss: null,
  ownRelease: false,
  suspendedOperator: false,
};

/** Backend error codes of the control endpoints (`ventilator-commands.errors.ts`). */
export const CONTROL_ERROR_CODES = {
  noActiveReservation: "ventilator-commands.no_active_reservation",
  notHolder: "ventilator-commands.not_reservation_holder",
  locked: "ventilator-commands.control_locked",
  notOperator: "ventilator-commands.not_operator",
} as const;

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const CONTROL_COPY = {
  self: "Controlas el equipo",
  other: (name: string) => `Opera: ${name}`,
  otherOperator: "otra persona",
  free: "Control libre",
  checking: "Comprobando quién tiene el control…",
  takeToOperate: "Toma el control para operar",
  take: "Tomar control",
  takeover: "Quitar control",
  release: "Liberar control",
  takeoverTitle: "¿Quitar el control?",
  takeoverDescription: (name: string) =>
    `${name} dejará de operar el equipo y pasarás a controlarlo tú. La acción queda registrada.`,
  takeoverConfirm: "Quitar control",
  back: "Volver",
  errors: {
    noActiveReservation: "No hay una reserva activa del ventilador en este momento.",
    notHolder: "Solo quienes tienen la reserva activa, los docentes y los administradores pueden tomar el control.",
    locked: "Otra persona tiene el control del equipo y no puedes quitárselo.",
    notOperator: "Ya no tienes el control del equipo.",
  },
} as const;

/** Reasons after which nothing can be taken: the reservation itself is over. */
const RESERVATION_OVER: ReadonlySet<VentilatorControlChangedEvent["reason"]> = new Set(["reservation_ended", "reservation_preempted"]);

function applyChange(state: OperatorControlState, event: VentilatorControlChangedEvent, selfUserId: string | null): OperatorControlState {
  const { operatorUserId } = event;
  // W7: the event carries no name; a different operator is unnamed until the re-read the event triggers.
  const named = operatorUserId === state.operatorUserId
    ? state
    : { ...state, operatorName: operatorUserId === null ? null : undefined, operatorLabelKey: operatorUserId === null ? null : undefined };

  if (RESERVATION_OVER.has(event.reason)) {
    return { ...state, operatorUserId: null, operatorName: null, operatorLabelKey: null, isOperator: false, canTake: false, canTakeover: false };
  }

  if (operatorUserId === null) {
    // Whoever could take, take over or held the control may take the free control (backend: holders and staff).
    const eligible = state.canTake || state.canTakeover || state.isOperator;

    return { ...named, operatorUserId: null, isOperator: false, canTake: eligible, canTakeover: false };
  }

  if (operatorUserId === selfUserId) {
    return { ...named, operatorUserId, isOperator: true, canTake: false, canTakeover: false };
  }

  // Another operator: a takeover right the backend already granted (leader, staff) is kept; nothing else is inferred.
  return { ...named, operatorUserId, isOperator: false, canTake: false, canTakeover: state.canTakeover };
}

/** Reasons that can take the control away from the operator while the reservation continues. */
const LOSS_REASONS: ReadonlySet<VentilatorControlChangedEvent["reason"]> = new Set(["taken", "takeover", "released", "presence_timeout"]);

function releasingByCaller(view: ControlView): boolean {
  return view.ownRelease || view.pending === "release";
}

/** The caller operated before this change: the shown state, or the state before a back-forward cache stay (S1). */
function wasOperator(view: ControlView): boolean {
  return view.state?.isOperator === true || view.suspendedOperator;
}

function lossOnChange(view: ControlView, next: OperatorControlState, event: VentilatorControlChangedEvent): ControlLoss | null {
  if (next.isOperator) {
    return null;
  }

  if (!wasOperator(view) || !LOSS_REASONS.has(event.reason)) {
    return view.loss;
  }

  if (event.reason === "released" && releasingByCaller(view)) {
    return view.loss;
  }

  return { reason: event.reason as ControlLossReason, operatorUserId: event.operatorUserId };
}

function lossOnLoad(view: ControlView, next: OperatorControlState): ControlLoss | null {
  const previous = view.state;

  if (next.isOperator) {
    return null;
  }

  // Only a loss of the same reservation that no event explained (an end of the reservation is the revoked modal).
  if (!wasOperator(view) || previous?.reservationId !== next.reservationId || releasingByCaller(view) || view.loss !== null) {
    return view.loss;
  }

  return { reason: "lost", operatorUserId: typeof next.operatorUserId === "string" ? next.operatorUserId : null };
}

export function controlReducer(view: ControlView, event: ControlEvent): ControlView {
  switch (event.type) {
    case "loaded":
      return {
        ...view,
        state: event.state,
        loss: lossOnLoad(view, event.state),
        ownRelease: event.state.isOperator ? view.ownRelease : false,
        suspendedOperator: false,
      };
    case "changed": {
      const { state } = view;

      if (state === null || (state.reservationId !== null && state.reservationId !== event.event.reservationId)) {
        return view;
      }

      const next = applyChange(state, event.event, event.selfUserId);
      const ownReleaseSeen = event.event.reason === "released" && releasingByCaller(view);

      return {
        ...view,
        state: next,
        loss: lossOnChange(view, next, event.event),
        // W3: operating again (taken / given back) ends any own release still remembered.
        ownRelease: ownReleaseSeen || next.isOperator ? false : view.ownRelease,
        suspendedOperator: false,
      };
    }
    case "requested":
      // W3: a take / takeover starts a new operation; a release remembered from before must not hide a later loss.
      return { ...view, pending: event.action, error: null, ownRelease: event.action === "release" ? view.ownRelease : false };
    case "succeeded":
      return { ...view, pending: null, ownRelease: event.action === "release" ? true : view.ownRelease };
    case "failed":
      return { ...view, pending: null, error: event.message };
    case "suspended":
      // Restored from the back-forward cache: whatever was shown may be stale until the re-read.
      // S1: remember that the caller operated, so a loss during the stay is reported by the re-read.
      return view.state === null
        ? view
        : {
            ...view,
            state: { ...view.state, operatorUserId: undefined, isOperator: false, canTake: false, canTakeover: false },
            suspendedOperator: wasOperator(view),
          };
    case "dismissLoss":
      return { ...view, loss: null };
    default:
      return view;
  }
}

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
/** Spanish texts of the generic operator labels (ventylab-server src/i18n/es/ventilator-commands.json, `operator_labels`). */
export const OPERATOR_LABELS: Readonly<Record<string, string>> = {
  "ventilator-commands.operator_labels.teacher": "Un docente",
  "ventilator-commands.operator_labels.student": "Un estudiante",
};

/**
 * W7: who operates, as the backend projects it to the caller: the operator name, else the Spanish generic label of
 * its key ("Un docente" / "Un estudiante"), else null (nobody operates, or the backend disclosed nothing).
 */
export function controlOperatorLabel(state: Pick<OperatorControlState, "operatorName" | "operatorLabelKey"> | null): string | null {
  if (!state) {
    return null;
  }

  if (typeof state.operatorName === "string" && state.operatorName.trim() !== "") {
    return state.operatorName;
  }

  const key = state.operatorLabelKey;

  return typeof key === "string" && Object.prototype.hasOwnProperty.call(OPERATOR_LABELS, key) ? OPERATOR_LABELS[key] ?? null : null;
}

/** The operator name only when the backend returned it as the holder user of the reservation; null otherwise. */
export function operatorDisplayName(
  operatorUserId: string | null | undefined,
  reservation: { holderUserId: string | null, holderName: string | null },
): string | null {
  if (!operatorUserId || reservation.holderUserId !== operatorUserId) {
    return null;
  }

  return reservation.holderName;
}

export type ControlBanner = { kind: "self" | "other" | "free" | "unknown", text: string };

export function controlBanner(state: OperatorControlState | null, operatorName: string | null): ControlBanner {
  if (state === null || state.operatorUserId === undefined) {
    return { kind: "unknown", text: CONTROL_COPY.checking };
  }

  if (state.isOperator) {
    return { kind: "self", text: CONTROL_COPY.self };
  }

  if (state.operatorUserId !== null) {
    return { kind: "other", text: CONTROL_COPY.other(operatorName ?? CONTROL_COPY.otherOperator) };
  }

  return { kind: "free", text: CONTROL_COPY.free };
}

export type ControlPermissions = { canControl: boolean, readOnlyReason: string | null };

/**
 * Only the operator controls the console, and only while the device sends data over a live socket (the page gives
 * those reasons itself). Anyone else is read-only with the banner reason.
 */
export function controlPermissions(
  state: OperatorControlState | null,
  operatorName: string | null,
  connection: { live: boolean, socketOnline: boolean },
): ControlPermissions {
  if (state?.isOperator) {
    return { canControl: connection.live && connection.socketOnline, readOnlyReason: null };
  }

  const banner = controlBanner(state, operatorName);

  return { canControl: false, readOnlyReason: banner.kind === "free" ? CONTROL_COPY.takeToOperate : banner.text };
}

export type ControlActions = { take: boolean, takeover: boolean, release: boolean };

export function controlActions(state: OperatorControlState | null): ControlActions {
  if (state === null) {
    return { take: false, takeover: false, release: false };
  }

  const otherOperator = !state.isOperator && typeof state.operatorUserId === "string";

  return {
    take: state.canTake && !state.isOperator && state.operatorUserId === null,
    takeover: state.canTakeover && otherOperator,
    release: state.isOperator,
  };
}

/** Spanish message of a failed control request, by backend code; the generic lab message otherwise. */
export function getControlErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  switch (apiError.code) {
    case CONTROL_ERROR_CODES.noActiveReservation:
      return CONTROL_COPY.errors.noActiveReservation;
    case CONTROL_ERROR_CODES.notHolder:
      return CONTROL_COPY.errors.notHolder;
    case CONTROL_ERROR_CODES.locked:
      return CONTROL_COPY.errors.locked;
    case CONTROL_ERROR_CODES.notOperator:
      return CONTROL_COPY.errors.notOperator;
    default:
      return getLabErrorMessage(apiError);
  }
}

const HEARTBEATS_PER_GRACE = 3;
const MIN_HEARTBEAT_MS = 1000;

/**
 * Heartbeat interval: three beats within the operator presence grace (the backend releases the control that long
 * after the operator's last socket closes; a heartbeat cancels a pending release).
 */
export function controlHeartbeatIntervalMs(operatorGraceSeconds: number): number {
  return Math.max(MIN_HEARTBEAT_MS, Math.floor((operatorGraceSeconds * 1000) / HEARTBEATS_PER_GRACE));
}

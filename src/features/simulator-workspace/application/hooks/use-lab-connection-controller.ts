/*
* Funcionalidad: useLabConnectionController
* Descripción: Live lab connection of the /simulador workspace (W7, Bloque 1; DISENO_BLOQUE1 §2.3 and §3), used by
*   LabConnectionProvider ABOVE the tabs so switching tabs never releases the control. Server state: the active
*   reservation with the caller's relation (GET /api/reservations/current, revalidated by the reservation socket events
*   and once its end passes), the operator control (useOperatorControl: read, heartbeat, release on leaving while
*   connected) and the ventilator room (useVentilatorRoom). Local state: only the intent, the last error, the own
*   reservation being followed (to tell a release from an end), the ended reservation of the blocking modal and the
*   join retry counter; the FSM state is derived (connection-fsm). connect(): joins the room and, for the holder user
*   or the group leader, POSTs the control (a 423 leaves an observer with "Opera: <nombre>", not an error; a group
*   member never asks for it); a join rejected with no_active_reservation right after reserving is retried on
*   `ventilator:availability` (or after JOIN_RETRY_DELAY_MS) while it stays CONNECTING. disconnect(): leaves the room
*   and releases the control (DELETE); the reservation is kept. release(): cancels the reservation. An own reservation
*   that ends (time, cancellation by someone else, preemption) opens the blocking modal (the control revoked model of
*   the lab) and the state falls to NO_RESERVATION. Depends on React, the shared realtime and session hooks, the
*   ventilator-lab connection entry point and the connection FSM.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CONTROL_COPY,
  controlOperatorLabel,
  getLabErrorMessage,
  joinRejectedMessage,
  mergeRevocation,
  reservedByText,
  revocationFromControlEvent,
  revocationFromPreemption,
  revocationModal,
  useCancelReservation,
  useCurrentReservation,
  useOperatorControl,
  usePreemptionNotice,
  useReservationsRealtime,
  useVentilatorRoom,
} from "@features/ventilator-lab/connection.entry";
import type { CurrentReservation, Revocation } from "@features/ventilator-lab/connection.entry";
import { useSocket, useSocketEvent } from "@shared/realtime";
import { useSession } from "@shared/session/use-session";
import {
  connectionActions,
  deriveConnectionState,
  hasReservationAccess,
  IDLE_INTENT,
  isOwnReservation,
  isReservedByOther,
  isTransientJoinRejection,
  takesControl,
} from "../entities/connection-fsm";
import type { ConnectionError, ConnectionIntent, ConnectionReservation, ConnectionRoom } from "../entities/connection-fsm";
import type { LabConnectionValue } from "../entities/lab-connection.entity";

/** Fallback delay of a join retry when no `ventilator:availability` arrives (the backend refreshes holders every 1 s). */
export const JOIN_RETRY_DELAY_MS = 1000;

/** Re-read of the active reservation this long after its end (the backend detects the end by polling every 1 s). */
export const END_REREAD_DELAY_MS = 1000;

// TODO(i18n): move to a simulator namespace in src/i18n.
export const LAB_CONNECTION_COPY = {
  joinRejected: (message: string) => `No se pudo entrar a la sala del ventilador. ${message}`,
} as const;

/** An own reservation that ended while followed: the modal until acknowledged, then hidden until the read drops it. */
type EndedReservation = { reservationId: string, revocation: Revocation, acknowledged: boolean };

const ENDED_READ: Revocation = { reason: "reservation_ended", detail: null };

const HIDDEN: ConnectionReservation = { reservationId: null, relation: "none", canControl: false };

function toConnectionReservation(data: CurrentReservation | null, hidden: boolean): ConnectionReservation {
  if (data === null) {
    return null;
  }

  return hidden ? HIDDEN : { reservationId: data.reservation?.id ?? null, relation: data.relation, canControl: data.canControl };
}

export function useLabConnectionController(): LabConnectionValue {
  useReservationsRealtime();
  usePreemptionNotice();
  const { role } = useSession();
  const isStaff = role === "TEACHER" || role === "ADMIN";
  const { status } = useSocket();
  const socketOnline = status === "authenticated";
  const current = useCurrentReservation();
  const { reload } = current;
  const { cancel } = useCancelReservation();
  const [intent, setIntent] = useState<ConnectionIntent>(IDLE_INTENT);
  const [lastError, setLastError] = useState<ConnectionError>(null);
  const [tracked, setTracked] = useState<string | null>(null);
  const [ended, setEnded] = useState<EndedReservation | null>(null);
  const [attempt, setAttempt] = useState(0);

  const data = current.data;
  const readId = data?.reservation?.id ?? null;
  // An ended reservation is gone for the caller even while a stale read still returns it.
  const hidden = ended !== null && ended.reservationId === readId;
  // Memoized (frozen for the compiler): the pure FSM helpers below only read it.
  const reservation = useMemo(() => toConnectionReservation(data, hidden), [data, hidden]);

  const active = data !== null && !hidden ? data.reservation : null;
  const access = hasReservationAccess(reservation);
  const activeId = access ? readId : null;
  const ownId = isOwnReservation(reservation) ? readId : null;

  // Reconciled from the latest read during render (no effect): follow the own reservation, notice its end.
  if (data !== null) {
    if (ownId !== tracked) {
      const releasedByCaller = intent.kind === "releasing" && intent.reservationId === tracked;

      // An event may have ended it already (preempted, ended): keep that, more specific, reason.
      if (tracked !== null && !releasedByCaller && ended?.reservationId !== tracked) {
        setEnded({ reservationId: tracked, revocation: ENDED_READ, acknowledged: false });
        setIntent(IDLE_INTENT);
      }

      setTracked(ownId);
    }

    if (intent.kind === "releasing" && intent.done && readId !== intent.reservationId) {
      setIntent(IDLE_INTENT);
    }

    if (ended?.acknowledged && readId !== ended.reservationId) {
      setEnded(null);
    }
  }

  const { view, take, takeover, release: releaseOwnControl, dismissLoss } = useOperatorControl({
    enabled: access,
    releaseOnLeaveEnabled: intent.kind === "connect",
  });
  const viewState = view.state;
  const controlState = viewState !== null && viewState.reservationId === activeId ? viewState : null;
  const isOperator = controlState?.isOperator === true;

  const room = useVentilatorRoom({ enabled: intent.kind === "connect" && access, reservationId: activeId, attempt });
  const roomInput: ConnectionRoom = { socketOnline, rejectedReason: room.rejectedReason, rejectedAt: room.rejectedAt };
  const transient = isTransientJoinRejection(roomInput, intent);

  const end = (reservationId: string, revocation: Revocation | null) => {
    if (revocation === null || (intent.kind === "releasing" && intent.reservationId === reservationId)) {
      return;
    }

    setEnded((previous) => (previous && previous.reservationId === reservationId
      ? { ...previous, revocation: mergeRevocation(previous.revocation, revocation) }
      : { reservationId, revocation, acknowledged: false }));
    setIntent(IDLE_INTENT);
    // Who holds the ventilator now (shown in the modal as the backend projects it).
    void reload().catch(() => undefined);
  };

  useSocketEvent("ventilator:control-changed", (event) => {
    if (tracked !== null) {
      end(tracked, revocationFromControlEvent(event, tracked));
    }
  });

  useSocketEvent("reservation:preempted", (event) => {
    if (tracked !== null) {
      end(tracked, revocationFromPreemption(event, tracked));
    }
  });

  // The backend refreshed its holders: send the join again.
  useSocketEvent("ventilator:availability", () => {
    if (transient) {
      setAttempt((previous) => previous + 1);
    }
  });

  useEffect(() => {
    if (!transient) {
      return undefined;
    }

    const timer = setTimeout(() => setAttempt((previous) => previous + 1), JOIN_RETRY_DELAY_MS);

    return () => clearTimeout(timer);
  }, [transient, room.rejectedAt]);

  // Once the active reservation's end passes, read again (the end is confirmed by the backend, never by this clock).
  const endsAt = active?.endsAt ?? null;

  useEffect(() => {
    if (endsAt === null) {
      return undefined;
    }

    const delay = Math.max(0, Date.parse(endsAt) - Date.now()) + END_REREAD_DELAY_MS;
    const timer = setTimeout(() => {
      void reload().catch(() => undefined);
    }, delay);

    return () => clearTimeout(timer);
  }, [endsAt, reload]);

  const shouldTake = takesControl(reservation);

  const connect = useCallback(() => {
    setLastError(null);
    setAttempt(0);
    setIntent((previous) => ({ kind: "connect", reservedAt: previous.kind === "reserved" ? previous.at : null }));

    // Only the holder user and the group leader operate; a 423 (someone else operates) leaves an observer.
    if (shouldTake && !isOperator) {
      void take();
    }
  }, [shouldTake, isOperator, take]);

  const disconnect = useCallback(() => {
    setIntent({ kind: "disconnected" });
    setAttempt(0);
    setLastError(null);

    if (isOperator) {
      void releaseOwnControl();
    }
  }, [isOperator, releaseOwnControl]);

  const release = useCallback(() => {
    if (activeId === null) {
      return;
    }

    const previous = intent;
    const reservationId = activeId;

    setLastError(null);
    setIntent({ kind: "releasing", reservationId, done: false });
    void cancel(reservationId).then((outcome) => {
      if (outcome.kind === "cancelled") {
        setIntent({ kind: "releasing", reservationId, done: true });
      } else {
        setIntent(previous);
        setLastError({ source: "release", message: getLabErrorMessage(outcome.error) });
      }
    });
  }, [activeId, cancel, intent]);

  const onReserveStart = useCallback(() => {
    setLastError(null);
    setIntent({ kind: "reserving" });
  }, []);

  const onReserved = useCallback(() => {
    setIntent({ kind: "reserved", at: Date.now() });
  }, []);

  const onReserveFailed = useCallback((message: string | null) => {
    setIntent(IDLE_INTENT);
    setLastError(message === null ? null : { source: "reserve", message });
  }, []);

  const acknowledgeRevocation = useCallback(() => {
    setEnded((previous) => (previous ? { ...previous, acknowledged: true } : previous));
    setIntent(IDLE_INTENT);
    setLastError(null);
  }, []);

  const state = deriveConnectionState(
    reservation,
    { state: controlState, pending: view.pending !== null },
    roomInput,
    intent,
    lastError,
  );
  // A 423 (someone else operates) is the observer case, never an error.
  const controlError = view.error !== null && view.error !== CONTROL_COPY.errors.locked ? view.error : null;
  let error = lastError?.message ?? null;

  if (error === null && state === "ERROR" && room.rejectedReason !== null) {
    error = LAB_CONNECTION_COPY.joinRejected(joinRejectedMessage(room.rejectedReason));
  } else if (error === null && intent.kind === "connect") {
    error = controlError;
  }

  const enabled = connectionActions(state, { reservation, isStaff });
  const canReserve = enabled.reserve;
  const canRelease = enabled.release;
  const canConnect = enabled.connect;
  const canDisconnect = enabled.disconnect;
  const reservedBy = isReservedByOther(reservation) && active ? reservedByText(active) : null;
  const operatorName = controlOperatorLabel(controlState);
  const relation = reservation?.relation ?? "none";
  const modal = useMemo(
    () => (ended && !ended.acknowledged ? revocationModal(ended.revocation, data, ended.reservationId) : null),
    [ended, data],
  );
  const controlValue = useMemo(
    () => (access ? { view, take, takeover, release: releaseOwnControl, dismissLoss } : null),
    [access, view, take, takeover, releaseOwnControl, dismissLoss],
  );

  return useMemo<LabConnectionValue>(() => ({
    state,
    intent: intent.kind,
    error,
    connected: state === "CONNECTED",
    connect,
    disconnect,
    release,
    actions: { reserve: canReserve, release: canRelease, connect: canConnect, disconnect: canDisconnect },
    socketOnline,
    reservation: active,
    reservedBy,
    relation,
    isOperator,
    operatorName,
    control: controlValue,
    onReserveStart,
    onReserved,
    onReserveFailed,
    revocation: modal,
    acknowledgeRevocation,
  }), [
    state,
    intent.kind,
    error,
    connect,
    disconnect,
    release,
    canReserve,
    canRelease,
    canConnect,
    canDisconnect,
    socketOnline,
    active,
    reservedBy,
    relation,
    isOperator,
    operatorName,
    controlValue,
    onReserveStart,
    onReserved,
    onReserveFailed,
    modal,
    acknowledgeRevocation,
  ]);
}

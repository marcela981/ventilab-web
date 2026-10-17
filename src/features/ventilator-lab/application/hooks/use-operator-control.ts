/*
* Funcionalidad: useOperatorControl
* Descripción: Exclusive operator control of the physical ventilator for the live console page. Reads GET
*   /api/ventilator/control (SWR; the state follows the SWR data, so a deduplicated or cached read reaches every
*   consumer) into the pure control state machine, applies `ventilator:control-changed` at once and re-reads the state
*   after every event, every request and every socket re-authentication (the backend stays the authority). take /
*   takeover / release run the control endpoints with a pending state and the Spanish error of the backend code.
*   Presence (backend operator-control.service): the backend releases the control VENTILATOR_OPERATOR_GRACE_SECONDS
*   after the operator's LAST socket closes; a heartbeat (socket message or HTTP) only cancels that pending release and
*   nothing restarts it, and `lastSeenAt` is not used for expiry. So the page beats ONLY with the socket message
*   ventilator:heartbeat while the socket is authenticated (every heartbeatMs, three beats per vendored grace) and
*   NEVER over HTTP: while the socket is down the backend grace runs (an HTTP beat would cancel it for good and keep a
*   crashed browser in control until the reservation ends); after re-authentication the state is re-read. The beat
*   stops when the caller stops being the operator and on unmount. Leaving the page (unmount or `pagehide`) releases the
*   control with a keepalive DELETE only when the caller is the operator AND the socket is authenticated AND the state
*   was re-read since the last authentication (the backend lets teachers/admins release ANYONE's control, so a stale
*   "operator" must never send it). A page restored from the back-forward cache is marked not operator ("suspended")
*   and re-read. The view also carries the control loss of the operator (T9 notice) with `dismissLoss`; T9:
*   `releaseOnLeaveEnabled` false (session reservation ended) sends no release on leaving. v1.2 (T9 review fix W2):
*   re-reads go through the control service (SWR's bound mutate resolves with the stale cache on a failed or
*   superseded fetch) and are numbered (bumped on each re-read and each control-changed event): only the latest answer
*   is applied (and written to the SWR cache without revalidating) and only it can verify the state; a failed re-read
*   verifies nothing. Depends on
*   React, SWR, the realtime hooks, the session, the control service and entity and the vendored backend defaults. v1.3 (T11 review: T9 residual): the SWR `data` effect
*   applies the same sequence guard: while a control-changed event is newer than the last applied re-read answer, SWR
*   revalidations (reconnect / focus) are ignored, so an older state never overrides the event. v1.4 (T12 review fix):
*   W2 an answer arriving after unmount is dropped (`activeRef`) and the SWR cache write swallows its own rejection
*   (the cache provider may already be gone); S1 a failed re-read while a control-changed event is still unconfirmed is
*   retried ONCE per event after `rereadRetryMs` (the guard against older SWR data stays closed until a re-read
*   answers; a second failure leaves it closed until the next event, action, re-authentication or bfcache restore).
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { useSocket, useSocketEvent } from "@shared/realtime";
import { useSession } from "@shared/session/use-session";
import {
  readControlStateResult,
  releaseControl,
  releaseControlKeepalive,
  takeControl,
  takeOverControl,
  toOperatorControlState,
  VENTILATOR_CONTROL_PATH,
} from "../../api/services/ventilator-control.service";
import { VENDORED_LAB_BACKEND_DEFAULTS } from "../config/vendored/lab-settings.defaults";
import {
  controlHeartbeatIntervalMs,
  controlReducer,
  getControlErrorMessage,
  INITIAL_CONTROL_VIEW,
} from "../entities/operator-control.entity";
import type { ControlAction, ControlView } from "../entities/operator-control.entity";

export const CONTROL_HEARTBEAT_MS = controlHeartbeatIntervalMs(VENDORED_LAB_BACKEND_DEFAULTS["control.operatorGraceSeconds"]);

export type UseOperatorControlOptions = {
  /** False: no read, no beat, no release (e.g. no console session). */
  enabled: boolean
  heartbeatMs?: number
  /** Injectable for tests; default the keepalive DELETE. */
  releaseOnLeave?: () => void
  /** T9: false once the session reservation ended (the backend releases it; a stale DELETE could hit the next one). */
  releaseOnLeaveEnabled?: boolean
  /** S1 (T12 review fix): delay of the single retry of a failed re-read after a control-changed event. */
  rereadRetryMs?: number
};

export type UseOperatorControlResult = {
  view: ControlView
  take: () => Promise<void>
  takeover: () => Promise<void>
  release: () => Promise<void>
  /** Hides the control loss notice. */
  dismissLoss: () => void
};

const REQUESTS: Readonly<Record<ControlAction, () => Promise<void>>> = {
  take: takeControl,
  takeover: takeOverControl,
  release: releaseControl,
};

/** The state was never verified since the last authentication (epochs start at 1). */
const NO_EPOCH = -1;

export const CONTROL_REREAD_RETRY_MS = 1000;

export function useOperatorControl({
  enabled,
  heartbeatMs = CONTROL_HEARTBEAT_MS,
  releaseOnLeave = releaseControlKeepalive,
  releaseOnLeaveEnabled = true,
  rereadRetryMs = CONTROL_REREAD_RETRY_MS,
}: UseOperatorControlOptions): UseOperatorControlResult {
  const { user } = useSession();
  const selfUserId = user?.id ?? null;
  const { socket, status } = useSocket();
  const [view, dispatch] = useReducer(controlReducer, INITIAL_CONTROL_VIEW);
  const { data, mutate } = useApiQuery(enabled ? VENTILATOR_CONTROL_PATH : null);
  const isOperator = enabled && view.state?.isOperator === true;
  const isOperatorRef = useRef(isOperator);
  const releasedRef = useRef(false);
  const socketRef = useRef({ socket, status });
  const releaseOnLeaveRef = useRef(releaseOnLeave);
  const releaseEnabledRef = useRef(releaseOnLeaveEnabled);
  // Authentications seen (incremented on each one) and the one after which the state was last re-read.
  const authEpochRef = useRef(0);
  const verifiedEpochRef = useRef(NO_EPOCH);
  // W2: bumped on every re-read and every control-changed event; only the answer of the latest re-read counts.
  const readSeqRef = useRef(0);
  // T9 residual: sequence of the last control-changed event and of the last applied re-read answer. While an event is
  // newer than the last applied answer, SWR's own revalidations (reconnect / focus / mount) may answer for an older
  // state and are ignored; the re-read the event requested decides.
  const lastEventSeqRef = useRef(0);
  const appliedSeqRef = useRef(0);
  // W2 (T12 review fix): false once unmounted; late answers are dropped.
  const activeRef = useRef(false);
  // S1 (T12 review fix): the event sequence whose failed re-read was already retried, and the pending retry timer.
  const retriedEventSeqRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeRef.current = true;

    return () => {
      activeRef.current = false;

      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    // Becoming the operator (again) arms the release on leave once more.
    if (isOperator && !isOperatorRef.current) {
      releasedRef.current = false;
    }

    isOperatorRef.current = isOperator;
    socketRef.current = { socket, status };
    releaseOnLeaveRef.current = releaseOnLeave;
    releaseEnabledRef.current = releaseOnLeaveEnabled;
  });

  // S1: the SWR data (also deduplicated or cached reads, which skip onSuccess) is the loaded state.
  useEffect(() => {
    if (enabled && data && lastEventSeqRef.current <= appliedSeqRef.current) {
      dispatch({ type: "loaded", state: toOperatorControlState(data.data) });
    }
  }, [enabled, data]);

  // W2: the re-read goes through the service (SWR's bound mutate resolves with the stale cache when the fetch fails or
  // is superseded); a failed or superseded answer is dropped and never verifies the state.
  const reread = useCallback(function rereadState() {
    readSeqRef.current += 1;
    const seq = readSeqRef.current;
    const epoch = authEpochRef.current;

    void readControlStateResult().then((result) => {
      if (!activeRef.current || seq !== readSeqRef.current) {
        return;
      }

      appliedSeqRef.current = seq;
      // The SWR cache may be gone (unmount in the same tick, provider removed): its rejection is not ours to raise.
      void mutate(result, { revalidate: false }).catch(() => undefined);
      // An identical answer keeps the SWR data reference, so the effect above would not run: apply it here.
      dispatch({ type: "loaded", state: toOperatorControlState(result.data) });

      if (epoch > 0 && epoch === authEpochRef.current && socketRef.current.status === "authenticated") {
        verifiedEpochRef.current = epoch;
      }
    }, () => {
      const eventSeq = lastEventSeqRef.current;
      // S1: only the latest re-read, only while an event is unconfirmed, only once per event.
      const retry = activeRef.current && seq === readSeqRef.current && eventSeq > appliedSeqRef.current
        && retriedEventSeqRef.current !== eventSeq;

      if (retry) {
        retriedEventSeqRef.current = eventSeq;

        if (retryTimerRef.current !== null) {
          clearTimeout(retryTimerRef.current);
        }

        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;

          if (activeRef.current && seq === readSeqRef.current) {
            rereadState();
          }
        }, rereadRetryMs);
      }
    }).catch(() => undefined);
  }, [mutate, rereadRetryMs]);

  useSocketEvent("ventilator:control-changed", (event) => {
    if (!enabled) {
      return;
    }

    // Any re-read requested before this event answers for an older state.
    readSeqRef.current += 1;
    lastEventSeqRef.current = readSeqRef.current;
    dispatch({ type: "changed", event, selfUserId });
    reread();
  });

  // The server forgets nothing about the control on reconnect, but events may have been missed meanwhile (and the
  // presence grace may have released the control while the socket was down).
  useEffect(() => {
    if (enabled && status === "authenticated") {
      authEpochRef.current += 1;
      reread();
    }
  }, [enabled, status, reread]);

  useEffect(() => {
    if (!isOperator) {
      return undefined;
    }

    const timer = setInterval(() => {
      const current = socketRef.current;

      // W1: only over the socket; while it is down the backend grace must be allowed to run.
      if (current.socket && current.status === "authenticated") {
        current.socket.emit("ventilator:heartbeat");
      }
    }, heartbeatMs);

    return () => clearInterval(timer);
  }, [isOperator, heartbeatMs]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const leave = () => {
      const verified = socketRef.current.status === "authenticated" && verifiedEpochRef.current === authEpochRef.current;

      if (isOperatorRef.current && verified && releaseEnabledRef.current && !releasedRef.current) {
        releasedRef.current = true;
        releaseOnLeaveRef.current();
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // S2: whatever the restored page shows may be stale until the re-read.
        verifiedEpochRef.current = NO_EPOCH;
        dispatch({ type: "suspended" });
        releasedRef.current = false;
        reread();
      }
    };

    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", onPageShow);
      leave();
    };
  }, [enabled, reread]);

  const run = useCallback(async(action: ControlAction) => {
    dispatch({ type: "requested", action });

    try {
      await REQUESTS[action]();
      dispatch({ type: "succeeded", action });
    } catch (caught) {
      dispatch({ type: "failed", action, message: getControlErrorMessage(caught) });
    } finally {
      reread();
    }
  }, [reread]);

  const take = useCallback(() => run("take"), [run]);
  const takeover = useCallback(() => run("takeover"), [run]);
  const release = useCallback(() => run("release"), [run]);
  const dismissLoss = useCallback(() => dispatch({ type: "dismissLoss" }), []);

  return { view, take, takeover, release, dismissLoss };
}

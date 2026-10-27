/*
* Funcionalidad: SimSessionHost
* Descripción: Owner of one simulation session's lifecycle, hostable outside the session console page (W2, Bloque 1;
*   the /simulador workspace mounts it above its tabs in W5). It claims the session for this tab (useTabClaim:
*   Web Locks/BroadcastChannel, released on a `pagehide` that may enter the back/forward cache and claimed again on
*   restore), boots it only once claimed (useSessionBootstrap), counts the consecutive time-ahead refusals of a resync
*   and keeps the AI assist answers above the remounted runner. While the boot is ready a runner keyed by the session
*   id (a new session or boot remounts it) runs useSimSession and owns the end flow: "Finalizar" (pause → flush →
*   POST /end → leave), the EXAM deadline (stop, bounded flush, /end and back to the exam even when the end fails; a
*   student end in flight is awaited through `endInFlightRef`), one navigation away (`onEnded`, else the exam return
*   url or the result, with the full-page fallback when the client navigation is cancelled or rejected) and the
*   divergence resync (`settle()` of the old queue before the rebuild, fast-forward dropped after repeated time-ahead
*   refusals). The runner renders nothing: it lifts its memoised controller to the host, so the children stay mounted
*   across claims, boots and resyncs and read everything with `useSimSessionHost()`. High-frequency data never goes
*   through the context (the console and the clock read `running.session.store`).
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { TIME_AHEAD_REFUSALS_BEFORE_NO_FAST_FORWARD } from "../config/sim-console.config";
import { DEADLINE_FLUSH_TIMEOUT_MS } from "../config/sim-exam.config";
import { buildExamAttemptUrl, buildSessionResultUrl, EVALUATIONS_LIST_URL } from "../config/simulator.routes";
import type { SimulationMode } from "../config/simulator.config";
import type { AssistTurn } from "../entities/sim-assist.entity";
import { checkEngineVersion } from "../entities/sim-session.entity";
import type { SessionBoot, SessionRecord } from "../entities/sim-session.entity";
import { useExamDeadline } from "../hooks/use-exam-deadline";
import { useSessionBootstrap } from "../hooks/use-session-bootstrap";
import { useSimSession } from "../hooks/use-sim-session";
import type { DivergenceCause, SimSessionDeps, SimSessionView } from "../hooks/use-sim-session";
import { defaultClaim, useTabClaim } from "../hooks/use-tab-claim";
import type { ClaimFn } from "../hooks/use-tab-claim";
import { examReturnStore } from "../session/exam-return-store";
import type { ExamReturnStore } from "../session/exam-return-store";
import type { BootstrapDeps } from "../session/session-bootstrap";

export type SimSessionHostDeps = {
  bootstrap?: Partial<BootstrapDeps> | undefined
  session?: SimSessionDeps | undefined
  /** One-tab claim of the session (default: Web Locks with a BroadcastChannel fallback). */
  claimTab?: ClaimFn | undefined
  /** Exam return record fallback of an EXAM session without its exam context. */
  examReturn?: ExamReturnStore | undefined
};

export type SimSessionPhase = "claiming" | "taken" | "loading" | "ended" | "unavailable" | "ready";

export type EngineVersionCheck = ReturnType<typeof checkEngineVersion>;

/** The running session (boot ready and claimed): the simulation plus its end, deadline and resync flow. */
export type SimSessionRunning = {
  boot: SessionBoot
  version: EngineVersionCheck
  /** EXAM with a mismatched engine version: the worker never starts. */
  blocked: boolean
  session: SimSessionView
  /** Running or paused, and the EXAM deadline not reached. */
  controllable: boolean
  deadlineReached: boolean
  endError: string | null
  resyncing: boolean
  /** The end confirmation is open. */
  confirming: boolean
  requestEnd: () => void
  cancelEnd: () => void
  /** Ends the session (pause → flush → /end) and leaves; an error keeps the session with `endError`. */
  finish: () => Promise<void>
  /** Rebuilds the session from the server after a divergence, once the old queue settled. */
  resync: () => void
};

export type SimSessionHostValue = {
  sessionId: string
  phase: SimSessionPhase
  /** Why the session cannot be resumed (phase `unavailable`). */
  unavailable: { title: string, message: string } | null
  /** Mode of the booted session; null before the boot. */
  mode: SimulationMode | null
  retry: () => void
  /** AI assist answers, kept above the runner so they survive a resync. */
  assistHistory: readonly AssistTurn[]
  onAssistAnswered: (turn: AssistTurn) => void
  running: SimSessionRunning | null
};

const SimSessionHostContext = createContext<SimSessionHostValue | null>(null);

/** The session host above this component (throws outside a SimSessionHost). */
export function useSimSessionHost(): SimSessionHostValue {
  const value = useContext(SimSessionHostContext);

  if (value === null) {
    throw new Error("useSimSessionHost must be used inside a SimSessionHost");
  }

  return value;
}

/** Where an ended EXAM session returns: the attempt of its exam context, of the exam return record, or the list. */
export function examReturnUrlOf(record: SessionRecord, store: ExamReturnStore): string {
  if (record.exam) {
    return record.exam.returnUrl;
  }

  const recorded = store.read(record.id);

  return recorded ? buildExamAttemptUrl(recorded.evaluationId, recorded.attemptId) : EVALUATIONS_LIST_URL;
}

const NO_TURNS: readonly AssistTurn[] = [];

type RunnerProps = {
  boot: SessionBoot
  sessionId: string
  onEnded: ((sessionId: string) => void | Promise<void>) | undefined
  sessionDeps: SimSessionDeps | undefined
  examReturn: ExamReturnStore | undefined
  onResync: (cause: DivergenceCause | null) => void
  onController: (boot: SessionBoot, controller: SimSessionRunning | null) => void
};

type RunnerActions = Pick<SimSessionRunning, "requestEnd" | "cancelEnd" | "finish" | "resync">;

/** Runs one boot (keyed by the session id); renders nothing and lifts its controller to the host. */
function SimSessionRunner({ boot, sessionId, onEnded, sessionDeps, examReturn, onResync, onController }: RunnerProps) {
  const router = useRouter();
  const { record } = boot;
  const exam = record.mode === "EXAM";
  const version = useMemo(() => checkEngineVersion(record.mode, record.engineVersion), [record.engineVersion, record.mode]);
  const blocked = version.status === "blocked";
  const session = useSimSession({ boot, blocked, deps: sessionDeps });
  const [confirming, setConfirming] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [deadlineReached, setDeadlineReached] = useState(false);
  const leftRef = useRef(false);
  // Read by the student's end after its await (its render closure predates the deadline).
  const deadlineRef = useRef(false);
  const endInFlightRef = useRef<Promise<unknown> | null>(null);
  const controllable = (session.status === "running" || session.status === "paused") && !deadlineReached;

  // One navigation away, whoever ends the session first (the student or the deadline).
  const leave = async(): Promise<void> => {
    if (leftRef.current) {
      return;
    }

    leftRef.current = true;

    if (onEnded) {
      await onEnded(sessionId);

      return;
    }

    const url = exam ? examReturnUrlOf(record, examReturn ?? examReturnStore) : buildSessionResultUrl(sessionId);

    try {
      // The Pages Router resolves `false` (it does not reject) when the navigation is cancelled.
      const navigated = await router.push(url);

      if (!navigated) {
        leftRef.current = false;
        window.location.assign(url);
      }
    } catch {
      // A rejected client navigation (aborted, chunk load failure) must not strand the student on an ended session:
      // allow a later leave and fall back to a full page load.
      leftRef.current = false;
      window.location.assign(url);
    }
  };

  // Deadline: stop stepping (pause), flush the pending events within a bound, POST /end, then back to the exam even
  // if the end failed (the attempt is closed by the server anyway). A student end already in flight finishes alone.
  const onDeadline = (): void => {
    deadlineRef.current = true;
    setDeadlineReached(true);
    setConfirming(false);

    // The student's end is in flight: whatever its outcome, leave once it settles. Decided on the ref only: this
    // callback can run from a render closure whose `session.ending` is already stale.
    const inFlight = endInFlightRef.current;

    if (inFlight) {
      void inFlight.finally(() => leave());

      return;
    }

    void session.end({ flushTimeoutMs: DEADLINE_FLUSH_TIMEOUT_MS }).then(() => leave());
  };

  // Only the expiry matters here; the countdown display runs its own ticker (no per-second controller change).
  useExamDeadline({
    deadline: exam ? record.expiresAt : null,
    serverOffsetMs: record.exam?.serverOffsetMs ?? boot.serverOffsetMs,
    onExpire: onDeadline,
  });

  // The new boot reads the outbox: let the old queue settle first.
  const resync = (): void => {
    if (resyncing) {
      return;
    }

    setResyncing(true);
    void session.settle().finally(() => onResync(session.divergenceCause));
  };

  const finish = async(): Promise<void> => {
    setEndError(null);

    const pending = session.end();

    endInFlightRef.current = pending;

    const outcome = await pending.finally(() => {
      endInFlightRef.current = null;
    });

    // Past the deadline the student never stays: the server closes the attempt anyway.
    if (deadlineRef.current) {
      setConfirming(false);
      await leave();

      return;
    }

    if (outcome.status === "error") {
      setEndError(outcome.message);
      setConfirming(false);

      return;
    }

    if (outcome.status === "ended") {
      setConfirming(false);
      await leave();
    }
  };

  // Stable entry points for the UI; they always run the latest closures of this render.
  const actionsRef = useRef<RunnerActions | null>(null);

  useEffect(() => {
    actionsRef.current = {
      requestEnd: () => setConfirming(true),
      cancelEnd: () => setConfirming(false),
      finish,
      resync,
    };
  });

  const requestEnd = useCallback(() => actionsRef.current?.requestEnd(), []);
  const cancelEnd = useCallback(() => actionsRef.current?.cancelEnd(), []);
  const finishAction = useCallback(() => actionsRef.current?.finish() ?? Promise.resolve(), []);
  const resyncAction = useCallback(() => actionsRef.current?.resync(), []);

  const controller = useMemo<SimSessionRunning>(() => ({
    boot,
    version,
    blocked,
    session,
    controllable,
    deadlineReached,
    endError,
    resyncing,
    confirming,
    requestEnd,
    cancelEnd,
    finish: finishAction,
    resync: resyncAction,
  }), [blocked, boot, cancelEnd, confirming, controllable, deadlineReached, endError, finishAction, requestEnd, resyncAction, resyncing, session, version]);

  // Lifted before paint; cleared when this runner unmounts (another boot or session takes over).
  useLayoutEffect(() => {
    onController(boot, controller);
  }, [boot, controller, onController]);

  useLayoutEffect(() => () => onController(boot, null), [boot, onController]);

  return null;
}

export type SimSessionHostProps = {
  sessionId: string
  /** Replaces the navigation to the result after a successful end (T9: return to the exam). */
  onEnded?: ((sessionId: string) => void | Promise<void>) | undefined
  deps?: SimSessionHostDeps | undefined
  children: ReactNode
};

type LiftedController = { boot: SessionBoot, controller: SimSessionRunning } | null;

export function SimSessionHost({ sessionId, onEnded, deps, children }: SimSessionHostProps) {
  const claim = useTabClaim(sessionId, deps?.claimTab ?? defaultClaim);
  // Only the tab that drives the session boots it (a duplicated tab copies its sessionStorage).
  const { state, retry } = useSessionBootstrap(claim === "claimed" ? sessionId : null, { examReturn: deps?.examReturn, ...deps?.bootstrap });
  // Per session (a client-side navigation to another session keeps this host mounted).
  const [refusalState, setRefusalState] = useState({ sessionId, count: 0 });
  const timeAheadRefusals = refusalState.sessionId === sessionId ? refusalState.count : 0;
  // Kept above the remounted runner, so the answers survive a resync.
  const [assistState, setAssistState] = useState<{ sessionId: string, turns: readonly AssistTurn[] }>({ sessionId, turns: [] });
  const assistHistory = assistState.sessionId === sessionId ? assistState.turns : NO_TURNS;
  const [lifted, setLifted] = useState<LiftedController>(null);
  const boot = claim === "claimed" && state.status === "ready" ? state.boot : null;
  const running = lifted !== null && lifted.boot === boot ? lifted.controller : null;

  const onAssistAnswered = useCallback((turn: AssistTurn) => {
    setAssistState((current) => {
      const turns = current.sessionId === sessionId ? current.turns : NO_TURNS;

      return turns.some((item) => item.aiHelpEventId === turn.aiHelpEventId) ? current : { sessionId, turns: [...turns, turn] };
    });
  }, [sessionId]);

  const onResync = useCallback((cause: DivergenceCause | null) => {
    const refusals = cause === "time_ahead" ? timeAheadRefusals + 1 : 0;

    setRefusalState({ sessionId, count: refusals });
    // A repeated time-ahead refusal means the fast-forward overshoots the server: resume at the last known time.
    retry({ fastForward: refusals < TIME_AHEAD_REFUSALS_BEFORE_NO_FAST_FORWARD });
  }, [retry, sessionId, timeAheadRefusals]);

  const onController = useCallback((owner: SessionBoot, controller: SimSessionRunning | null) => {
    setLifted((current) => {
      if (controller !== null) {
        return current?.boot === owner && current.controller === controller ? current : { boot: owner, controller };
      }

      // A runner that unmounts only clears its own controller.
      return current?.boot === owner ? null : current;
    });
  }, []);

  const retryBoot = useCallback(() => retry(), [retry]);

  let phase: SimSessionPhase;

  if (claim === "taken") {
    phase = "taken";
  } else if (claim === "pending") {
    phase = "claiming";
  } else if (state.status === "ready") {
    phase = "ready";
  } else {
    phase = state.status;
  }

  const unavailable = state.status === "unavailable" ? { title: state.title, message: state.message } : null;
  const unavailableTitle = unavailable?.title;
  const unavailableMessage = unavailable?.message;
  const mode = state.status === "ready" ? state.boot.record.mode : null;

  const value = useMemo<SimSessionHostValue>(() => ({
    sessionId,
    phase,
    unavailable: unavailableTitle !== undefined && unavailableMessage !== undefined ? { title: unavailableTitle, message: unavailableMessage } : null,
    mode,
    retry: retryBoot,
    assistHistory,
    onAssistAnswered,
    running,
  }), [assistHistory, mode, onAssistAnswered, phase, retryBoot, running, sessionId, unavailableMessage, unavailableTitle]);

  return (
    <SimSessionHostContext.Provider value={value}>
      {boot ? (
        <SimSessionRunner
          key={boot.record.id}
          boot={boot}
          sessionId={sessionId}
          onEnded={onEnded}
          sessionDeps={deps?.session}
          examReturn={deps?.examReturn}
          onResync={onResync}
          onController={onController}
        />
      ) : null}
      {children}
    </SimSessionHostContext.Provider>
  );
}

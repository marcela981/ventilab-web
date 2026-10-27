/*
* Funcionalidad: useSimSession
* Descripción: Runs one simulation session in the browser and exposes it as a ventilator console adapter. It creates
*   the Web Worker through the sim-engine client (only inside an effect, so never during SSR), initialises it with the
*   session case, seed and slow-dynamics multiplier plus the stored events and the resume time, and starts it when the
*   worker is ready; physics never runs on the main thread. Worker batches feed a stable frame source (sourceId =
*   session id, 50 Hz) that pushes samples straight to the console curves without React renders, while metrics,
*   alarms, vitals trends and the clock update React state only on a metrics snapshot, a status change or at most
*   every 250 ms. A CONFIRMAR becomes one PARAM_CHANGE event (client id, simTimeMs of the latest batch, payload
*   {changes}) validated locally like the engine and the backend do, sent to the worker and enqueued in the event
*   queue; a pending or cancelled edit produces nothing. FREE sessions can pause, resume and change the playback
*   multiplier (never above the session multiplier, which bounds the simulated time on the server); EXAM keeps the
*   session multiplier and has no pause. end() pauses the worker, flushes the events, calls POST /end and only then
*   stops the worker; a failure keeps the session and resumes it. Events are also flushed on pagehide/beforeunload and
*   on unmount (best effort). Dependencies (worker factory, HTTP calls, ids, timers, clock) are injectable for tests.
*   v1.1 (determinism): CONFIRMAR sends the event to the worker with its client id and NO time; the worker applies it
*   at its own current simulated time and acknowledges {id, effectiveSimTimeMs} in the next batch, and only then is
*   the PARAM_CHANGE enqueued for the backend, with that effective time and the same id (local run == server replay).
*   A rejected event shows the change error, rolls the displayed setting back and is never enqueued. end() waits (at
*   most EVENT_ACK_TIMEOUT_MS) for the pending acknowledgements before flushing; an unacknowledged change is not sent.
*   v1.2 (review of 8efd9e4): an event the server refuses is a divergence (`diverged`, the page blocks and offers a
*   reload that resumes from the server); the unacknowledged queue is mirrored to sessionStorage (event outbox) and the
*   unsent events of a reload are sent before the simulation starts; page hide sends the queue with a keepalive fetch
*   (beforeunload no longer flushes); init carries the wall-clock backlog of the boot; end() posts the simulated time
*   of the first paused batch (fallback: the latest batch after EVENT_ACK_TIMEOUT_MS); metrics re-render at most every
*   UI_REFRESH_INTERVAL_MS (a trailing refresh keeps the last snapshot); `pendingEvents` counts the unsent events.
*   v1.3 (review of 524aedf): `divergenceCause` tells a time-ahead refusal (403 other than an access denial: simulated
*   time ahead of the server bound) from any other refusal, so the page can stop fast-forwarding after a repeated one;
*   `settle()` stops the queue timers and waits (at most RESYNC_SETTLE_TIMEOUT_MS) for its flush before a resync, so
*   the new boot reads a settled outbox. The page-hide keepalive is best effort (the outbox is the guarantee).
*   v1.4 (T9): `end({ flushTimeoutMs })` bounds the flush of the pending events (EXAM deadline): POST /end goes out
*   once the flush settles or the time runs out. v1.5 (review of 180a0a1): `settle()` disposes the queue AFTER its
*   flush settles or times out, and neither a disposed queue nor a cleaned-up effect writes the outbox again, so a
*   late acknowledgement of the old queue cannot overwrite the outbox of the new boot.
*   v1.6 (review of eb3c21b): `end()` on a session whose worker is not booted (no worker, blocked, or still
*   "starting", e.g. an EXAM deadline already past at mount) no longer answers `busy`: it flushes the queued events
*   (bounded like the normal end), posts /end at the last known simulated time, stops the worker and never starts it.
*   v1.7 (T12): the frame hub moved unchanged to `@shared/sim-engine/console-binding` (`createConsoleFrameHub`), which
*   the case editor local preview also uses.
*   v1.8 (A6, AUDIT_SYNC F4): while the session runs the access token is kept fresh (`keepAccessTokenFresh`), so
*   the page-hide keepalive flush carries a valid token.
*   v1.9 (W2, Bloque 1): the low-frequency state (simulated time, status, engine metrics, alarms, trends, applied
*   settings) lives in an external store (`store`, created per boot) instead of React state: worker batches publish
*   immutable snapshots at most every UI_REFRESH_INTERVAL_MS (createUiThrottle: a status change at once, a metrics
*   snapshot inside the window at its end), and `adapter` is a `ConsoleAdapterStore` with a stable identity for the
*   whole boot whose unchanged slices keep their identity, so the console zones re-render only when their own slice
*   changes. The hook itself re-renders only when the status or the applied settings change (no `simTimeMs` or
*   `objectives` in the view any more: read them from `store`, e.g. with useSimSessionSlice).
* Versión: 1.9
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toApiError } from "@shared/api-client/api-error";
import { keepAccessTokenFresh } from "@shared/api-client/keepalive-auth";
import { createSimWorker } from "@shared/sim-engine";
import { createConsoleFrameHub } from "@shared/sim-engine/console-binding";
import type { EngineMetrics, SimBatch, SimLoopStatus, SimWorkerClient, VentilatorSettings } from "@shared/sim-engine";
import { createExternalStore, createUiThrottle, mapStore, reuseUnchangedSlices, useStoreSelector } from "@shared/ventilator-console";
import type {
  ConsoleAdapterStore,
  ConsoleConfirmation,
  ConsoleFrameSource,
  ExternalStore,
  ModeParameterTable,
  VentilatorConsoleAdapter,
  WritableStore,
} from "@shared/ventilator-console";
import {
  appendSimulationEvents,
  endSimulationSession,
  sendSimulationEventsKeepalive,
} from "../../api/services/simulation-sessions.service";
import { EVENT_ACK_TIMEOUT_MS, RESYNC_SETTLE_TIMEOUT_MS, UI_REFRESH_INTERVAL_MS } from "../config/sim-console.config";
import { TIME_MULTIPLIERS } from "../config/simulator.config";
import type { TimeMultiplier } from "../config/simulator.config";
import type { ClientSessionEvent, SessionBoot } from "../entities/sim-session.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import { createEventQueue } from "../session/event-queue";
import type { EventQueue, QueueTimers } from "../session/event-queue";
import { eventOutbox } from "../session/event-outbox";
import type { EventOutbox } from "../session/event-outbox";
import {
  applicabilityFor,
  applyChanges,
  CHANGE_COPY,
  initialSettingsOf,
  reconcileEvents,
  toSettingsChanges,
  validateSettingsChange,
} from "../session/sim-console-adapter";
import type { PendingSettingsEvent } from "../session/sim-console-adapter";
import { buildSimConsoleAdapter, ingestBatch, initialLiveState } from "../session/sim-live-state";
import type { SimLiveState } from "../session/sim-live-state";
import { sessionStore } from "../session/session-store";
import type { SessionStore } from "../session/session-store";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const SIM_SESSION_COPY = {
  noWorker: "Este navegador no puede ejecutar la simulación (sin soporte de Web Workers). Usa un navegador actualizado.",
  workerFailed: "La simulación se detuvo por un error interno. Recarga la página para reanudar la sesión.",
  syncFailed: (detail: string) => `Algunos cambios no se guardaron en el servidor: ${detail}`,
} as const;

export type SimSessionStatus = SimLoopStatus | "starting";

export type DivergenceCause = "time_ahead" | "other";

/**
 * POST /events answers 403 when the session is not the caller's or when the event simulated time is ahead of
 * elapsed × multiplier + tolerance (contract). The owner cannot change during a session, so any other 403 is a
 * time-ahead refusal.
 */
export function divergenceCauseOf(error: unknown): DivergenceCause {
  const { status, code } = toApiError(error);

  return status === 403 && code !== "simulation.session_access_denied" ? "time_ahead" : "other";
}

export type SimSessionDeps = {
  createWorker?: () => SimWorkerClient | null
  sendEvents?: (sessionId: string, events: readonly ClientSessionEvent[]) => Promise<unknown>
  endSession?: (sessionId: string, simTimeMs: number) => Promise<void>
  createEventId?: () => string
  queueTimers?: QueueTimers
  /** Wall clock for the UI refresh throttle. */
  now?: () => number
  store?: SessionStore
  outbox?: EventOutbox
  /** Page-hide flush that outlives the page (keepalive fetch). */
  sendKeepalive?: (sessionId: string, events: readonly ClientSessionEvent[]) => void
};

export type EndSessionOutcome = { status: "ended" } | { status: "error", message: string } | { status: "busy" };

export type EndSessionOptions = {
  /**
   * Bounds the flush of the pending events (EXAM deadline): after this many ms POST /end goes out anyway and the
   * unsent events stay in the outbox. Without it the flush runs its normal retry cycle.
   */
  flushTimeoutMs?: number | undefined
};

/** Low-frequency state of a running session, published at most every UI_REFRESH_INTERVAL_MS (status changes at once). */
export type SimSessionSnapshot = {
  /** Console adapter snapshot; null while the session is blocked (EXAM engine mismatch). */
  console: VentilatorConsoleAdapter | null
  status: SimSessionStatus
  simTimeMs: number
  /** Latest engine metrics (live objectives); null before the first snapshot. */
  metrics: EngineMetrics | null
  applied: VentilatorSettings
};

export type SimSessionStore = ExternalStore<SimSessionSnapshot>;

export type SimSessionView = {
  /** Stable for the whole boot: the console reads each slice from it (null without a session or while blocked). */
  adapter: ConsoleAdapterStore | null
  /** Low-frequency session state (clock, status, metrics); null without a session. */
  store: SimSessionStore | null
  applicability: ModeParameterTable | undefined
  status: SimSessionStatus
  multiplier: TimeMultiplier
  /** Playback multipliers the session allows (up to the session multiplier). */
  multiplierOptions: readonly TimeMultiplier[]
  changeError: string | null
  dismissChangeError: () => void
  syncError: string | null
  /** The server refused an event: the local run no longer matches the server (reload to resume from the server). */
  diverged: boolean
  /** Why the last event was refused: its simulated time was ahead of the server bound, or anything else. */
  divergenceCause: DivergenceCause | null
  /** Stops the event queue and waits (bounded) for its last flush; call before rebuilding the session. */
  settle: () => Promise<void>
  /** Events waiting to be acknowledged by the server. */
  pendingEvents: number
  workerError: string | null
  ending: boolean
  pause: () => void
  resume: () => void
  setMultiplier: (multiplier: TimeMultiplier) => void
  end: (options?: EndSessionOptions) => Promise<EndSessionOutcome>
};

export type UseSimSessionOptions = {
  boot: SessionBoot | null
  /** EXAM with a mismatched engine version: the worker is never created. */
  blocked: boolean
  deps?: SimSessionDeps | undefined
};

let fallbackCounter = 0;

/** crypto.randomUUID when available, otherwise a time + random + counter id (≤ 64 chars, as the contract allows). */
export function createClientEventId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the local id.
  }

  fallbackCounter += 1;

  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${fallbackCounter}`;
}

const defaultTimers: QueueTimers = {
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** Resolves once the pending changes are acknowledged (a waiter is released), or after EVENT_ACK_TIMEOUT_MS. */
function waitForAcknowledgements(pendingCount: number, waiters: Set<() => void>, timers: QueueTimers = defaultTimers): Promise<void> {
  if (pendingCount === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let handle: unknown = null;
    const release = (): void => {
      waiters.delete(release);
      timers.clearTimeout(handle);
      resolve();
    };

    handle = timers.setTimeout(release, EVENT_ACK_TIMEOUT_MS);
    waiters.add(release);
  });
}

/** Waits for the flush, at most `timeoutMs`; a failed or late flush is not an error (the outbox keeps the events). */
function flushWithin(flush: Promise<unknown>, timeoutMs: number, timers: QueueTimers = defaultTimers): Promise<void> {
  return new Promise((resolve) => {
    const handle = timers.setTimeout(resolve, timeoutMs);

    void flush.catch(() => undefined).then(() => {
      timers.clearTimeout(handle);
      resolve();
    });
  });
}

/** Resolves with the simulated time of the next paused batch, or with `fallback()` after EVENT_ACK_TIMEOUT_MS. */
function waitForPausedBatch(waiters: Set<(simTimeMs: number) => void>, fallback: () => number, timers: QueueTimers = defaultTimers): Promise<number> {
  return new Promise((resolve) => {
    let handle: unknown = null;
    const release = (simTimeMs: number): void => {
      waiters.delete(release);
      timers.clearTimeout(handle);
      resolve(simTimeMs);
    };

    handle = timers.setTimeout(() => release(fallback()), EVENT_ACK_TIMEOUT_MS);
    waiters.add(release);
  });
}

type SnapshotInput = { applied: VentilatorSettings, live: SimLiveState, status: SimSessionStatus };

/** What the console snapshot needs besides the live values; null while blocked (no console). */
type ConsoleSource = { frames: ConsoleFrameSource, onConfirm: (confirmation: ConsoleConfirmation) => void, boot: SessionBoot };

/** The next snapshot; unchanged console slices keep their identity, and an identical snapshot is the previous one. */
function snapshotOf(previous: SimSessionSnapshot | null, { applied, live, status }: SnapshotInput, source: ConsoleSource | null): SimSessionSnapshot {
  const console = source === null
    ? null
    : reuseUnchangedSlices(previous?.console ?? null, buildSimConsoleAdapter({
      frames: source.frames,
      applied,
      live,
      canControl: status === "running" || status === "paused",
      onConfirm: source.onConfirm,
      targets: source.boot.record.engineCase.targets,
    }));

  if (
    previous !== null
    && previous.console === console
    && previous.status === status
    && previous.simTimeMs === live.simTimeMs
    && previous.metrics === live.metrics
    && previous.applied === applied
  ) {
    return previous;
  }

  return { console, status, simTimeMs: live.simTimeMs, metrics: live.metrics, applied };
}

type SessionStoreHandle = {
  store: WritableStore<SimSessionSnapshot>
  publish: (input: SnapshotInput) => void
};

function initialSettingsOfBoot(boot: SessionBoot): VentilatorSettings {
  return applyChanges(initialSettingsOf(boot.record.engineCase), boot.initialEvents);
}

/** One store per boot: a resync (new boot) starts from a fresh "starting" snapshot. */
function createSessionStoreHandle(boot: SessionBoot, source: ConsoleSource | null): SessionStoreHandle {
  const store = createExternalStore(snapshotOf(null, {
    applied: initialSettingsOfBoot(boot),
    live: initialLiveState(boot.startAtSimTimeMs),
    status: "starting",
  }, source));

  return { store, publish: (input) => store.set(snapshotOf(store.getSnapshot(), input, source)) };
}

type StatusSource = { status: SimSessionStatus, applied: VentilatorSettings | null };

const NO_SESSION: ExternalStore<StatusSource> = createExternalStore<StatusSource>({ status: "starting", applied: null });

const selectStatus = (snapshot: StatusSource): SimSessionStatus => snapshot.status;
const selectApplied = (snapshot: StatusSource): VentilatorSettings | null => snapshot.applied;
const selectConsole = (snapshot: SimSessionSnapshot): VentilatorConsoleAdapter => snapshot.console as VentilatorConsoleAdapter;

/** A slice of the session store (e.g. the clock for the time controls), re-rendering only when it changes. */
export function useSimSessionSlice<S>(store: SimSessionStore, selector: (snapshot: SimSessionSnapshot) => S, isEqual?: (a: S, b: S) => boolean): S {
  return useStoreSelector(store, selector, isEqual);
}

export function useSimSession({ boot, blocked, deps = {} }: UseSimSessionOptions): SimSessionView {
  const [multiplierState, setMultiplierState] = useState<{ boot: SessionBoot | null, multiplier: TimeMultiplier } | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [diverged, setDiverged] = useState(false);
  const [divergenceCause, setDivergenceCause] = useState<DivergenceCause | null>(null);
  const [pendingEvents, setPendingEvents] = useState(0);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const record = boot?.record ?? null;
  const sessionId = record?.id ?? null;
  const hub = useMemo(() => (sessionId ? createConsoleFrameHub(sessionId) : null), [sessionId]);
  // A new session starts at its own multiplier (the state of another boot is ignored).
  const multiplier: TimeMultiplier = multiplierState !== null && multiplierState.boot === boot
    ? multiplierState.multiplier
    : record?.timeMultiplier ?? 1;

  // The console keeps one stable onConfirm for the whole boot; it calls the latest confirm.
  const confirmRef = useRef<(confirmation: ConsoleConfirmation) => void>(() => undefined);
  const onConfirm = useCallback((confirmation: ConsoleConfirmation) => confirmRef.current(confirmation), []);
  const handle = useMemo(
    () => (boot ? createSessionStoreHandle(boot, hub && !blocked ? { frames: hub.source, onConfirm, boot } : null) : null),
    [blocked, boot, hub, onConfirm],
  );

  const depsRef = useRef(deps);
  const clientRef = useRef<SimWorkerClient | null>(null);
  const queueRef = useRef<EventQueue<ClientSessionEvent> | null>(null);
  const appliedRef = useRef<VentilatorSettings | null>(null);
  const liveRef = useRef<SimLiveState>(initialLiveState(0));
  // Settings the worker acknowledged, and the changes sent but not acknowledged yet (applied = acked + pending).
  const ackedRef = useRef<VentilatorSettings | null>(null);
  const pendingRef = useRef<PendingSettingsEvent[]>([]);
  const ackWaitersRef = useRef(new Set<() => void>());
  const pausedWaitersRef = useRef(new Set<(simTimeMs: number) => void>());
  const latestSimRef = useRef(0);
  const statusRef = useRef<SimSessionStatus>("starting");
  const endingRef = useRef(false);

  useEffect(() => {
    depsRef.current = deps;
  });

  /** Publishes the current applied settings, live values and status (the store keeps unchanged slices). */
  const publishState = useCallback((target: SessionStoreHandle) => {
    target.publish({
      applied: appliedRef.current ?? target.store.getSnapshot().applied,
      live: liveRef.current,
      status: statusRef.current,
    });
  }, []);

  useEffect(() => {
    if (!boot || blocked || !hub || !handle) {
      return undefined;
    }

    const current = depsRef.current;
    const now = current.now ?? (() => Date.now());
    const client = (current.createWorker ?? createSimWorker)();
    const { record: session } = boot;

    if (client === null) {
      const timer = setTimeout(() => setWorkerError(SIM_SESSION_COPY.noWorker), 0);

      return () => clearTimeout(timer);
    }

    const send = current.sendEvents ?? appendSimulationEvents;
    const outbox = current.outbox ?? eventOutbox;
    let disposed = false;
    const queue = createEventQueue<ClientSessionEvent>({
      send: (events) => send(session.id, events),
      ...(current.queueTimers ? { timers: current.queueTimers } : {}),
      // A refused event never reaches the server replay: the local run has diverged from it.
      onRejected: (error) => {
        setSyncError(SIM_SESSION_COPY.syncFailed(getSimulatorErrorMessage(error)));
        setDivergenceCause(divergenceCauseOf(error));
        setDiverged(true);
      },
      onChange: (events) => {
        // After the cleanup (a resync or unmount) this queue no longer owns the outbox.
        if (disposed) {
          return;
        }

        outbox.save(session.id, events);
        setPendingEvents(events.length);
      },
    });
    // Metrics and the clock reach React at most every UI_REFRESH_INTERVAL_MS; a status change shows at once.
    const throttle = createUiThrottle(() => publishState(handle), { intervalMs: UI_REFRESH_INTERVAL_MS, now });

    clientRef.current = client;
    queueRef.current = queue;
    liveRef.current = initialLiveState(boot.startAtSimTimeMs);
    appliedRef.current = initialSettingsOfBoot(boot);
    ackedRef.current = appliedRef.current;
    pendingRef.current = [];
    latestSimRef.current = boot.startAtSimTimeMs;
    statusRef.current = "starting";
    endingRef.current = false;

    const ackWaiters = ackWaitersRef.current;
    const releaseAckWaiters = (): void => {
      [...ackWaiters].forEach((release) => release());
    };
    const pausedWaiters = pausedWaitersRef.current;
    const releasePausedWaiters = (simTimeMs: number): void => {
      [...pausedWaiters].forEach((release) => release(simTimeMs));
    };

    const handleAcknowledgements = (batch: SimBatch): void => {
      const acked = ackedRef.current;

      if (acked === null || (batch.confirmedEvents.length === 0 && batch.rejectedEvents.length === 0)) {
        return;
      }

      const result = reconcileEvents(pendingRef.current, batch);

      // Enqueued only now, with the time the engine really applied the change.
      result.confirmed.forEach((event) => queue.enqueue(event));
      ackedRef.current = applyChanges(acked, result.confirmed.map((event) => event.payload));
      pendingRef.current = result.pending;

      if (batch.rejectedEvents.length > 0) {
        setChangeError(CHANGE_COPY.invalid);
      }

      if (result.rejectedIds.length > 0) {
        const rolledBack = applyChanges(ackedRef.current, result.pending);

        appliedRef.current = rolledBack;
        publishState(handle);
      }

      if (pendingRef.current.length === 0) {
        releaseAckWaiters();
      }
    };

    const handleBatch = (batch: SimBatch): void => {
      latestSimRef.current = batch.simTimeMs;
      hub.emit(batch);
      handleAcknowledgements(batch);

      const statusChanged = batch.status !== statusRef.current;

      statusRef.current = batch.status;

      if (batch.status === "paused") {
        releasePausedWaiters(batch.simTimeMs);
      }

      liveRef.current = ingestBatch(liveRef.current, batch);
      // A metrics snapshot inside the throttle window is shown at its end, even if no other batch arrives.
      throttle.request({ force: statusChanged, trailing: batch.metrics !== null });
    };

    // Unsent events of a reload go first, so a new event can never carry an earlier time than one in flight.
    boot.pendingEvents.forEach((event) => queue.enqueue(event));

    const startSimulation = (): void => {
      if (boot.pendingEvents.length === 0) {
        client.send({ type: "start" });

        return;
      }

      // Whatever the outcome, the events stay first in the queue; the simulation starts after this attempt.
      void queue.flush().catch(() => undefined).then(() => {
        if (!disposed && !endingRef.current) {
          client.send({ type: "start" });
        }
      });
    };

    const unsubscribe = client.subscribe((message) => {
      if (message.type === "ready") {
        // An end that went out before the worker booted (deadline already past) must not start the simulation.
        if (!endingRef.current) {
          startSimulation();
        }
      } else if (message.type === "batch") {
        handleBatch(message.batch);
      } else {
        setWorkerError(SIM_SESSION_COPY.workerFailed);
        // No acknowledgement will come from a failed worker: an end in progress must not wait for it.
        releaseAckWaiters();
        releasePausedWaiters(latestSimRef.current);
      }
    });

    client.send({
      type: "init",
      engineCase: session.engineCase,
      seed: session.seed,
      options: {
        engineOptions: { timeMultiplier: session.timeMultiplier },
        multiplier: session.timeMultiplier,
        initialEvents: boot.initialEvents,
        startAtSimTimeMs: boot.startAtSimTimeMs,
        initialBacklogMs: boot.initialBacklogMs,
      },
    });

    const flushBestEffort = (): void => {
      void queue.flush().catch(() => undefined);
    };
    // axios cannot outlive the page: a keepalive fetch carries the queue (idempotent ids; the outbox keeps a copy).
    const flushOnPageHide = (): void => {
      (current.sendKeepalive ?? sendSimulationEventsKeepalive)(session.id, queue.snapshot());
    };

    window.addEventListener("pagehide", flushOnPageHide);
    // A6: the page-hide flush cannot wait for a refresh, so the token is kept fresh while the session runs.
    const releaseFreshToken = keepAccessTokenFresh();

    return () => {
      disposed = true;
      window.removeEventListener("pagehide", flushOnPageHide);
      throttle.dispose();

      unsubscribe();
      releaseAckWaiters();
      releasePausedWaiters(latestSimRef.current);
      flushBestEffort();
      queue.dispose();
      client.terminate();
      clientRef.current = null;
      queueRef.current = null;
      releaseFreshToken();
    };
  }, [boot, blocked, hub, handle, publishState]);

  const confirm = useCallback((confirmation: ConsoleConfirmation) => {
    const client = clientRef.current;
    const queue = queueRef.current;
    const applied = appliedRef.current;

    if (!client || !queue || !applied || endingRef.current) {
      return;
    }

    const changes = toSettingsChanges(confirmation);

    if (Object.keys(changes).length === 0) {
      return;
    }

    const validation = validateSettingsChange(applied, changes);

    if (!validation.ok) {
      setChangeError(validation.message);

      return;
    }

    const id = (depsRef.current.createEventId ?? createClientEventId)();

    // No time: the worker applies it at its own simulated time and acknowledges that time with this id.
    client.send({ type: "applyEvent", event: { type: "PARAM_CHANGE", changes, id } });
    pendingRef.current = [...pendingRef.current, { id, changes }];

    const next = { ...applied, ...changes };

    appliedRef.current = next;
    setChangeError(null);

    if (handle) {
      publishState(handle);
    }
  }, [handle, publishState]);

  useEffect(() => {
    confirmRef.current = confirm;
  });

  const isFree = record?.mode === "FREE";
  const sessionMultiplier = record?.timeMultiplier ?? 1;
  const multiplierOptions = useMemo(
    () => (isFree ? TIME_MULTIPLIERS.filter((value) => value <= sessionMultiplier) : [sessionMultiplier]),
    [isFree, sessionMultiplier],
  );

  const pause = useCallback(() => {
    if (isFree) {
      clientRef.current?.send({ type: "pause" });
    }
  }, [isFree]);

  const resume = useCallback(() => {
    clientRef.current?.send({ type: "resume" });
  }, []);

  const setMultiplier = useCallback((multiplier: TimeMultiplier) => {
    if (!isFree || !multiplierOptions.includes(multiplier)) {
      return;
    }

    clientRef.current?.send({ type: "setMultiplier", multiplier });
    setMultiplierState({ boot, multiplier });
  }, [boot, isFree, multiplierOptions]);

  /**
   * End of a session whose worker never booted (no worker, blocked by the engine version, or still starting): nothing
   * is stepping, so the queued events (a reload's outbox) are flushed and /end goes out at the last known time.
   */
  const endBeforeBoot = useCallback(async(
    id: string,
    client: SimWorkerClient | null,
    queue: EventQueue<ClientSessionEvent> | null,
    options: EndSessionOptions,
  ): Promise<EndSessionOutcome> => {
    const endSession = depsRef.current.endSession ?? endSimulationSession;

    endingRef.current = true;
    setEnding(true);

    try {
      if (queue) {
        await (options.flushTimeoutMs === undefined
          ? queue.flush()
          : flushWithin(queue.flush(), options.flushTimeoutMs, depsRef.current.queueTimers));
      }

      await endSession(id, Math.max(latestSimRef.current, boot?.startAtSimTimeMs ?? 0));
      client?.send({ type: "stop" });
      (depsRef.current.store ?? sessionStore).forget(id);
      (depsRef.current.outbox ?? eventOutbox).clear(id);

      return { status: "ended" };
    } catch (error) {
      endingRef.current = false;

      return { status: "error", message: getSimulatorErrorMessage(error) };
    } finally {
      setEnding(false);
    }
  }, [boot]);

  const end = useCallback(async(options: EndSessionOptions = {}): Promise<EndSessionOutcome> => {
    const client = clientRef.current;
    const queue = queueRef.current;

    if (!sessionId || endingRef.current) {
      return { status: "busy" };
    }

    if (!client || !queue || statusRef.current === "starting") {
      return endBeforeBoot(sessionId, client, queue, options);
    }

    const wasRunning = statusRef.current === "running";
    const endSession = depsRef.current.endSession ?? endSimulationSession;

    const timers = depsRef.current.queueTimers;

    endingRef.current = true;
    setEnding(true);

    // The end time is the one of the first paused batch (the worker stops there), not a running batch before it.
    const pausedAt = statusRef.current === "paused"
      ? Promise.resolve(latestSimRef.current)
      : waitForPausedBatch(pausedWaitersRef.current, () => latestSimRef.current, timers);

    client.send({ type: "pause" });

    try {
      const simTimeMs = await pausedAt;

      // The pause flushes a batch with the outstanding acknowledgements; only acknowledged changes are sent.
      await waitForAcknowledgements(pendingRef.current.length, ackWaitersRef.current, timers);

      if (options.flushTimeoutMs === undefined) {
        await queue.flush();
      } else {
        await flushWithin(queue.flush(), options.flushTimeoutMs, timers);
      }

      await endSession(sessionId, simTimeMs);
      client.send({ type: "stop" });
      (depsRef.current.store ?? sessionStore).forget(sessionId);
      (depsRef.current.outbox ?? eventOutbox).clear(sessionId);

      return { status: "ended" };
    } catch (error) {
      endingRef.current = false;

      if (wasRunning) {
        client.send({ type: "resume" });
      }

      return { status: "error", message: getSimulatorErrorMessage(error) };
    } finally {
      setEnding(false);
    }
  }, [endBeforeBoot, sessionId]);

  const settle = useCallback(async(): Promise<void> => {
    const queue = queueRef.current;

    if (!queue) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, RESYNC_SETTLE_TIMEOUT_MS);
    });

    // The flush joins the send already in flight (sends are serialised) and its acknowledgements update the outbox.
    await Promise.race([queue.flush().catch(() => undefined), timeout]);
    clearTimeout(timer);
    // Settled or timed out: detach the queue (no timers, no more outbox writes). A send still in flight may land on
    // the server; its ids are idempotent and the new boot skips the ones /replay already stores.
    queue.dispose();
  }, []);

  const statusStore: ExternalStore<StatusSource> = handle?.store ?? NO_SESSION;
  // The hook re-renders only when the status or the applied settings change, never per batch.
  const status = useStoreSelector(statusStore, selectStatus);
  const applied = useStoreSelector(statusStore, selectApplied);
  const applicability = useMemo(() => (applied ? applicabilityFor(applied) : undefined), [applied]);
  const adapter = useMemo<ConsoleAdapterStore | null>(
    () => (handle && hub && !blocked ? mapStore(handle.store, selectConsole) : null),
    [blocked, handle, hub],
  );

  const store = handle?.store ?? null;
  const dismissChangeError = useCallback(() => setChangeError(null), []);

  // Memoised: hosts (e.g. the session host context) only change when one of these values changes.
  return useMemo<SimSessionView>(() => ({
    adapter,
    store,
    applicability,
    status,
    multiplier,
    multiplierOptions,
    changeError,
    dismissChangeError,
    syncError,
    diverged,
    divergenceCause,
    settle,
    pendingEvents,
    workerError,
    ending,
    pause,
    resume,
    setMultiplier,
    end,
  }), [
    adapter, store, applicability, status, multiplier, multiplierOptions, changeError, dismissChangeError, syncError, diverged,
    divergenceCause, settle, pendingEvents, workerError, ending, pause, resume, setMultiplier, end,
  ]);
}

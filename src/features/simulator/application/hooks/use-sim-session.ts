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
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSimWorker, DEFAULT_SAMPLE_RATE_HZ } from "@shared/sim-engine";
import type { EngineMetrics, SimBatch, SimLoopStatus, SimWorkerClient, VentilatorSettings } from "@shared/sim-engine";
import type {
  ConsoleAlarm,
  ConsoleConfirmation,
  ConsoleFrameListener,
  ConsoleFrameSource,
  ModeParameterTable,
  VentilatorConsoleAdapter,
} from "@shared/ventilator-console";
import { appendSimulationEvents, endSimulationSession } from "../../api/services/simulation-sessions.service";
import { UI_REFRESH_INTERVAL_MS } from "../config/sim-console.config";
import { TIME_MULTIPLIERS } from "../config/simulator.config";
import type { TimeMultiplier } from "../config/simulator.config";
import type { ClientSessionEvent, SessionBoot } from "../entities/sim-session.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import { createEventQueue } from "../session/event-queue";
import type { EventQueue, QueueTimers } from "../session/event-queue";
import {
  appendTrends,
  applicabilityFor,
  applyChanges,
  buildConsoleLimits,
  buildObjectives,
  CHANGE_COPY,
  initialSettingsOf,
  MODE_OPTIONS,
  rangesFromTargets,
  toConsoleAlarms,
  toConsoleMetrics,
  toConsoleSamples,
  toConsoleSettings,
  toPatientValues,
  toSettingsChanges,
  validateSettingsChange,
} from "../session/sim-console-adapter";
import type { ObjectiveRow, PatientTrends } from "../session/sim-console-adapter";
import { sessionStore } from "../session/session-store";
import type { SessionStore } from "../session/session-store";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const SIM_SESSION_COPY = {
  noWorker: "Este navegador no puede ejecutar la simulación (sin soporte de Web Workers). Usa un navegador actualizado.",
  workerFailed: "La simulación se detuvo por un error interno. Recarga la página para reanudar la sesión.",
  syncFailed: (detail: string) => `Algunos cambios no se guardaron en el servidor: ${detail}`,
} as const;

export type SimSessionStatus = SimLoopStatus | "starting";

export type SimSessionDeps = {
  createWorker?: () => SimWorkerClient | null
  sendEvents?: (sessionId: string, events: readonly ClientSessionEvent[]) => Promise<unknown>
  endSession?: (sessionId: string, simTimeMs: number) => Promise<void>
  createEventId?: () => string
  queueTimers?: QueueTimers
  /** Wall clock for the UI refresh throttle. */
  now?: () => number
  store?: SessionStore
};

export type EndSessionOutcome = { status: "ended" } | { status: "error", message: string } | { status: "busy" };

export type SimSessionView = {
  adapter: VentilatorConsoleAdapter | null
  applicability: ModeParameterTable | undefined
  status: SimSessionStatus
  simTimeMs: number
  multiplier: TimeMultiplier
  /** Playback multipliers the session allows (up to the session multiplier). */
  multiplierOptions: readonly TimeMultiplier[]
  objectives: readonly ObjectiveRow[]
  changeError: string | null
  dismissChangeError: () => void
  syncError: string | null
  workerError: string | null
  ending: boolean
  pause: () => void
  resume: () => void
  setMultiplier: (multiplier: TimeMultiplier) => void
  end: () => Promise<EndSessionOutcome>
};

export type UseSimSessionOptions = {
  boot: SessionBoot | null
  /** EXAM with a mismatched engine version: the worker is never created. */
  blocked: boolean
  deps?: SimSessionDeps | undefined
};

type FrameHub = { source: ConsoleFrameSource, emit: (batch: SimBatch) => void };

function createFrameHub(sourceId: string): FrameHub {
  const listeners = new Set<ConsoleFrameListener>();

  return {
    source: {
      sourceId,
      sampleRateHz: DEFAULT_SAMPLE_RATE_HZ,
      subscribe(listener) {
        listeners.add(listener);

        return () => {
          listeners.delete(listener);
        };
      },
    },
    emit(batch) {
      if (batch.samples.length > 0 && listeners.size > 0) {
        const samples = toConsoleSamples(batch.samples);

        listeners.forEach((listener) => listener({ samples }));
      }
    },
  };
}

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

type LiveState = {
  metrics: EngineMetrics | null
  alarms: readonly ConsoleAlarm[]
  trends: PatientTrends
  simTimeMs: number
  status: SimSessionStatus
};

type SessionRuntime = {
  boot: SessionBoot | null
  applied: VentilatorSettings | null
  multiplier: TimeMultiplier
  live: LiveState
};

function runtimeFor(boot: SessionBoot | null): SessionRuntime {
  return {
    boot,
    applied: boot ? applyChanges(initialSettingsOf(boot.record.engineCase), boot.initialEvents) : null,
    multiplier: boot?.record.timeMultiplier ?? 1,
    live: { metrics: null, alarms: [], trends: {}, simTimeMs: boot?.startAtSimTimeMs ?? 0, status: "starting" },
  };
}

export function useSimSession({ boot, blocked, deps = {} }: UseSimSessionOptions): SimSessionView {
  const [runtime, setRuntime] = useState<SessionRuntime>(() => runtimeFor(boot));
  const [changeError, setChangeError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  // A new session resets the runtime during render (no effect round trip).
  if (runtime.boot !== boot) {
    setRuntime(runtimeFor(boot));
  }

  const record = boot?.record ?? null;
  const sessionId = record?.id ?? null;
  const hub = useMemo(() => (sessionId ? createFrameHub(sessionId) : null), [sessionId]);

  const depsRef = useRef(deps);
  const clientRef = useRef<SimWorkerClient | null>(null);
  const queueRef = useRef<EventQueue<ClientSessionEvent> | null>(null);
  const appliedRef = useRef<VentilatorSettings | null>(null);
  const latestSimRef = useRef(0);
  const statusRef = useRef<SimSessionStatus>("starting");
  const endingRef = useRef(false);

  useEffect(() => {
    depsRef.current = deps;
  });

  useEffect(() => {
    if (!boot || blocked || !hub) {
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
    const queue = createEventQueue<ClientSessionEvent>({
      send: (events) => send(session.id, events),
      ...(current.queueTimers ? { timers: current.queueTimers } : {}),
      onRejected: (error) => setSyncError(SIM_SESSION_COPY.syncFailed(getSimulatorErrorMessage(error))),
    });
    let metrics: EngineMetrics | null = null;
    let alarms: readonly ConsoleAlarm[] = [];
    let trends: PatientTrends = {};
    let lastUiMs = Number.NEGATIVE_INFINITY;

    clientRef.current = client;
    queueRef.current = queue;
    appliedRef.current = applyChanges(initialSettingsOf(session.engineCase), boot.initialEvents);
    latestSimRef.current = boot.startAtSimTimeMs;
    statusRef.current = "starting";
    endingRef.current = false;

    const handleBatch = (batch: SimBatch): void => {
      latestSimRef.current = batch.simTimeMs;
      hub.emit(batch);

      if (batch.rejectedEvents.length > 0) {
        setChangeError(CHANGE_COPY.invalid);
      }

      const statusChanged = batch.status !== statusRef.current;

      statusRef.current = batch.status;

      if (batch.metrics) {
        metrics = batch.metrics;
        alarms = toConsoleAlarms(batch.alarms, batch.simTimeMs, alarms);
        trends = appendTrends(trends, toPatientValues(batch.metrics));
      }

      const wallMs = now();

      if (batch.metrics || statusChanged || wallMs - lastUiMs >= UI_REFRESH_INTERVAL_MS) {
        lastUiMs = wallMs;

        const live: LiveState = { metrics, alarms, trends, simTimeMs: batch.simTimeMs, status: batch.status };

        setRuntime((previous) => (previous.boot === boot ? { ...previous, live } : previous));
      }
    };

    const unsubscribe = client.subscribe((message) => {
      if (message.type === "ready") {
        client.send({ type: "start" });
      } else if (message.type === "batch") {
        handleBatch(message.batch);
      } else {
        setWorkerError(SIM_SESSION_COPY.workerFailed);
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
      },
    });

    const flushBestEffort = (): void => {
      void queue.flush().catch(() => undefined);
    };

    window.addEventListener("pagehide", flushBestEffort);
    window.addEventListener("beforeunload", flushBestEffort);

    return () => {
      window.removeEventListener("pagehide", flushBestEffort);
      window.removeEventListener("beforeunload", flushBestEffort);
      unsubscribe();
      flushBestEffort();
      queue.dispose();
      client.terminate();
      clientRef.current = null;
      queueRef.current = null;
    };
  }, [boot, blocked, hub]);

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

    const simTimeMs = latestSimRef.current;
    const createId = depsRef.current.createEventId ?? createClientEventId;

    client.send({ type: "applyEvent", event: { type: "PARAM_CHANGE", changes, simTimeMs } });
    queue.enqueue({ id: createId(), simTimeMs, type: "PARAM_CHANGE", payload: { changes } });

    const next = { ...applied, ...changes };

    appliedRef.current = next;
    setChangeError(null);
    setRuntime((previous) => (previous.boot === boot ? { ...previous, applied: next } : previous));
  }, [boot]);

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
    setRuntime((previous) => (previous.boot === boot ? { ...previous, multiplier } : previous));
  }, [boot, isFree, multiplierOptions]);

  const end = useCallback(async(): Promise<EndSessionOutcome> => {
    const client = clientRef.current;
    const queue = queueRef.current;

    if (!sessionId || !client || !queue || endingRef.current) {
      return { status: "busy" };
    }

    const wasRunning = statusRef.current === "running";
    const endSession = depsRef.current.endSession ?? endSimulationSession;

    endingRef.current = true;
    setEnding(true);
    client.send({ type: "pause" });

    try {
      await queue.flush();
      await endSession(sessionId, latestSimRef.current);
      client.send({ type: "stop" });
      (depsRef.current.store ?? sessionStore).forget(sessionId);

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
  }, [sessionId]);

  const { applied, live, multiplier } = runtime;

  const adapter = useMemo<VentilatorConsoleAdapter | null>(() => {
    if (!record || !hub || !applied || blocked) {
      return null;
    }

    const values = toConsoleSettings(applied);
    const canControl = live.status === "running" || live.status === "paused";

    return {
      frames: hub.source,
      settings: { current: values, applied: values },
      mode: { current: applied.mode, options: MODE_OPTIONS },
      metrics: toConsoleMetrics(live.metrics, applied),
      patient: { values: toPatientValues(live.metrics), trends: live.trends },
      alarms: live.alarms,
      permissions: { canControl },
      limits: buildConsoleLimits(applied),
      onConfirm: confirm,
      ranges: rangesFromTargets(record.engineCase.targets),
      // The engine has no hold maneuvers and alarm thresholds are fixed per case (no runtime limits panel).
      capabilities: { maneuvers: false },
    };
  }, [applied, blocked, confirm, hub, live, record]);

  const objectives = useMemo(
    () => (record ? buildObjectives(record.engineCase.targets, live.metrics?.targets ?? null) : []),
    [live.metrics, record],
  );

  return {
    adapter,
    applicability: applied ? applicabilityFor(applied) : undefined,
    status: live.status,
    simTimeMs: live.simTimeMs,
    multiplier,
    multiplierOptions,
    objectives,
    changeError,
    dismissChangeError: () => setChangeError(null),
    syncError,
    workerError,
    ending,
    pause,
    resume,
    setMultiplier,
    end,
  };
}

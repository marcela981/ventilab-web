/*
* Funcionalidad: useReplaySession
* Descripción: Plays a recorded simulation session in the browser (T8) and exposes it as a read-only ventilator
*   console adapter. A simulation Web Worker (created inside an effect) runs the sim loop in replay mode: it is
*   initialised with the session case, seed and slow-dynamics multiplier, the recorded PARAM_CHANGE events as the
*   scheduled events, the local playback speed (×1 to ×8, no backend cap: nothing is sent) and the playback end, and it
*   produces frames, metrics and alarms over time. Play/pause and the speed are worker commands; at the end the loop
*   pauses and "play" restarts from 0. A seek re-initialises the worker at the target time (the loop fast-forwards
*   deterministically from seed + events up to it); scrubbing is debounced and batches of a superseded init are
*   ignored. Each init gets a new seek generation and a frame source with sourceId = sessionId + ':replay:' +
*   generation, so the console curves restart. The adapter has canControl=false and a no-op onConfirm: no control
*   emits and no event ever reaches the backend. Dependencies (worker factory, timers, clock) are injectable for
*   tests. Depends on React, the sim-engine and ventilator-console public APIs, the console mapping and the configs.
*   v1.1: the seek generation is kept in a ref across source changes (a new source never reuses a frame source id)
*   and every init, the first one included, publishes a fresh "starting" playback.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSimWorker, DEFAULT_SAMPLE_RATE_HZ } from "@shared/sim-engine";
import type { EngineCase, EngineMetrics, ParamChangeEvent, SimBatch, SimWorkerClient } from "@shared/sim-engine";
import type { ConsoleAlarm, ConsoleFrameListener, ConsoleFrameSource, VentilatorConsoleAdapter } from "@shared/ventilator-console";
import { UI_REFRESH_INTERVAL_MS } from "../config/sim-console.config";
import { DEFAULT_REPLAY_SPEED, REPLAY_SEEK_DEBOUNCE_MS } from "../config/sim-result.config";
import type { ReplaySpeed } from "../config/sim-result.config";
import { clampSeek } from "../entities/sim-replay.entity";
import type { QueueTimers } from "../session/event-queue";
import {
  appendTrends,
  applyChanges,
  buildConsoleLimits,
  initialSettingsOf,
  MODE_OPTIONS,
  rangesFromTargets,
  toConsoleAlarms,
  toConsoleMetrics,
  toConsoleSamples,
  toConsoleSettings,
  toPatientValues,
} from "../session/sim-console-adapter";
import type { PatientTrends } from "../session/sim-console-adapter";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const REPLAY_SESSION_COPY = {
  noWorker: "Este navegador no puede reproducir la sesión (sin soporte de Web Workers). Usa un navegador actualizado.",
  workerFailed: "La repetición se detuvo por un error interno. Recarga la página.",
} as const;

export type ReplayPlaybackStatus = "starting" | "playing" | "paused" | "ended";

export type ReplaySource = {
  sessionId: string
  engineCase: EngineCase
  seed: number
  timeMultiplier: 1 | 2 | 4
  events: readonly ParamChangeEvent[]
  durationMs: number
};

export type ReplaySessionDeps = {
  createWorker?: (() => SimWorkerClient | null) | undefined
  timers?: QueueTimers | undefined
  now?: (() => number) | undefined
};

export type ReplaySessionView = {
  adapter: VentilatorConsoleAdapter | null
  status: ReplayPlaybackStatus
  /** Simulated time shown: the pending scrub target while scrubbing, otherwise the playback time. */
  simTimeMs: number
  speed: ReplaySpeed
  seekGeneration: number
  workerError: string | null
  play: () => void
  pause: () => void
  setSpeed: (speed: ReplaySpeed) => void
  /** Debounced seek (time bar scrubbing). */
  seek: (simTimeMs: number) => void
  /** Immediate seek (event marks). */
  seekNow: (simTimeMs: number) => void
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

export function replaySourceId(sessionId: string, generation: number): string {
  return `${sessionId}:replay:${generation}`;
}

type Playback = {
  generation: number
  hub: FrameHub
  status: ReplayPlaybackStatus
  simTimeMs: number
  metrics: EngineMetrics | null
  alarms: readonly ConsoleAlarm[]
  trends: PatientTrends
};

const defaultTimers: QueueTimers = {
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

const noop = (): void => undefined;

function freshPlayback(sessionId: string, generation: number, simTimeMs: number): Playback {
  return {
    generation,
    hub: createFrameHub(replaySourceId(sessionId, generation)),
    status: "starting",
    simTimeMs,
    metrics: null,
    alarms: [],
    trends: {},
  };
}

export function useReplaySession(source: ReplaySource | null, deps: ReplaySessionDeps = {}): ReplaySessionView {
  const sessionId = source?.sessionId ?? "";
  const [playback, setPlayback] = useState<Playback>(() => freshPlayback(sessionId, 0, 0));
  const [speed, setSpeedState] = useState<ReplaySpeed>(DEFAULT_REPLAY_SPEED);
  const [scrubMs, setScrubMs] = useState<number | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);

  const depsRef = useRef(deps);
  const clientRef = useRef<SimWorkerClient | null>(null);
  const initRef = useRef<(simTimeMs: number) => void>(noop);
  const playingRef = useRef(true);
  const speedRef = useRef<ReplaySpeed>(DEFAULT_REPLAY_SPEED);
  const statusRef = useRef<ReplayPlaybackStatus>("starting");
  const debounceRef = useRef<unknown>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    depsRef.current = deps;
  });

  useEffect(() => {
    if (!source) {
      return undefined;
    }

    const current = depsRef.current;
    const now = current.now ?? (() => Date.now());
    const client = (current.createWorker ?? createSimWorker)();

    if (client === null) {
      const timer = setTimeout(() => setWorkerError(REPLAY_SESSION_COPY.noWorker), 0);

      return () => clearTimeout(timer);
    }

    // The generation lives in a ref, so a new source (or a StrictMode re-run) never reuses a frame source id: the
    // console curves and the playback state of a previous run can never show for the new one.
    let generation = generationRef.current;
    let hub = createFrameHub(replaySourceId(source.sessionId, generation));
    // Inits sent and not answered yet: batches of a superseded loop are ignored until the last ready.
    let pendingInits = 0;
    let metrics: EngineMetrics | null = null;
    let alarms: readonly ConsoleAlarm[] = [];
    let trends: PatientTrends = {};
    let simTimeMs = 0;
    let lastUiMs = Number.NEGATIVE_INFINITY;

    const statusOf = (batch: SimBatch): ReplayPlaybackStatus => {
      if (batch.status === "running") {
        return "playing";
      }

      return batch.simTimeMs >= source.durationMs ? "ended" : "paused";
    };

    const publish = (status: ReplayPlaybackStatus): void => {
      const snapshot: Playback = { generation, hub, status, simTimeMs, metrics, alarms, trends };

      setPlayback(snapshot);
    };

    const init = (startAtSimTimeMs: number): void => {
      generation += 1;
      generationRef.current = generation;
      pendingInits += 1;
      hub = createFrameHub(replaySourceId(source.sessionId, generation));
      metrics = null;
      alarms = [];
      trends = {};
      simTimeMs = startAtSimTimeMs;
      statusRef.current = "starting";
      // Every init (including the first one of a new source) publishes a fresh "starting" playback at its time.
      publish("starting");

      client.send({
        type: "init",
        engineCase: source.engineCase,
        seed: source.seed,
        options: {
          engineOptions: { timeMultiplier: source.timeMultiplier },
          multiplier: 1,
          playbackRate: speedRef.current,
          initialEvents: source.events,
          startAtSimTimeMs,
          endAtSimTimeMs: source.durationMs,
        },
      });
    };

    const handleBatch = (batch: SimBatch): void => {
      if (pendingInits > 0) {
        return;
      }

      hub.emit(batch);
      simTimeMs = batch.simTimeMs;

      if (batch.metrics) {
        metrics = batch.metrics;
        alarms = toConsoleAlarms(batch.alarms, batch.simTimeMs, alarms);
        trends = appendTrends(trends, toPatientValues(batch.metrics));
      }

      const status = statusOf(batch);
      const changed = status !== statusRef.current;
      const wallMs = now();

      statusRef.current = status;

      if (status === "ended") {
        playingRef.current = false;
      }

      if (changed || batch.metrics || wallMs - lastUiMs >= UI_REFRESH_INTERVAL_MS) {
        lastUiMs = wallMs;
        publish(status);
      }
    };

    const unsubscribe = client.subscribe((message) => {
      if (message.type === "ready") {
        pendingInits = Math.max(0, pendingInits - 1);

        if (pendingInits === 0) {
          client.send({ type: "start" });

          // A paused replay still shows the state at its time: the pause posts a batch with fresh metrics.
          if (!playingRef.current) {
            client.send({ type: "pause" });
          }
        }
      } else if (message.type === "batch") {
        handleBatch(message.batch);
      } else if (message.type === "error" && message.requestId === undefined) {
        setWorkerError(REPLAY_SESSION_COPY.workerFailed);
      }
    });

    clientRef.current = client;
    initRef.current = init;
    init(0);

    return () => {
      unsubscribe();
      client.terminate();
      clientRef.current = null;
      initRef.current = noop;
    };
  }, [source]);

  useEffect(() => () => {
    if (debounceRef.current !== null) {
      (depsRef.current.timers ?? defaultTimers).clearTimeout(debounceRef.current);
    }
  }, []);

  const play = useCallback(() => {
    playingRef.current = true;

    if (statusRef.current === "ended") {
      initRef.current(0);

      return;
    }

    clientRef.current?.send({ type: "resume" });
  }, []);

  const pause = useCallback(() => {
    playingRef.current = false;
    clientRef.current?.send({ type: "pause" });
  }, []);

  const setSpeed = useCallback((next: ReplaySpeed) => {
    speedRef.current = next;
    setSpeedState(next);
    clientRef.current?.send({ type: "setPlaybackRate", rate: next });
  }, []);

  const durationMs = source?.durationMs ?? 0;

  const seekNow = useCallback((simTimeMs: number) => {
    const timers = depsRef.current.timers ?? defaultTimers;

    if (debounceRef.current !== null) {
      timers.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setScrubMs(null);
    initRef.current(clampSeek(simTimeMs, durationMs));
  }, [durationMs]);

  const seek = useCallback((simTimeMs: number) => {
    const timers = depsRef.current.timers ?? defaultTimers;
    const target = clampSeek(simTimeMs, durationMs);

    setScrubMs(target);

    if (debounceRef.current !== null) {
      timers.clearTimeout(debounceRef.current);
    }

    debounceRef.current = timers.setTimeout(() => {
      debounceRef.current = null;
      setScrubMs(null);
      initRef.current(target);
    }, REPLAY_SEEK_DEBOUNCE_MS);
  }, [durationMs]);

  const adapter = useMemo<VentilatorConsoleAdapter | null>(() => {
    if (!source) {
      return null;
    }

    const applied = applyChanges(
      initialSettingsOf(source.engineCase),
      source.events.filter((event) => event.simTimeMs <= playback.simTimeMs),
    );
    const values = toConsoleSettings(applied);

    return {
      frames: playback.hub.source,
      settings: { current: values, applied: values },
      mode: { current: applied.mode, options: MODE_OPTIONS },
      metrics: toConsoleMetrics(playback.metrics, applied),
      patient: { values: toPatientValues(playback.metrics), trends: playback.trends },
      alarms: playback.alarms,
      // Read-only: a replay shows what happened; nothing can be changed or sent.
      permissions: { canControl: false },
      limits: buildConsoleLimits(applied),
      onConfirm: noop,
      ranges: rangesFromTargets(source.engineCase.targets),
      capabilities: { maneuvers: false },
    };
  }, [playback, source]);

  return {
    adapter,
    status: playback.status,
    simTimeMs: scrubMs ?? playback.simTimeMs,
    speed,
    seekGeneration: playback.generation,
    workerError,
    play,
    pause,
    setSpeed,
    seek,
    seekNow,
  };
}

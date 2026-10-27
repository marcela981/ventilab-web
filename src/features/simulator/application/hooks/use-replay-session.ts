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
*   v1.2 (W2, Bloque 1): the playback state lives in an external store (one per source) instead of React state:
*   `adapter` is a stable `ConsoleAdapterStore` whose unchanged slices keep their identity, and the metrics snapshots
*   are throttled like the live session (at most one publish per UI_REFRESH_INTERVAL_MS; a status change or an init
*   at once; a metrics snapshot inside the window at its end) instead of one React commit per snapshot. The hook only
*   re-renders when the shown time, the status or the seek generation change.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSimWorker, DEFAULT_SAMPLE_RATE_HZ } from "@shared/sim-engine";
import type { EngineCase, ParamChangeEvent, SimBatch, SimWorkerClient } from "@shared/sim-engine";
import { createExternalStore, createUiThrottle, mapStore, reuseUnchangedSlices, useStoreSelector } from "@shared/ventilator-console";
import type {
  ConsoleAdapterStore,
  ConsoleFrameListener,
  ConsoleFrameSource,
  VentilatorConsoleAdapter,
  WritableStore,
} from "@shared/ventilator-console";
import { UI_REFRESH_INTERVAL_MS } from "../config/sim-console.config";
import { DEFAULT_REPLAY_SPEED, REPLAY_SEEK_DEBOUNCE_MS } from "../config/sim-result.config";
import type { ReplaySpeed } from "../config/sim-result.config";
import { clampSeek } from "../entities/sim-replay.entity";
import type { QueueTimers } from "../session/event-queue";
import { applyChanges, initialSettingsOf, toConsoleSamples } from "../session/sim-console-adapter";
import { buildSimConsoleAdapter, ingestBatch, initialLiveState } from "../session/sim-live-state";
import type { SimLiveState } from "../session/sim-live-state";

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
  /** Stable per source; the console reads each slice from it. */
  adapter: ConsoleAdapterStore | null
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
  live: SimLiveState
};

/** What the replay publishes (at most every UI_REFRESH_INTERVAL_MS; a status change or an init at once). */
type ReplaySnapshot = {
  generation: number
  status: ReplayPlaybackStatus
  simTimeMs: number
  console: VentilatorConsoleAdapter
};

const defaultTimers: QueueTimers = {
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

const noop = (): void => undefined;

function freshPlayback(sessionId: string, generation: number, simTimeMs: number): Playback {
  return { generation, hub: createFrameHub(replaySourceId(sessionId, generation)), status: "starting", live: initialLiveState(simTimeMs) };
}

/** The next snapshot of a playback; unchanged console slices (and an identical snapshot) keep their identity. */
function replaySnapshotOf(previous: ReplaySnapshot | null, playback: Playback, source: ReplaySource): ReplaySnapshot {
  const applied = applyChanges(
    initialSettingsOf(source.engineCase),
    source.events.filter((event) => event.simTimeMs <= playback.live.simTimeMs),
  );
  const console = reuseUnchangedSlices(previous?.console ?? null, buildSimConsoleAdapter({
    frames: playback.hub.source,
    applied,
    live: playback.live,
    // Read-only: a replay shows what happened; nothing can be changed or sent.
    canControl: false,
    onConfirm: noop,
    targets: source.engineCase.targets,
  }));

  if (
    previous !== null
    && previous.console === console
    && previous.generation === playback.generation
    && previous.status === playback.status
    && previous.simTimeMs === playback.live.simTimeMs
  ) {
    return previous;
  }

  return { generation: playback.generation, status: playback.status, simTimeMs: playback.live.simTimeMs, console };
}

type ReplayStore = WritableStore<ReplaySnapshot>;

const NO_REPLAY = createExternalStore<ReplaySnapshot | null>(null);
const selectStatus = (snapshot: ReplaySnapshot | null): ReplayPlaybackStatus => snapshot?.status ?? "starting";
const selectSimTimeMs = (snapshot: ReplaySnapshot | null): number => snapshot?.simTimeMs ?? 0;
const selectGeneration = (snapshot: ReplaySnapshot | null): number => snapshot?.generation ?? 0;
const selectConsole = (snapshot: ReplaySnapshot): VentilatorConsoleAdapter => snapshot.console;

export function useReplaySession(source: ReplaySource | null, deps: ReplaySessionDeps = {}): ReplaySessionView {
  // One store per source; it starts from a fresh "starting" playback (the effect then publishes every init).
  const store = useMemo<ReplayStore | null>(
    () => (source ? createExternalStore(replaySnapshotOf(null, freshPlayback(source.sessionId, 0, 0), source)) : null),
    [source],
  );
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
    if (!source || !store) {
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
    let live = initialLiveState(0);
    let status: ReplayPlaybackStatus = "starting";
    const publish = (): void => {
      store.set(replaySnapshotOf(store.getSnapshot(), { generation, hub, status, live }, source));
    };
    // Metrics and the clock reach React at most every UI_REFRESH_INTERVAL_MS (×8 included); a status change at once.
    const throttle = createUiThrottle(publish, { intervalMs: UI_REFRESH_INTERVAL_MS, now });

    const statusOf = (batch: SimBatch): ReplayPlaybackStatus => {
      if (batch.status === "running") {
        return "playing";
      }

      return batch.simTimeMs >= source.durationMs ? "ended" : "paused";
    };

    const init = (startAtSimTimeMs: number): void => {
      generation += 1;
      generationRef.current = generation;
      pendingInits += 1;
      hub = createFrameHub(replaySourceId(source.sessionId, generation));
      live = initialLiveState(startAtSimTimeMs);
      status = "starting";
      statusRef.current = "starting";
      // Every init (including the first one of a new source) publishes a fresh "starting" playback at its time.
      throttle.request({ force: true });

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
      live = ingestBatch(live, batch);
      status = statusOf(batch);

      const changed = status !== statusRef.current;

      statusRef.current = status;

      if (status === "ended") {
        playingRef.current = false;
      }

      // A metrics snapshot inside the window shows at its end (it used to commit at once: ~8 commits/s at ×8).
      throttle.request({ force: changed, trailing: batch.metrics !== null });
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
      throttle.dispose();
      unsubscribe();
      client.terminate();
      clientRef.current = null;
      initRef.current = noop;
    };
  }, [source, store]);

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

  const readStore = store ?? NO_REPLAY;
  const status = useStoreSelector(readStore, selectStatus);
  const playbackMs = useStoreSelector(readStore, selectSimTimeMs);
  const seekGeneration = useStoreSelector(readStore, selectGeneration);
  const adapter = useMemo<ConsoleAdapterStore | null>(() => (store ? mapStore(store, selectConsole) : null), [store]);

  return {
    adapter,
    status,
    simTimeMs: scrubMs ?? playbackMs,
    speed,
    seekGeneration,
    workerError,
    play,
    pause,
    setSpeed,
    seek,
    seekNow,
  };
}

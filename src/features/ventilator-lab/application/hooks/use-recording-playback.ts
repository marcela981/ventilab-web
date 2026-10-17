/*
* Funcionalidad: useRecordingPlayback
* Descripción: Playback of a stored telemetry recording in the shared console, read-only. useRecordingPlayback drives the pure playback engine: a ticker (every tickMs while playing) computes
*   the position from the wall clock and the speed and hands the newly reached samples to the console frame listener
*   synchronously (curve ring by reference: no React render per frame) and to the T5 breath detector; React state
*   (position, derived metrics, SpO2 / PCO2 carried at the position) is committed at most every commitMs (and at once
*   on play / pause / speed / seek). Each generation of the engine (a seek, or play again from the end) gets a new frame
*   source (sourceId = reservationId + ':recording:' + generation) so the console curves restart, as the simulator
*   replay does, and a new breath detector; the source replays to a (late) subscriber the samples of its last
*   PREROLL_MS, and a seek starts PREROLL_MS before the target so the curves and the metrics are not empty. The adapter
*   is the real console adapter with `canControl: false`, a no-op confirm, no settings / mode / alarms (the recorded
*   frames carry none) and the patient monitor only when the recording reports SpO2 or PCO2. Depends on React, the
*   console contract types, the breath detection, the recording index, the playback engine and the real console
*   adapter. v1.1 (T11 review fix): the chunked indexing moved to useRecording (use-recordings, which keeps no raw
*   frames); inside a recording gap (`gapAt` of the index) the console frame status is "no-data" with
*   PLAYBACK_GAP_MESSAGE (grey frozen curves, nothing compressed) and `inGap` is returned (S1); the default clock is
*   performance.now, monotonic and immune to wall-clock adjustments (S2).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConsoleFrameListener, ConsoleFrameSource, ConsoleSample, VentilatorConsoleAdapter } from "@shared/ventilator-console";
import { computeBreathMetrics, createBreathDetector, EMPTY_BREATH_METRICS } from "../entities/breath-detection";
import type { BreathMetrics } from "../entities/breath-detection";
import {
  createPlayback,
  pausePlayback,
  playbackEnded,
  playbackPosition,
  playPlayback,
  seekPlayback,
  setPlaybackSpeed,
} from "../entities/playback-engine";
import type { PlaybackSpeed, PlaybackState } from "../entities/playback-engine";
import { buildRealConsoleAdapter } from "../entities/real-console-adapter";
import { carriedValue, gapAt, indexAtOrBefore } from "../entities/recording-index";
import type { RecordingIndex } from "../entities/recording-index";
import { EMPTY_REPORTED_STATE } from "../entities/reported-settings";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const PLAYBACK_READ_ONLY_REASON = "Reproducción de una grabación: solo lectura.";
export const PLAYBACK_GAP_MESSAGE = "Sin datos grabados en este intervalo (la grabación se detuvo o el equipo no envió datos).";

/** Playback time before a seek target fed to the curves and the breath detector (also replayed to a late subscriber). */
export const PREROLL_MS = 10_000;
export const PLAYBACK_TICK_MS = 50;
export const PLAYBACK_COMMIT_MS = 250;

/** One frame source generation: the console source, its breath detector and the last delivered frame. */
type Player = {
  generation: number
  source: ConsoleFrameSource
  /** Delivers the frames up to `positionMs` not delivered yet. */
  advance: (positionMs: number) => void
  metrics: () => BreathMetrics
  lastIndex: () => number
};

export function recordingSourceId(reservationId: string, generation: number): string {
  return `${reservationId}:recording:${generation}`;
}

function createPlayer(index: RecordingIndex, generation: number, startMs: number): Player {
  const listeners = new Set<ConsoleFrameListener>();
  const detector = createBreathDetector();
  let history: ConsoleSample[] = [];
  let lastIndex = indexAtOrBefore(index.times, startMs - PREROLL_MS);

  const deliver = (from: number, to: number) => {
    if (to < from) {
      return;
    }

    const samples = index.samples.slice(from, to + 1);
    const newest = samples[samples.length - 1]?.tMs ?? 0;

    history = history.concat(samples).filter((sample) => sample.tMs >= newest - PREROLL_MS);
    detector.push(samples);
    listeners.forEach((listener) => listener({ samples }));
  };

  const player: Player = {
    generation,
    source: {
      sourceId: recordingSourceId(index.reservationId, generation),
      subscribe(listener) {
        if (history.length > 0) {
          listener({ samples: history });
        }

        listeners.add(listener);

        return () => {
          listeners.delete(listener);
        };
      },
    },
    advance(positionMs) {
      const target = indexAtOrBefore(index.times, positionMs);

      if (target > lastIndex) {
        const from = lastIndex + 1;

        lastIndex = target;
        deliver(from, target);
      }
    },
    metrics: () => computeBreathMetrics(detector.breaths(), detector.latestMs()),
    lastIndex: () => lastIndex,
  };

  player.advance(startMs);

  return player;
}

type Snapshot = { positionMs: number, metrics: BreathMetrics };

const monotonicNow = (): number => performance.now();

export type UseRecordingPlaybackOptions = {
  tickMs?: number
  commitMs?: number
  /** Monotonic clock (default performance.now; injectable for tests). */
  now?: () => number
};

export type RecordingPlayback = {
  adapter: VentilatorConsoleAdapter
  positionMs: number
  durationMs: number
  playing: boolean
  speed: PlaybackSpeed
  generation: number
  /** The position is inside a recording gap (no recorded frames). */
  inGap: boolean
  play: () => void
  pause: () => void
  setSpeed: (speed: PlaybackSpeed) => void
  seek: (positionMs: number) => void
};

export function useRecordingPlayback(
  index: RecordingIndex,
  { tickMs = PLAYBACK_TICK_MS, commitMs = PLAYBACK_COMMIT_MS, now = monotonicNow }: UseRecordingPlaybackOptions = {},
): RecordingPlayback {
  const [engine, setEngine] = useState<PlaybackState>(() => createPlayback(index.durationMs));
  const [player, setPlayer] = useState<Player>(() => createPlayer(index, 0, 0));
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ positionMs: 0, metrics: EMPTY_BREATH_METRICS }));
  const engineRef = useRef(engine);
  const playerRef = useRef(player);
  const nowRef = useRef(now);
  const lastCommitRef = useRef(Number.NEGATIVE_INFINITY);

  useEffect(() => {
    nowRef.current = now;
  });

  const commit = useCallback((target: Player, positionMs: number) => {
    lastCommitRef.current = nowRef.current();
    setSnapshot({ positionMs, metrics: target.metrics() });
  }, []);

  /** New engine state; a new generation gets a new frame source starting PREROLL_MS before its position. */
  const apply = useCallback((next: PlaybackState) => {
    const wall = nowRef.current();
    const positionMs = playbackPosition(next, wall);
    let target = playerRef.current;

    if (next.generation !== target.generation) {
      target = createPlayer(index, next.generation, positionMs);
      playerRef.current = target;
      setPlayer(target);
    }

    engineRef.current = next;
    setEngine(next);
    commit(target, positionMs);
  }, [index, commit]);

  const play = useCallback(() => apply(playPlayback(engineRef.current, nowRef.current())), [apply]);
  const pause = useCallback(() => apply(pausePlayback(engineRef.current, nowRef.current())), [apply]);
  const setSpeed = useCallback((speed: PlaybackSpeed) => apply(setPlaybackSpeed(engineRef.current, speed, nowRef.current())), [apply]);
  const seek = useCallback((positionMs: number) => apply(seekPlayback(engineRef.current, positionMs, nowRef.current())), [apply]);

  useEffect(() => {
    if (!engine.playing) {
      return undefined;
    }

    const timer = setInterval(() => {
      const wall = nowRef.current();
      const state = engineRef.current;
      const target = playerRef.current;
      const positionMs = playbackPosition(state, wall);

      target.advance(positionMs);

      if (playbackEnded(state, wall)) {
        apply(pausePlayback(state, wall));
      } else if (wall - lastCommitRef.current >= commitMs) {
        commit(target, positionMs);
      }
    }, tickMs);

    return () => clearInterval(timer);
  }, [engine.playing, engine.generation, tickMs, commitMs, apply, commit]);

  const lastIndex = indexAtOrBefore(index.times, snapshot.positionMs);
  const spo2 = carriedValue(index.spo2, lastIndex);
  const pco2 = carriedValue(index.pco2, lastIndex);
  const inGap = gapAt(index.gaps, snapshot.positionMs) !== null;

  const adapter = useMemo(() => buildRealConsoleAdapter({
    frames: player.source,
    ...(index.sampleRateHz === null ? {} : { sampleRateHz: index.sampleRateHz }),
    status: inGap ? "no-data" : "live",
    ...(inGap ? { statusMessage: PLAYBACK_GAP_MESSAGE } : {}),
    metrics: snapshot.metrics,
    reported: { ...EMPTY_REPORTED_STATE, spo2, pco2 },
    alarms: [],
    canControl: false,
    readOnlyReason: PLAYBACK_READ_ONLY_REASON,
  }), [player, index.sampleRateHz, snapshot.metrics, spo2, pco2, inGap]);

  return {
    adapter,
    positionMs: snapshot.positionMs,
    durationMs: index.durationMs,
    playing: engine.playing,
    speed: engine.speed,
    generation: engine.generation,
    inGap,
    play,
    pause,
    setSpeed,
    seek,
  };
}

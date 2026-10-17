/*
* Funcionalidad: Recording index
* Descripción: Pure, chunked indexing of a telemetry recording (GET /api/ventilator/telemetry/recordings/{reservationId}:
*   every frame of the reservation in ONE response, ordered by server time and subsampled by the backend to the
*   recording rate). The indexer works in steps of `chunkSize` frames so the caller can yield to the browser between
*   steps (no long task, nothing on the render path) and builds: the playback times (ms from the first frame, on the
*   SERVER receipt time — the recorder subsamples on it and `deviceTs` may be missing), the console samples (pressure,
*   flow, volume), and the SpO2 / PCO2 carried forward (the latest reported value at or before each frame, NaN before
*   the first one). Frames with a non-finite time or curve value, or a time before the previous kept frame, are
*   dropped. `indexAtOrBefore` finds the last frame at or before a playback time by binary search. Depends only on the
*   console sample type. v1.1 (T11 review fix S1): the gaps of the recording (a stop and a new start, a device or server
*   outage: consecutive kept frames further apart than `gapThresholdMs`, five sample periods and at least 1 s) are listed
*   in playback time (`gaps`, `gapsTotalMs`) and stay in the playback time (never compressed): the duration includes
*   them; `gapAt` tells whether a playback position falls inside one.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ConsoleSample } from "@shared/ventilator-console";

/** A recorded frame as the backend returns it (RecordedTelemetryFrameDTO). */
export type RecordedFrame = {
  serverTs: number
  deviceTs: number | null
  seq: number | null
  pressure: number
  flow: number
  volume: number
  spo2: number | null
  pco2: number | null
};

export type RecordingSource = {
  reservationId: string
  /** Recording rate (Hz) the backend subsampled to; null when no chunk was stored. */
  sampleRateHz: number | null
  chunkCount: number
  frames: readonly RecordedFrame[]
};

export type RecordingIndex = {
  reservationId: string
  sampleRateHz: number | null
  chunkCount: number
  /** Kept frames. */
  count: number
  /** Server time (epoch ms) of the first kept frame, null without frames. */
  startServerTs: number | null
  /** Time from the first to the last kept frame (ms). */
  durationMs: number
  /** Playback time of each kept frame (ms from the first one), non-decreasing. */
  times: Float64Array
  samples: readonly ConsoleSample[]
  /** Latest reported SpO2 / PCO2 at or before each frame; NaN before the first report. */
  spo2: Float64Array
  pco2: Float64Array
  hasSpo2: boolean
  hasPco2: boolean
  /** Intervals without recorded frames (playback ms, from the last frame before to the first frame after). */
  gaps: readonly RecordingGap[]
  /** Sum of the gap lengths (ms), included in `durationMs`. */
  gapsTotalMs: number
};

export type RecordingGap = { startMs: number, endMs: number };

const MIN_GAP_MS = 1_000;
const GAP_PERIODS = 5;

/** Spacing between two kept frames above which the interval is a gap: five sample periods, at least 1 s. */
export function gapThresholdMs(sampleRateHz: number | null): number {
  return sampleRateHz !== null && sampleRateHz > 0 ? Math.max(MIN_GAP_MS, (GAP_PERIODS * 1000) / sampleRateHz) : MIN_GAP_MS;
}

/** The gap strictly containing a playback position, or null. */
export function gapAt(gaps: readonly RecordingGap[], positionMs: number): RecordingGap | null {
  return gaps.find((gap) => positionMs > gap.startMs && positionMs < gap.endMs) ?? null;
}

/** Frames per indexing step (~a few ms of work per step). */
export const RECORDING_INDEX_CHUNK = 5000;

export type RecordingIndexer = {
  /** Indexes the next chunk; true once every frame was processed. */
  step: () => boolean
  /** Processed share of the frames, 0..1. */
  progress: () => number
  /** The index (call after `step` returned true). */
  result: () => RecordingIndex
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function createRecordingIndexer(source: RecordingSource, chunkSize: number = RECORDING_INDEX_CHUNK): RecordingIndexer {
  const total = source.frames.length;
  const times = new Float64Array(total);
  const spo2 = new Float64Array(total);
  const pco2 = new Float64Array(total);
  const samples: ConsoleSample[] = [];
  const size = Math.max(1, Math.floor(chunkSize));
  let next = 0;
  let count = 0;
  let origin: number | null = null;
  let lastTime = Number.NEGATIVE_INFINITY;
  let lastSpo2 = Number.NaN;
  let lastPco2 = Number.NaN;
  let hasSpo2 = false;
  let hasPco2 = false;
  const gaps: RecordingGap[] = [];
  const threshold = gapThresholdMs(source.sampleRateHz);

  const done = () => next >= total;

  return {
    step() {
      const end = Math.min(total, next + size);

      for (; next < end; next += 1) {
        const frame = source.frames[next];

        if (!frame || !finite(frame.serverTs) || !finite(frame.pressure) || !finite(frame.flow) || !finite(frame.volume)) {
          continue;
        }

        if (frame.serverTs < lastTime) {
          continue;
        }

        origin = origin ?? frame.serverTs;
        lastTime = frame.serverTs;

        if (finite(frame.spo2)) {
          lastSpo2 = frame.spo2;
          hasSpo2 = true;
        }

        if (finite(frame.pco2)) {
          lastPco2 = frame.pco2;
          hasPco2 = true;
        }

        const tMs = frame.serverTs - origin;
        const previousMs = count > 0 ? (times[count - 1] ?? tMs) : tMs;

        if (tMs - previousMs > threshold) {
          gaps.push({ startMs: previousMs, endMs: tMs });
        }

        times[count] = tMs;
        spo2[count] = lastSpo2;
        pco2[count] = lastPco2;
        samples.push({ tMs, pressure: frame.pressure, flow: frame.flow, volume: frame.volume });
        count += 1;
      }

      return done();
    },
    progress: () => (total === 0 ? 1 : next / total),
    result() {
      return {
        reservationId: source.reservationId,
        sampleRateHz: source.sampleRateHz,
        chunkCount: source.chunkCount,
        count,
        startServerTs: origin,
        durationMs: count > 0 ? (times[count - 1] ?? 0) : 0,
        times: times.subarray(0, count),
        samples,
        spo2: spo2.subarray(0, count),
        pco2: pco2.subarray(0, count),
        hasSpo2,
        hasPco2,
        gaps,
        gapsTotalMs: gaps.reduce((total, gap) => total + (gap.endMs - gap.startMs), 0),
      };
    },
  };
}

/** Indexes everything at once (tests, tiny recordings). */
export function indexRecording(source: RecordingSource): RecordingIndex {
  const indexer = createRecordingIndexer(source, Number.MAX_SAFE_INTEGER);

  indexer.step();

  return indexer.result();
}

/** Index of the last frame at or before `tMs`, or -1 when `tMs` is before the first frame. */
export function indexAtOrBefore(times: Float64Array, tMs: number): number {
  let low = 0;
  let high = times.length - 1;
  let found = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if ((times[middle] ?? Number.POSITIVE_INFINITY) <= tMs) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

/** The value carried at a frame, null when none was reported yet. */
export function carriedValue(values: Float64Array, index: number): number | null {
  const value = index >= 0 ? values[index] : undefined;

  return value === undefined || Number.isNaN(value) ? null : value;
}

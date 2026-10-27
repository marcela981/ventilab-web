/*
* Funcionalidad: Waveform playback clock
* Descripción: Pure, allocation-free timing for the live curves (W3, Bloque 1). Samples arrive in batches (30 Hz from
*   the simulation worker, irregular from the real ventilator), so drawing "up to the latest sample" only moves the
*   trace when a batch lands. The playback clock instead maps the display time (requestAnimationFrame `now`) to a
*   source time: it learns the source rate (source ms per wall ms, ×1 live, ×8 in a fast replay) from the batch
*   arrivals, extrapolates the latest sample time between batches and draws a small playback delay behind it, so the
*   head advances every frame. The head never passes the newest sample and never goes back; a long silence (paused
*   source, hidden tab) re-anchors without learning a wrong rate. Also the helpers that cut a window at the head:
*   how many samples are at or before it and the sample interpolated exactly at it. No DOM or canvas access.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { WaveformWindow } from "./waveform-ring-buffer";

/**
 * Default delay of the live curves behind the newest sample (wall ms): about one 30 Hz batch plus jitter margin, so
 * the extrapolated head almost never reaches the newest sample before the next batch lands (it would stall a frame).
 */
export const DEFAULT_PLAYBACK_DELAY_MS = 50;

/** Weight of a new rate observation (exponential moving average). */
export const PLAYBACK_RATE_SMOOTHING = 0.2;

/** A gap between batches longer than this is a pause or a hidden tab: re-anchor without learning the rate. */
export const PLAYBACK_MAX_ARRIVAL_GAP_MS = 250;

const MIN_RATE = 0.05;
const MAX_RATE = 64;

/** Mutable state of one playback clock (one per canvas painter; mutated in place, never reallocated per frame). */
export type PlaybackClock = {
  /** Newest sample time seen, or null before any sample. */
  latestMs: number | null
  /** Wall time (rAF `now`) when `latestMs` was first seen. */
  arrivalMs: number
  /** Source ms per wall ms. */
  rate: number
  /** Last head returned, or null. */
  headMs: number | null
};

export function createPlaybackClock(): PlaybackClock {
  return { latestMs: null, arrivalMs: 0, rate: 1, headMs: null };
}

/** Forgets the stream (a cleared ring or a new source). */
export function resetPlaybackClock(clock: PlaybackClock): void {
  clock.latestMs = null;
  clock.arrivalMs = 0;
  clock.rate = 1;
  clock.headMs = null;
}

function clampRate(rate: number): number {
  return Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
}

/**
 * The source time to draw up to at wall time `nowMs`, given the newest sample time of the ring. With `delayMs` 0 it is
 * always the newest sample (the trace jumps per batch, as before W3). Returns null without samples.
 */
export function advancePlayback(clock: PlaybackClock, latestMs: number | null, nowMs: number, delayMs: number): number | null {
  if (latestMs === null) {
    resetPlaybackClock(clock);

    return null;
  }

  if (clock.latestMs === null || latestMs < clock.latestMs) {
    // First sample, or the source clock went back (the ring was reset): start right behind the newest sample.
    clock.latestMs = latestMs;
    clock.arrivalMs = nowMs;
    clock.headMs = null;
  } else if (latestMs > clock.latestMs) {
    const gapMs = nowMs - clock.arrivalMs;

    if (gapMs > 0 && gapMs <= PLAYBACK_MAX_ARRIVAL_GAP_MS) {
      const observed = (latestMs - clock.latestMs) / gapMs;

      clock.rate = clampRate(clock.rate + PLAYBACK_RATE_SMOOTHING * (observed - clock.rate));
    }

    clock.latestMs = latestMs;
    clock.arrivalMs = nowMs;
  }

  const target = delayMs <= 0
    ? latestMs
    : Math.min(latestMs, latestMs + (nowMs - clock.arrivalMs - delayMs) * clock.rate);
  const head = clock.headMs === null ? target : Math.max(clock.headMs, target);

  clock.headMs = head;

  return head;
}

/** Number of samples of `window` whose time is at or before `headMs` (times ascending; binary search). */
export function countUpTo<C extends string>(window: WaveformWindow<C>, headMs: number): number {
  let low = 0;
  let high = window.length;

  while (low < high) {
    const mid = (low + high) >> 1;

    if ((window.t[mid] ?? Number.NaN) <= headMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

/** A point of the trace: time and one value per channel (reused across frames). */
export type TracePoint<C extends string> = { t: number, values: Record<C, number> };

/**
 * Writes into `target` the sample at `headMs`: linear between the last sample at or before the head and the first one
 * after it, or the last sample itself when none follows. False when no sample is at or before the head.
 */
export function interpolateAt<C extends string>(
  window: WaveformWindow<C>,
  channels: readonly C[],
  headMs: number,
  target: TracePoint<C>,
): boolean {
  const count = countUpTo(window, headMs);

  if (count === 0) {
    return false;
  }

  const before = count - 1;
  const t0 = window.t[before] ?? Number.NaN;
  const t1 = count < window.length ? window.t[count] ?? Number.NaN : Number.NaN;
  const ratio = Number.isFinite(t1) && t1 > t0 ? (headMs - t0) / (t1 - t0) : 0;

  target.t = ratio > 0 ? headMs : t0;

  for (const channel of channels) {
    const v0 = window.values[channel][before] ?? Number.NaN;
    const v1 = ratio > 0 ? window.values[channel][count] ?? Number.NaN : v0;

    target.values[channel] = v0 + (v1 - v0) * ratio;
  }

  return true;
}

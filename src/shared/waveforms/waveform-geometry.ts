/*
* Funcionalidad: Waveform geometry
* Descripción: Pure drawing math shared by SweepCanvas and LoopCanvas: sweep position, time/value to pixel mapping (sweep and scroll layouts), pixel to time for the measurement cursor, nearest-sample binary search, auto-range, round tick steps, stacked lanes, x/y loop extraction from a ring window and the cursor readout text. No DOM or canvas access, so it is unit-tested in jsdom. v1.1: loop extraction keeps a NaN gap marker for pen lifts and can write into scratch buffers (views via `subarray`). v1.2 (W3, Bloque 1): `eraseSpansInto` writes the erase spans into a reused pool (no per-frame allocation).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { WaveformRange } from "./waveform.entity";
import type { WaveformWindow } from "./waveform-ring-buffer";

/** `sweep`: an erase bar moves left to right over the old trace. `scroll`: the window slides left. */
export type WaveformDisplayMode = "sweep" | "scroll";

/** Horizontal plot area, in CSS pixels. */
export type PlotSpan = { x: number, width: number };

/** Vertical lane of one stacked channel, in CSS pixels. */
export type Lane = { y: number, height: number };

export type LoopPoints = { x: Float32Array, y: Float32Array, length: number };

export type CursorReadoutEntry = { label: string, unit: string, value: number };

/** Position of `tMs` inside the repeating sweep window, from 0 (left) to just under 1 (right). */
export function sweepRatio(tMs: number, windowMs: number): number {
  return (((tMs % windowMs) + windowMs) % windowMs) / windowMs;
}

export function sweepX(tMs: number, windowMs: number, plot: PlotSpan): number {
  return plot.x + sweepRatio(tMs, windowMs) * plot.width;
}

export function scrollX(tMs: number, latestMs: number, windowMs: number, plot: PlotSpan): number {
  return plot.x + ((tMs - (latestMs - windowMs)) / windowMs) * plot.width;
}

export function valueToY(value: number, range: WaveformRange, lane: Lane): number {
  const span = range.max - range.min;

  if (span <= 0) {
    return lane.y + lane.height / 2;
  }

  return lane.y + (1 - (value - range.min) / span) * lane.height;
}

export function valueToX(value: number, range: WaveformRange, plot: PlotSpan): number {
  const span = range.max - range.min;

  if (span <= 0) {
    return plot.x + plot.width / 2;
  }

  return plot.x + ((value - range.min) / span) * plot.width;
}

/**
 * Horizontal spans `[from, to]` a sweep frame must clear: from the previous head to the new head
 * plus the erase gap, split at the right edge when the head or the gap wraps around.
 */
export function eraseSpans(fromX: number, toX: number, gapPx: number, plot: PlotSpan): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const count = eraseSpansInto(out, fromX, toX, gapPx, plot);

  return out.slice(0, count).map(([start, end]) => [start, end]);
}

/** Writes the non-empty span `[start, end]` into the reused slot `count` of `out`; returns the new count. */
function writeSpan(out: Array<[number, number]>, count: number, start: number, end: number): number {
  if (end <= start) {
    return count;
  }

  const slot = out[count];

  if (slot) {
    slot[0] = start;
    slot[1] = end;
  } else {
    out[count] = [start, end];
  }

  return count + 1;
}

/** One raw span clamped to the right edge, with its overflow wrapped to the left edge. */
function writeWrapped(out: Array<[number, number]>, count: number, start: number, end: number, left: number, right: number): number {
  const next = writeSpan(out, count, start, Math.min(end, right));

  return end > right ? writeSpan(out, next, left, left + (end - right)) : next;
}

/**
 * `eraseSpans` into a reused array of span tuples (live frames allocate nothing once the pool holds its 3 slots);
 * returns how many leading entries of `out` are valid.
 */
export function eraseSpansInto(out: Array<[number, number]>, fromX: number, toX: number, gapPx: number, plot: PlotSpan): number {
  const left = plot.x;
  const right = plot.x + plot.width;

  if (toX >= fromX) {
    return writeWrapped(out, 0, fromX, toX + gapPx, left, right);
  }

  return writeWrapped(out, writeWrapped(out, 0, fromX, right, left, right), left, toX + gapPx, left, right);
}

/** Time under pixel `x` for the given layout; `x` is clamped to the plot area. */
export function pixelToTime(
  x: number,
  plot: PlotSpan,
  windowMs: number,
  latestMs: number,
  mode: WaveformDisplayMode,
): number {
  const ratio = Math.min(1, Math.max(0, (x - plot.x) / plot.width));

  if (mode === "scroll") {
    return latestMs - windowMs + ratio * windowMs;
  }

  const cycleStart = latestMs - sweepRatio(latestMs, windowMs) * windowMs;
  const time = cycleStart + ratio * windowMs;

  return time > latestMs ? time - windowMs : time;
}

/** Index of the sample closest to `target` in ascending `times`, or -1 when empty. */
export function findNearestIndex(times: ArrayLike<number>, length: number, target: number): number {
  if (length <= 0) {
    return -1;
  }

  let low = 0;
  let high = length - 1;

  while (low < high) {
    const mid = (low + high) >> 1;

    if ((times[mid] ?? 0) < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const previous = low - 1;

  if (previous >= 0 && Math.abs((times[previous] ?? 0) - target) <= Math.abs((times[low] ?? 0) - target)) {
    return previous;
  }

  return low;
}

export function computeAutoRange(
  values: ArrayLike<number>,
  length: number,
  fallback: WaveformRange,
  paddingRatio = 0.1,
): WaveformRange {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < length; i += 1) {
    const value = values[i] ?? Number.NaN;

    if (Number.isFinite(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }

  if (!Number.isFinite(min)) {
    return fallback;
  }

  if (max === min) {
    return { min: min - 1, max: max + 1 };
  }

  const padding = (max - min) * paddingRatio;

  return { min: min - padding, max: max + padding };
}

function niceStep(roughStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return factor * magnitude;
}

/** Round gridline values (1/2/5 × 10^n steps) inside `range`. */
export function niceTicks(range: WaveformRange, maxTicks: number): number[] {
  const span = range.max - range.min;

  if (span <= 0 || maxTicks < 2) {
    return [range.min];
  }

  const step = niceStep(span / (maxTicks - 1));
  const ticks: number[] = [];

  for (let tick = Math.ceil(range.min / step) * step; tick <= range.max + step * 1e-9; tick += step) {
    ticks.push(Math.abs(tick) < step * 1e-9 ? 0 : Number(tick.toPrecision(12)));
  }

  return ticks;
}

export function computeLanes(height: number, count: number, gap: number): Lane[] {
  const laneHeight = Math.max(0, (height - gap * (count - 1)) / count);

  return Array.from({ length: count }, (_, index) => ({ y: index * (laneHeight + gap), height: laneHeight }));
}

/**
 * Pairs channel `xKey` against `yKey` (e.g. volume vs pressure for a P-V loop). A run of non-finite
 * samples between finite ones becomes one NaN gap marker, where a painter must lift the pen
 * (leading and trailing gaps are dropped). With `scratch` (at least `window.length` long) the
 * points are written there and returned as views, so nothing is allocated.
 */
export function extractLoop<C extends string>(
  window: WaveformWindow<C>,
  xKey: C,
  yKey: C,
  scratch?: { x: Float32Array, y: Float32Array },
): LoopPoints {
  const reuse = scratch && scratch.x.length >= window.length && scratch.y.length >= window.length;
  const x = reuse ? scratch.x : new Float32Array(window.length);
  const y = reuse ? scratch.y : new Float32Array(window.length);
  const xs = window.values[xKey];
  const ys = window.values[yKey];
  let length = 0;
  let gap = false;

  for (let i = 0; i < window.length; i += 1) {
    const xv = xs[i] ?? Number.NaN;
    const yv = ys[i] ?? Number.NaN;

    if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
      gap = length > 0;
      continue;
    }

    if (gap) {
      x[length] = Number.NaN;
      y[length] = Number.NaN;
      length += 1;
      gap = false;
    }

    x[length] = xv;
    y[length] = yv;
    length += 1;
  }

  return { x: x.subarray(0, length), y: y.subarray(0, length), length };
}

export function formatCursorReadout(tMs: number, entries: readonly CursorReadoutEntry[]): string {
  const parts = entries.map((entry) => {
    const value = Number.isFinite(entry.value) ? entry.value.toFixed(1) : "—";

    return `${entry.label} ${value} ${entry.unit}`;
  });

  return [`t = ${(tMs / 1000).toFixed(2)} s`, ...parts].join(" · ");
}

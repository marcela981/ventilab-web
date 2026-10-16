/*
* Funcionalidad: Sweep painter
* Descripción: Canvas painting for SweepCanvas, outside React. Stacked lanes (one per channel) with gridlines, tick values and a label with units; sweep mode paints incrementally (only the new segment plus the erase bar ahead of the head, O(new samples)) and repaints in full on resize, reset, wrap with auto-range or catch-up; scroll mode repaints the window when new data arrives. Frozen snapshots and the measurement cursor are painted from a captured window. Colors come from CSS custom properties of the canvas. Depends on the ring buffer, waveform-geometry and use-waveform-renderer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { WaveformRange } from "./waveform.entity";
import type { WaveformRingBuffer, WaveformWindow } from "./waveform-ring-buffer";
import {
  computeAutoRange,
  computeLanes,
  eraseSpans,
  niceTicks,
  scrollX,
  sweepX,
  valueToY,
} from "./waveform-geometry";
import type { Lane, PlotSpan, WaveformDisplayMode } from "./waveform-geometry";
import { resolveCanvasColor, resolveCanvasFont } from "./use-waveform-renderer";
import type { WaveformRenderFrame } from "./use-waveform-renderer";

/** One stacked channel. `colorVar` is a CSS custom property name; no `range` means auto-range. */
export type SweepChannel<C extends string> = {
  key: C
  label: string
  unit: string
  colorVar: string
  range?: WaveformRange
};

export type SweepConfig<C extends string> = {
  channels: readonly SweepChannel<C>[]
  windowMs: number
  mode: WaveformDisplayMode
};

/** Window captured when the display froze; `latestMs` anchors the sweep/scroll layout. */
export type FrozenSweep<C extends string> = {
  window: WaveformWindow<C>
  latestMs: number
  ranges: WaveformRange[]
};

export type SweepLayout = {
  width: number
  height: number
  plot: PlotSpan
  lanes: Lane[]
};

type SweepPalette = {
  background: string
  grid: string
  text: string
  cursor: string
  font: string
  curves: string[]
};

type SweepScene<C extends string> = {
  config: SweepConfig<C>
  layout: SweepLayout
  palette: SweepPalette
  ranges: WaveformRange[]
  latestMs: number
};

type Point<C extends string> = { t: number, values: Record<C, number> };

export const SWEEP_LAYOUT = { leftPad: 44, rightPad: 8, laneGap: 8, eraseGapPx: 12, tickCount: 5 } as const;

const AUTO_RANGE_FALLBACK: WaveformRange = { min: -1, max: 1 };

export function computeSweepLayout(width: number, height: number, channelCount: number): SweepLayout {
  return {
    width,
    height,
    plot: { x: SWEEP_LAYOUT.leftPad, width: Math.max(1, width - SWEEP_LAYOUT.leftPad - SWEEP_LAYOUT.rightPad) },
    lanes: computeLanes(height, Math.max(1, channelCount), SWEEP_LAYOUT.laneGap),
  };
}

export function resolveRanges<C extends string>(channels: readonly SweepChannel<C>[], window: WaveformWindow<C>): WaveformRange[] {
  return channels.map((channel) => channel.range ?? computeAutoRange(window.values[channel.key], window.length, AUTO_RANGE_FALLBACK));
}

export function captureFrozenSweep<C extends string>(buffer: WaveformRingBuffer<C>, config: SweepConfig<C>): FrozenSweep<C> {
  const latestMs = buffer.latestTime ?? 0;
  const window = buffer.latestTime === null ? buffer.readAll() : buffer.readWindow(latestMs - config.windowMs);

  return { window, latestMs, ranges: resolveRanges(config.channels, window) };
}

/** Pixel x of time `tMs` for the configured layout. */
export function timeToX<C extends string>(tMs: number, config: SweepConfig<C>, latestMs: number, plot: PlotSpan): number {
  return config.mode === "sweep" ? sweepX(tMs, config.windowMs, plot) : scrollX(tMs, latestMs, config.windowMs, plot);
}

function readPalette<C extends string>(frame: WaveformRenderFrame, channels: readonly SweepChannel<C>[]): SweepPalette {
  const styles = getComputedStyle(frame.canvas);

  return {
    background: resolveCanvasColor(frame.ctx, styles, "--vl-console-bg"),
    grid: resolveCanvasColor(frame.ctx, styles, "--vl-console-grid"),
    text: resolveCanvasColor(frame.ctx, styles, "--vl-console-text-muted"),
    cursor: resolveCanvasColor(frame.ctx, styles, "--vl-console-text"),
    font: resolveCanvasFont(styles),
    curves: channels.map((channel) => resolveCanvasColor(frame.ctx, styles, channel.colorVar)),
  };
}

function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function paintChromeArea<C extends string>(ctx: CanvasRenderingContext2D, scene: SweepScene<C>): void {
  const { layout, palette, config } = scene;
  const { plot, lanes } = layout;
  const seconds = Math.max(1, Math.round(config.windowMs / 1000));

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.grid;
  ctx.beginPath();

  lanes.forEach((lane, index) => {
    for (let s = 0; s <= seconds; s += 1) {
      const x = Math.round(plot.x + (s / seconds) * plot.width) + 0.5;
      ctx.moveTo(x, lane.y);
      ctx.lineTo(x, lane.y + lane.height);
    }

    for (const tick of niceTicks(scene.ranges[index] ?? AUTO_RANGE_FALLBACK, SWEEP_LAYOUT.tickCount)) {
      const y = Math.round(valueToY(tick, scene.ranges[index] ?? AUTO_RANGE_FALLBACK, lane)) + 0.5;
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.width, y);
    }
  });

  ctx.stroke();
  ctx.fillStyle = palette.text;
  ctx.font = palette.font;

  lanes.forEach((lane, index) => {
    const range = scene.ranges[index] ?? AUTO_RANGE_FALLBACK;
    const channel = config.channels[index];
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (const tick of niceTicks(range, SWEEP_LAYOUT.tickCount)) {
      ctx.fillText(formatTick(tick), plot.x - 4, valueToY(tick, range, lane));
    }

    if (channel) {
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`${channel.label} (${channel.unit})`, plot.x + 4, lane.y + 2);
    }
  });
}

/** Paints background, grid and labels, optionally only inside the given horizontal spans. */
function paintChrome<C extends string>(
  ctx: CanvasRenderingContext2D,
  scene: SweepScene<C>,
  spans?: ReadonlyArray<[number, number]>,
): void {
  if (!spans) {
    paintChromeArea(ctx, scene);

    return;
  }

  for (const [start, end] of spans) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(start, 0, end - start, scene.layout.height);
    ctx.clip();
    paintChromeArea(ctx, scene);
    ctx.restore();
  }
}

/** Strokes each channel in its lane. A backwards jump in x (sweep wrap) or a NaN lifts the pen. */
function paintTrace<C extends string>(
  ctx: CanvasRenderingContext2D,
  scene: SweepScene<C>,
  window: WaveformWindow<C>,
  fromMs: number,
  prefix: Point<C> | null = null,
): void {
  const { layout, config } = scene;

  config.channels.forEach((channel, index) => {
    const lane = layout.lanes[index];
    const range = scene.ranges[index] ?? AUTO_RANGE_FALLBACK;
    const values = window.values[channel.key];

    if (!lane) {
      return;
    }

    let penDown = false;
    let lastX = Number.NEGATIVE_INFINITY;
    const visit = (t: number, value: number): void => {
      if (t < fromMs || !Number.isFinite(value)) {
        penDown = false;

        return;
      }

      const x = timeToX(t, config, scene.latestMs, layout.plot);
      const y = valueToY(value, range, lane);

      if (penDown && x >= lastX) {
        ctx.lineTo(x, y);
      } else {
        ctx.moveTo(x, y);
      }

      penDown = true;
      lastX = x;
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.plot.x, lane.y, layout.plot.width, lane.height);
    ctx.clip();
    ctx.beginPath();
    ctx.strokeStyle = scene.palette.curves[index] ?? scene.palette.text;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    if (prefix) {
      visit(prefix.t, prefix.values[channel.key]);
    }

    for (let i = 0; i < window.length; i += 1) {
      visit(window.t[i] ?? Number.NaN, values[i] ?? Number.NaN);
    }

    ctx.stroke();
    ctx.restore();
  });
}

function paintCursor<C extends string>(ctx: CanvasRenderingContext2D, scene: SweepScene<C>, window: WaveformWindow<C>, index: number): void {
  const t = window.t[index];

  if (t === undefined) {
    return;
  }

  const { layout, config, palette } = scene;
  const x = Math.round(timeToX(t, config, scene.latestMs, layout.plot)) + 0.5;
  ctx.strokeStyle = palette.cursor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, layout.height);
  ctx.stroke();

  config.channels.forEach((channel, laneIndex) => {
    const lane = layout.lanes[laneIndex];
    const value = window.values[channel.key][index] ?? Number.NaN;

    if (!lane || !Number.isFinite(value)) {
      return;
    }

    ctx.fillStyle = palette.curves[laneIndex] ?? palette.cursor;
    ctx.beginPath();
    ctx.arc(x, valueToY(value, scene.ranges[laneIndex] ?? AUTO_RANGE_FALLBACK, lane), 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function lastPoint<C extends string>(window: WaveformWindow<C>, channels: readonly SweepChannel<C>[]): Point<C> | null {
  const index = window.length - 1;
  const t = window.t[index];

  if (t === undefined) {
    return null;
  }

  const values = Object.fromEntries(
    channels.map((channel) => [channel.key, window.values[channel.key][index] ?? Number.NaN]),
  ) as Record<C, number>;

  return { t, values };
}

/** Holds the incremental state of one SweepCanvas between frames. */
export class SweepPainter<C extends string> {
  private generation = -1;
  private sequence = 0;
  private cycle = -1;
  private prev: Point<C> | null = null;
  private ranges: WaveformRange[] = [];
  private palette: SweepPalette | null = null;

  public paintLive(frame: WaveformRenderFrame, buffer: WaveformRingBuffer<C>, config: SweepConfig<C>): void {
    const layout = computeSweepLayout(frame.width, frame.height, config.channels.length);
    const latest = buffer.latestTime;
    const unchanged = buffer.generation === this.generation && buffer.writeCount === this.sequence;

    if (!frame.full && unchanged) {
      return;
    }

    const gapMs = config.mode === "sweep" ? (SWEEP_LAYOUT.eraseGapPx / layout.plot.width) * config.windowMs : 0;
    const cycle = latest === null ? -1 : Math.floor(latest / config.windowMs);
    const autoWrapped = cycle !== this.cycle && config.channels.some((channel) => !channel.range);
    const caughtUp = latest !== null && this.prev !== null && latest - this.prev.t >= config.windowMs - gapMs;

    if (frame.full || !this.palette || config.mode === "scroll" || latest === null || !this.prev
      || buffer.generation !== this.generation || autoWrapped || caughtUp) {
      this.paintFull(frame, layout, buffer, config, gapMs);

      return;
    }

    const fresh = buffer.readSince(this.sequence);
    const freshLatest = fresh.t[fresh.length - 1];

    if (freshLatest === undefined) {
      return;
    }

    const scene: SweepScene<C> = { config, layout, palette: this.palette, ranges: this.ranges, latestMs: freshLatest };
    const spans = eraseSpans(
      sweepX(this.prev.t, config.windowMs, layout.plot),
      sweepX(freshLatest, config.windowMs, layout.plot),
      SWEEP_LAYOUT.eraseGapPx,
      layout.plot,
    );
    paintChrome(frame.ctx, scene, spans);
    paintTrace(frame.ctx, scene, fresh, Number.NEGATIVE_INFINITY, this.prev);
    this.track(buffer, fresh, config, cycle);
  }

  public paintFrozen(frame: WaveformRenderFrame, snapshot: FrozenSweep<C>, cursorIndex: number, config: SweepConfig<C>): void {
    if (!frame.full) {
      return;
    }

    const layout = computeSweepLayout(frame.width, frame.height, config.channels.length);
    const gapMs = config.mode === "sweep" ? (SWEEP_LAYOUT.eraseGapPx / layout.plot.width) * config.windowMs : 0;
    this.palette = readPalette(frame, config.channels);
    const scene: SweepScene<C> = { config, layout, palette: this.palette, ranges: snapshot.ranges, latestMs: snapshot.latestMs };
    paintChrome(frame.ctx, scene);
    paintTrace(frame.ctx, scene, snapshot.window, snapshot.latestMs - config.windowMs + gapMs);

    if (cursorIndex >= 0) {
      paintCursor(frame.ctx, scene, snapshot.window, cursorIndex);
    }

    this.generation = -1;
  }

  private paintFull(
    frame: WaveformRenderFrame,
    layout: SweepLayout,
    buffer: WaveformRingBuffer<C>,
    config: SweepConfig<C>,
    gapMs: number,
  ): void {
    const latest = buffer.latestTime;
    const window = latest === null ? buffer.readAll() : buffer.readWindow(latest - config.windowMs + gapMs);
    this.palette = frame.full || !this.palette ? readPalette(frame, config.channels) : this.palette;
    this.ranges = resolveRanges(config.channels, window);
    const scene: SweepScene<C> = { config, layout, palette: this.palette, ranges: this.ranges, latestMs: latest ?? 0 };
    paintChrome(frame.ctx, scene);
    paintTrace(frame.ctx, scene, window, Number.NEGATIVE_INFINITY);
    this.track(buffer, window, config, latest === null ? -1 : Math.floor(latest / config.windowMs));
  }

  private track(buffer: WaveformRingBuffer<C>, window: WaveformWindow<C>, config: SweepConfig<C>, cycle: number): void {
    this.generation = buffer.generation;
    this.sequence = buffer.writeCount;
    this.cycle = cycle;
    this.prev = lastPoint(window, config.channels);
  }
}

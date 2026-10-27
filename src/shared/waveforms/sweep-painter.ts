/*
* Funcionalidad: Sweep painter
* Descripción: Canvas painting for SweepCanvas, outside React. Stacked lanes (one per channel) with gridlines, tick values and a label with units; sweep mode paints incrementally (only the new segment plus the erase bar ahead of the head, O(new samples)) and repaints in full on resize, reset, wrap with auto-range or catch-up; scroll mode repaints the window when new data arrives. Frozen snapshots and the measurement cursor are painted from a captured window. Colors come from CSS custom properties of the canvas. Depends on the ring buffer, waveform-geometry and use-waveform-renderer. v1.1: the chrome (background, grid, labels) is rendered once per full repaint (or range change) into an offscreen canvas and incremental frames copy only the erase spans from it, with a direct-paint fallback where no offscreen canvas exists; reads go into a reused window and the last point is copied in place, so live frames allocate no sample arrays; in sweep mode a frozen snapshot starts after the erase gap. v1.2: span copies clamp the source rectangle to the chrome layer backing store (fractional DPR rounding never reads outside it). v1.3 (W3, Bloque 1): live painting is driven by time, not by batch arrival: a playback clock (playback-clock.ts) turns the frame time into a head a small delay behind the newest sample, and each frame draws the samples up to the head plus the point interpolated exactly at it, so the sweep (and scroll) advances at the display refresh rate between 30 Hz batches; with `delayMs` 0 the head is the newest sample (previous behaviour). The layout is cached per size, the scene object and the erase-span pool are reused and the trace loop has no closures, so live frames allocate nothing; the palette is still read only on a full repaint.
* Versión: 1.3
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
  eraseSpansInto,
  niceTicks,
  scrollX,
  sweepX,
  valueToY,
} from "./waveform-geometry";
import { advancePlayback, countUpTo, createPlaybackClock, interpolateAt, resetPlaybackClock } from "./playback-clock";
import type { TracePoint } from "./playback-clock";
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

type Point<C extends string> = TracePoint<C>;

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

/** Time hidden under the sweep erase bar for a plot `plotWidth` px wide (0 in scroll mode or before layout). */
export function sweepGapMs<C extends string>(config: SweepConfig<C>, plotWidth: number): number {
  return config.mode === "sweep" && plotWidth > 0 ? (SWEEP_LAYOUT.eraseGapPx / plotWidth) * config.windowMs : 0;
}

/**
 * Copies the visible window when the display freezes. In sweep mode it starts after the erase gap
 * (`latest - window + gap`), so the measurement cursor can only land on samples that are drawn.
 */
export function captureFrozenSweep<C extends string>(
  buffer: WaveformRingBuffer<C>,
  config: SweepConfig<C>,
  plotWidth = 0,
): FrozenSweep<C> {
  const latestMs = buffer.latestTime ?? 0;
  const window = buffer.latestTime === null
    ? buffer.readAll()
    : buffer.readWindow(latestMs - config.windowMs + sweepGapMs(config, plotWidth));

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

/** Offscreen copy of the chrome (background, grid, labels) at the backing-store resolution. */
export type ChromeLayer = { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dpr: number };

/** An offscreen canvas for the chrome, or null where the environment cannot provide one. */
function createChromeLayer(frame: WaveformRenderFrame): ChromeLayer | null {
  try {
    const canvas = frame.canvas.ownerDocument.createElement("canvas");
    const ctx = canvas.getContext("2d");

    return ctx && typeof ctx.drawImage === "function" ? { canvas, ctx, dpr: 1 } : null;
  } catch {
    return null;
  }
}

/** Redraws the chrome into the layer, sized like the visible canvas backing store. */
function renderChromeLayer<C extends string>(layer: ChromeLayer, frame: WaveformRenderFrame, scene: SweepScene<C>): void {
  const width = Math.max(1, frame.canvas.width);
  const height = Math.max(1, frame.canvas.height);

  if (layer.canvas.width !== width || layer.canvas.height !== height) {
    layer.canvas.width = width;
    layer.canvas.height = height;
  }

  layer.dpr = width / Math.max(1, scene.layout.width);
  layer.ctx.setTransform(layer.dpr, 0, 0, layer.dpr, 0, 0);
  paintChromeArea(layer.ctx, scene);
}

/** Copies the chrome layer to the canvas: everything, or only the given horizontal spans (exported for tests). */
export function blitChrome(
  ctx: CanvasRenderingContext2D,
  layer: ChromeLayer,
  layout: SweepLayout,
  spans?: ReadonlyArray<readonly [number, number]>,
  count: number = spans?.length ?? 0,
): void {
  if (!spans) {
    ctx.drawImage(layer.canvas, 0, 0, layout.width, layout.height);

    return;
  }

  const sourceWidth = layer.canvas.width;
  const sourceHeight = layer.canvas.height;

  for (let index = 0; index < count; index += 1) {
    const span = spans[index];

    if (!span) {
      continue;
    }

    const [start, end] = span;
    // Fractional DPR rounding can push the scaled span past the backing store; clamp the source rectangle to it.
    const sourceStart = Math.max(0, start * layer.dpr);
    const sourceEnd = Math.min(sourceWidth, end * layer.dpr);

    if (sourceEnd <= sourceStart || sourceHeight <= 0) {
      continue;
    }

    const destStart = sourceStart / layer.dpr;
    const destWidth = (sourceEnd - sourceStart) / layer.dpr;
    ctx.clearRect(destStart, 0, destWidth, layout.height);
    ctx.drawImage(layer.canvas, sourceStart, 0, sourceEnd - sourceStart, sourceHeight, destStart, 0, destWidth, layout.height);
  }
}

/** Fallback without a chrome layer: paints the chrome directly, clipped to the spans when given. */
function paintChrome<C extends string>(
  ctx: CanvasRenderingContext2D,
  scene: SweepScene<C>,
  spans?: ReadonlyArray<readonly [number, number]>,
  count: number = spans?.length ?? 0,
): void {
  if (!spans) {
    paintChromeArea(ctx, scene);

    return;
  }

  for (let index = 0; index < count; index += 1) {
    const span = spans[index];

    if (!span) {
      continue;
    }

    const [start, end] = span;
    ctx.save();
    ctx.beginPath();
    ctx.rect(start, 0, end - start, scene.layout.height);
    ctx.clip();
    paintChromeArea(ctx, scene);
    ctx.restore();
  }
}

function sameRanges(a: readonly WaveformRange[], b: readonly WaveformRange[]): boolean {
  return a.length === b.length && a.every((range, index) => range.min === b[index]?.min && range.max === b[index]?.max);
}

/**
 * Strokes each channel in its lane: `prefix` (the previous head), the samples of `window` from `fromMs` up to the
 * first `count` samples, then `suffix` (the point at the new head). A backwards jump in x (sweep wrap) or a NaN lifts
 * the pen. Plain loops, no closures: it runs every frame.
 */
function paintTrace<C extends string>(
  ctx: CanvasRenderingContext2D,
  scene: SweepScene<C>,
  window: WaveformWindow<C>,
  fromMs: number,
  prefix: Point<C> | null = null,
  count: number = window.length,
  suffix: Point<C> | null = null,
): void {
  const { layout, config } = scene;
  const { channels } = config;

  for (let index = 0; index < channels.length; index += 1) {
    const channel = channels[index];
    const lane = layout.lanes[index];

    if (!channel || !lane) {
      continue;
    }

    const range = scene.ranges[index] ?? AUTO_RANGE_FALLBACK;
    const values = window.values[channel.key];
    let penDown = false;
    let lastX = Number.NEGATIVE_INFINITY;

    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.plot.x, lane.y, layout.plot.width, lane.height);
    ctx.clip();
    ctx.beginPath();
    ctx.strokeStyle = scene.palette.curves[index] ?? scene.palette.text;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // -1 is the prefix, `count` the suffix; in between the samples of the window.
    for (let i = prefix ? -1 : 0; i <= count; i += 1) {
      let t: number;
      let value: number;

      if (i < 0 && prefix) {
        t = prefix.t;
        value = prefix.values[channel.key];
      } else if (i === count) {
        if (!suffix) {
          break;
        }

        t = suffix.t;
        value = suffix.values[channel.key];
      } else {
        t = window.t[i] ?? Number.NaN;
        value = values[i] ?? Number.NaN;
      }

      if (t < fromMs || !Number.isFinite(value)) {
        penDown = false;
        continue;
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
    }

    ctx.stroke();
    ctx.restore();
  }
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

/** Holds the incremental state of one SweepCanvas between frames, including its reused buffers. */
export class SweepPainter<C extends string> {
  private generation = -1;
  /** Write sequence of the first sample not drawn yet (it lies after the head). */
  private sequence = 0;
  private cycle = -1;
  private readonly prev: Point<C> = { t: 0, values: {} as Record<C, number> };
  private readonly next: Point<C> = { t: 0, values: {} as Record<C, number> };
  private hasPrev = false;
  private headMs: number | null = null;
  private readonly clock = createPlaybackClock();
  private ranges: WaveformRange[] = [];
  private palette: SweepPalette | null = null;
  private window: WaveformWindow<C> | null = null;
  private chrome: ChromeLayer | null = null;
  private chromeReady = false;
  private chromeRanges: WaveformRange[] = [];
  private layout: SweepLayout | null = null;
  private scene: SweepScene<C> | null = null;
  private readonly spans: Array<[number, number]> = [];
  private channelKeys: C[] = [];

  /**
   * Draws the live trace up to the playback head of this frame (`delayMs` behind the newest sample, extrapolated
   * between batches); with `delayMs` 0 the head is the newest sample.
   */
  public paintLive(frame: WaveformRenderFrame, buffer: WaveformRingBuffer<C>, config: SweepConfig<C>, delayMs = 0): void {
    if (buffer.generation !== this.generation) {
      resetPlaybackClock(this.clock);
    }

    const head = advancePlayback(this.clock, buffer.latestTime, frame.now, delayMs);
    const layout = this.layoutFor(frame.width, frame.height, config.channels.length);
    const unchanged = buffer.generation === this.generation && head === this.headMs;

    if (!frame.full && unchanged) {
      return;
    }

    const gapMs = sweepGapMs(config, layout.plot.width);
    const cycle = head === null ? -1 : Math.floor(head / config.windowMs);
    const autoWrapped = cycle !== this.cycle && config.channels.some((channel) => !channel.range);
    const caughtUp = head !== null && this.hasPrev && head - this.prev.t >= config.windowMs - gapMs;

    if (frame.full || !this.palette || config.mode === "scroll" || head === null || !this.hasPrev
      || buffer.generation !== this.generation || autoWrapped || caughtUp) {
      this.paintFull(frame, layout, buffer, config, gapMs, head);

      return;
    }

    // Samples not drawn yet: those up to the head are drawn now, the rest wait for a later frame.
    const fresh = buffer.readSinceInto(this.scratchWindow(buffer), this.sequence);
    const count = countUpTo(fresh, head);
    // Without a sample at or before the head in `fresh`, the head lies between the previous point and the next sample.
    const hasNext = count > 0
      ? interpolateAt(fresh, this.keysOf(config), head, this.next)
      : this.interpolateFromPrev(fresh, head, config);
    const scene = this.sceneFor(config, layout, this.palette, this.ranges, head);
    const spanCount = eraseSpansInto(
      this.spans,
      sweepX(this.prev.t, config.windowMs, layout.plot),
      sweepX(head, config.windowMs, layout.plot),
      SWEEP_LAYOUT.eraseGapPx,
      layout.plot,
    );

    if (this.chrome && this.chromeReady) {
      blitChrome(frame.ctx, this.chrome, layout, this.spans, spanCount);
    } else {
      paintChrome(frame.ctx, scene, this.spans, spanCount);
    }

    paintTrace(frame.ctx, scene, fresh, Number.NEGATIVE_INFINITY, this.prev, count, hasNext ? this.next : null);
    this.track(buffer, fresh, count, hasNext, cycle, head);
  }

  public paintFrozen(frame: WaveformRenderFrame, snapshot: FrozenSweep<C>, cursorIndex: number, config: SweepConfig<C>): void {
    if (!frame.full) {
      return;
    }

    const layout = this.layoutFor(frame.width, frame.height, config.channels.length);
    this.palette = readPalette(frame, config.channels);
    const scene = this.sceneFor(config, layout, this.palette, snapshot.ranges, snapshot.latestMs);
    this.drawChrome(frame, scene, true);
    paintTrace(frame.ctx, scene, snapshot.window, snapshot.latestMs - config.windowMs + sweepGapMs(config, layout.plot.width));

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
    head: number | null,
  ): void {
    // Everything from the left edge of the window to the newest sample; only the part up to the head is drawn.
    const window = buffer.readWindowInto(
      this.scratchWindow(buffer),
      head === null ? Number.NEGATIVE_INFINITY : head - config.windowMs + gapMs,
    );
    const count = head === null ? window.length : countUpTo(window, head);
    const hasNext = head !== null && interpolateAt(window, this.keysOf(config), head, this.next);
    // The palette is re-read only on a full repaint (resize, theme change, invalidate), never per frame.
    const palette = frame.full || !this.palette ? readPalette(frame, config.channels) : this.palette;
    const ranges = resolveRanges(config.channels, window);
    const rebuildChrome = palette !== this.palette || !sameRanges(ranges, this.chromeRanges);
    this.palette = palette;
    this.ranges = ranges;
    const scene = this.sceneFor(config, layout, palette, ranges, head ?? 0);
    this.drawChrome(frame, scene, rebuildChrome);
    paintTrace(frame.ctx, scene, window, Number.NEGATIVE_INFINITY, null, count, hasNext ? this.next : null);
    this.track(buffer, window, count, hasNext, head === null ? -1 : Math.floor(head / config.windowMs), head);
  }

  /** The point at `head` between the previous head point and the first sample of `fresh` (none drawn in between). */
  private interpolateFromPrev(fresh: WaveformWindow<C>, head: number, config: SweepConfig<C>): boolean {
    const after = fresh.t[0];

    if (!this.hasPrev || fresh.length === 0 || after === undefined || after <= this.prev.t) {
      return false;
    }

    const ratio = Math.min(1, Math.max(0, (head - this.prev.t) / (after - this.prev.t)));

    this.next.t = head;

    for (const key of this.keysOf(config)) {
      const from = this.prev.values[key];
      const to = fresh.values[key][0] ?? Number.NaN;

      this.next.values[key] = from + (to - from) * ratio;
    }

    return true;
  }

  /**
   * Full-canvas chrome. With an offscreen layer the chrome is rendered there only when `rebuild`
   * (full repaint or new ranges) and then copied; incremental frames copy just the erase spans.
   */
  private drawChrome(frame: WaveformRenderFrame, scene: SweepScene<C>, rebuild: boolean): void {
    this.chrome ??= createChromeLayer(frame);

    if (!this.chrome) {
      paintChrome(frame.ctx, scene);

      return;
    }

    if (rebuild || !this.chromeReady) {
      renderChromeLayer(this.chrome, frame, scene);
      this.chromeRanges = scene.ranges;
      this.chromeReady = true;
    }

    blitChrome(frame.ctx, this.chrome, scene.layout);
  }

  private scratchWindow(buffer: WaveformRingBuffer<C>): WaveformWindow<C> {
    if (this.window?.t.length !== buffer.capacity) {
      this.window = buffer.createWindow();
    }

    return this.window;
  }

  /** The layout of this size, recomputed only when the canvas size or the channel count changes. */
  private layoutFor(width: number, height: number, channelCount: number): SweepLayout {
    const cached = this.layout;

    if (cached && cached.width === width && cached.height === height && cached.lanes.length === Math.max(1, channelCount)) {
      return cached;
    }

    this.layout = computeSweepLayout(width, height, channelCount);

    return this.layout;
  }

  /** The channel keys of the config, rebuilt only when the channels change. */
  private keysOf(config: SweepConfig<C>): C[] {
    const keys = this.channelKeys;
    let same = keys.length === config.channels.length;

    for (let index = 0; same && index < keys.length; index += 1) {
      same = config.channels[index]?.key === keys[index];
    }

    if (!same) {
      this.channelKeys = config.channels.map((channel) => channel.key);
    }

    return this.channelKeys;
  }

  /** The scene object of this painter, updated in place. */
  private sceneFor(config: SweepConfig<C>, layout: SweepLayout, palette: SweepPalette, ranges: WaveformRange[], latestMs: number): SweepScene<C> {
    if (this.scene === null) {
      this.scene = { config, layout, palette, ranges, latestMs };
    } else {
      this.scene.config = config;
      this.scene.layout = layout;
      this.scene.palette = palette;
      this.scene.ranges = ranges;
      this.scene.latestMs = latestMs;
    }

    return this.scene;
  }

  /** Remembers what was drawn: the head point and the write sequence of the next sample to draw. */
  private track(buffer: WaveformRingBuffer<C>, window: WaveformWindow<C>, count: number, hasNext: boolean, cycle: number, head: number | null): void {
    this.generation = buffer.generation;
    this.sequence = window.firstSequence + count;
    this.cycle = cycle;
    this.headMs = head;

    if (hasNext) {
      this.prev.t = this.next.t;

      for (const key of this.channelKeys) {
        this.prev.values[key] = this.next.values[key];
      }
    }

    // Without a point at the head (no data yet) the next frame repaints in full.
    this.hasPrev = hasNext;
  }
}

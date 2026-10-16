/*
* Funcionalidad: Loop painter
* Descripción: Canvas painting for LoopCanvas (P-V / F-V loops): x/y gridlines with tick values, axis labels with units and the loop polyline of the last window of samples, with fixed or auto ranges. Repaints only when the buffer changed, the canvas resized or the consumer invalidated. Colors come from CSS custom properties of the canvas. Depends on the ring buffer, waveform-geometry and use-waveform-renderer. v1.1: the palette is cached and re-read only on a full repaint (resize, theme change, invalidate); live frames read into a reused window and scratch loop buffers, so they allocate no sample arrays; a NaN gap marker in the loop lifts the pen.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { WaveformRange } from "./waveform.entity";
import type { WaveformRingBuffer, WaveformWindow } from "./waveform-ring-buffer";
import { computeAutoRange, extractLoop, niceTicks, valueToX, valueToY } from "./waveform-geometry";
import type { LoopPoints } from "./waveform-geometry";
import { resolveCanvasColor, resolveCanvasFont } from "./use-waveform-renderer";
import type { WaveformRenderFrame } from "./use-waveform-renderer";

/** One loop axis. No `range` means auto-range over the window. */
export type LoopAxis<C extends string> = {
  key: C
  label: string
  unit: string
  range?: WaveformRange
};

export type LoopConfig<C extends string> = {
  x: LoopAxis<C>
  y: LoopAxis<C>
  colorVar: string
  windowMs: number
};

export type LoopPalette = {
  background: string
  grid: string
  text: string
  curve: string
  font: string
};

export const LOOP_LAYOUT = { leftPad: 44, rightPad: 8, topPad: 8, bottomPad: 32, tickCount: 5 } as const;

const AUTO_RANGE_FALLBACK: WaveformRange = { min: -1, max: 1 };

function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Last `windowMs` of the buffer; this is the window a frozen loop keeps. */
export function readLoopWindow<C extends string>(buffer: WaveformRingBuffer<C>, windowMs: number): WaveformWindow<C> {
  const latest = buffer.latestTime;

  return latest === null ? buffer.readAll() : buffer.readWindow(latest - windowMs);
}

export function readLoopPalette(frame: WaveformRenderFrame, colorVar: string): LoopPalette {
  const styles = getComputedStyle(frame.canvas);

  return {
    background: resolveCanvasColor(frame.ctx, styles, "--vl-console-bg"),
    grid: resolveCanvasColor(frame.ctx, styles, "--vl-console-grid"),
    text: resolveCanvasColor(frame.ctx, styles, "--vl-console-text-muted"),
    curve: resolveCanvasColor(frame.ctx, styles, colorVar),
    font: resolveCanvasFont(styles),
  };
}

export function paintLoop<C extends string>(
  frame: WaveformRenderFrame,
  loop: LoopPoints,
  config: LoopConfig<C>,
  palette: LoopPalette,
): void {
  const { ctx, width, height } = frame;
  const xRange = config.x.range ?? computeAutoRange(loop.x, loop.length, AUTO_RANGE_FALLBACK);
  const yRange = config.y.range ?? computeAutoRange(loop.y, loop.length, AUTO_RANGE_FALLBACK);
  const plot = { x: LOOP_LAYOUT.leftPad, width: Math.max(1, width - LOOP_LAYOUT.leftPad - LOOP_LAYOUT.rightPad) };
  const lane = { y: LOOP_LAYOUT.topPad, height: Math.max(1, height - LOOP_LAYOUT.topPad - LOOP_LAYOUT.bottomPad) };
  const xTicks = niceTicks(xRange, LOOP_LAYOUT.tickCount);
  const yTicks = niceTicks(yRange, LOOP_LAYOUT.tickCount);

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (const tick of xTicks) {
    const x = Math.round(valueToX(tick, xRange, plot)) + 0.5;
    ctx.moveTo(x, lane.y);
    ctx.lineTo(x, lane.y + lane.height);
  }

  for (const tick of yTicks) {
    const y = Math.round(valueToY(tick, yRange, lane)) + 0.5;
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.width, y);
  }

  ctx.stroke();
  ctx.fillStyle = palette.text;
  ctx.font = palette.font;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (const tick of yTicks) {
    ctx.fillText(formatTick(tick), plot.x - 4, valueToY(tick, yRange, lane));
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (const tick of xTicks) {
    ctx.fillText(formatTick(tick), valueToX(tick, xRange, plot), lane.y + lane.height + 4);
  }

  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(`${config.x.label} (${config.x.unit})`, plot.x + plot.width, height - 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`${config.y.label} (${config.y.unit})`, plot.x + 4, lane.y + 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, lane.y, plot.width, lane.height);
  ctx.clip();
  ctx.beginPath();
  ctx.strokeStyle = palette.curve;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  let penDown = false;

  for (let i = 0; i < loop.length; i += 1) {
    const xv = loop.x[i] ?? Number.NaN;
    const yv = loop.y[i] ?? Number.NaN;

    // NaN is the gap marker from extractLoop: lift the pen so no false chord joins the two sides.
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
      penDown = false;
      continue;
    }

    const x = valueToX(xv, xRange, plot);
    const y = valueToY(yv, yRange, lane);

    if (penDown) {
      ctx.lineTo(x, y);
    } else {
      ctx.moveTo(x, y);
    }

    penDown = true;
  }

  ctx.stroke();
  ctx.restore();
}

/** Remembers what was last painted so unchanged frames are skipped; owns the reused buffers. */
export class LoopPainter<C extends string> {
  private generation = -1;
  private sequence = -1;
  private palette: LoopPalette | null = null;
  private paletteVar = "";
  private window: WaveformWindow<C> | null = null;
  private scratch: { x: Float32Array, y: Float32Array } | null = null;

  public paintLive(frame: WaveformRenderFrame, buffer: WaveformRingBuffer<C>, config: LoopConfig<C>): void {
    if (!frame.full && buffer.generation === this.generation && buffer.writeCount === this.sequence) {
      return;
    }

    if (this.window?.t.length !== buffer.capacity) {
      this.window = buffer.createWindow();
      // Gap markers replace runs of skipped samples, so a loop is never longer than its window.
      this.scratch = { x: new Float32Array(buffer.capacity), y: new Float32Array(buffer.capacity) };
    }

    const latest = buffer.latestTime;
    const window = buffer.readWindowInto(this.window, latest === null ? Number.NEGATIVE_INFINITY : latest - config.windowMs);
    this.paint(frame, window, config);
    this.generation = buffer.generation;
    this.sequence = buffer.writeCount;
  }

  public paintFrozen(frame: WaveformRenderFrame, window: WaveformWindow<C>, config: LoopConfig<C>): void {
    if (frame.full) {
      this.paint(frame, window, config);
    }

    this.generation = -1;
  }

  private paint(frame: WaveformRenderFrame, window: WaveformWindow<C>, config: LoopConfig<C>): void {
    if (frame.full || !this.palette || this.paletteVar !== config.colorVar) {
      this.palette = readLoopPalette(frame, config.colorVar);
      this.paletteVar = config.colorVar;
    }

    const loop = extractLoop(window, config.x.key, config.y.key, this.scratch ?? undefined);
    paintLoop(frame, loop, config, this.palette);
  }
}

/*
* Funcionalidad: SweepCanvas
* Descripción: Raw canvas renderer for N stacked live waveform channels read from a WaveformRingBuffer (not React state), in sweep (erase bar) or scroll mode, with a configurable window and fixed or auto y-ranges. `frozen` captures a snapshot and stops consuming data; on the frozen trace a measurement cursor follows the pointer or the arrow keys (the canvas becomes a slider) and a visual readout lists the time and every channel value with units. Depends on React, the sweep painter, waveform-geometry and the console tokens. v1.1: the readout is no longer aria-live (the slider's aria-valuetext and aria-describedby carry it), PageUp/PageDown move 10 % of the window, the readout is re-placed on resize while frozen, and a sweep-mode snapshot starts after the erase gap. v1.2 (W3, Bloque 1): `playbackDelayMs` draws the live trace by time, that delay behind the newest sample (see the playback clock), so it advances on every frame between data batches; 0 (default) draws up to the newest sample.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { cx } from "@shared/lib/class-names";
import type { WaveformRingBuffer } from "./waveform-ring-buffer";
import { findNearestIndex, formatCursorReadout, pixelToTime } from "./waveform-geometry";
import type { WaveformDisplayMode } from "./waveform-geometry";
import { SweepPainter, captureFrozenSweep, computeSweepLayout, timeToX } from "./sweep-painter";
import type { FrozenSweep, SweepChannel, SweepConfig } from "./sweep-painter";
import { useWaveformRenderer } from "./use-waveform-renderer";
import styles from "./UI/sweep-canvas.module.css";

export type SweepCanvasProps<C extends string> = {
  buffer: WaveformRingBuffer<C>
  channels: readonly SweepChannel<C>[]
  /** Accessible name of the chart, e.g. "Curvas de presión, flujo y volumen". */
  label: string
  windowSeconds?: number
  mode?: WaveformDisplayMode
  frozen?: boolean
  /** Frames per second cap of the renderer; DISPLAY_REFRESH_FPS draws on every animation frame. */
  fps?: number
  /** Live trace delay behind the newest sample in ms (DEFAULT_PLAYBACK_DELAY_MS for batched live sources); 0 = none. */
  playbackDelayMs?: number
  className?: string
};

type FreezeState<C extends string> = {
  frozen: boolean
  snapshot: FrozenSweep<C> | null
  cursor: number
};

type CanvasSize = { width: number, height: number };

const KEY_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1 };
const PAGE_STEPS: Record<string, number> = { PageUp: 1, PageDown: -1 };
/** PageUp/PageDown move the cursor by this fraction of the frozen window. */
const PAGE_FRACTION = 0.1;

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length - 1);
}

export function SweepCanvas<C extends string>({
  buffer,
  channels,
  label,
  windowSeconds = 10,
  mode = "sweep",
  frozen = false,
  fps,
  playbackDelayMs = 0,
  className,
}: SweepCanvasProps<C>) {
  const readoutId = useId();
  const config = useMemo<SweepConfig<C>>(() => ({ channels, windowMs: windowSeconds * 1000, mode }), [channels, windowSeconds, mode]);
  const [freeze, setFreeze] = useState<FreezeState<C>>({ frozen: false, snapshot: null, cursor: -1 });
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const painterRef = useRef<SweepPainter<C> | null>(null);
  const readoutRef = useRef<HTMLParagraphElement | null>(null);

  if (freeze.frozen !== frozen) {
    const plotWidth = size.width > 0 ? computeSweepLayout(size.width, size.height, channels.length).plot.width : 0;
    const snapshot = frozen ? captureFrozenSweep(buffer, config, plotWidth) : null;
    setFreeze({ frozen, snapshot, cursor: snapshot ? snapshot.window.length - 1 : -1 });
  }

  const { canvasRef, invalidate } = useWaveformRenderer({
    fps,
    onResize: (width, height) => {
      setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    },
    onFrame: (frame) => {
      painterRef.current ??= new SweepPainter<C>();

      if (freeze.snapshot) {
        painterRef.current.paintFrozen(frame, freeze.snapshot, freeze.cursor, config);
      } else {
        painterRef.current.paintLive(frame, buffer, config, playbackDelayMs);
      }
    },
  });

  useEffect(() => {
    invalidate();
  }, [config, freeze, buffer, invalidate]);

  const { snapshot, cursor } = freeze;
  const cursorTime = snapshot?.window.t[cursor];

  // Re-placed whenever the cursor moves or the canvas resizes while frozen (`size` comes from the renderer).
  useEffect(() => {
    const readout = readoutRef.current;
    const canvas = canvasRef.current;

    if (!readout || !canvas || !snapshot || cursorTime === undefined) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const { plot } = computeSweepLayout(rect.width, rect.height, config.channels.length);
    const x = timeToX(cursorTime, config, snapshot.latestMs, plot);
    readout.style.setProperty("--vl-waveform-cursor-x", `${x.toFixed(1)}px`);
    readout.setAttribute("data-side", x > rect.width / 2 ? "left" : "right");
  }, [canvasRef, config, snapshot, cursorTime, size]);

  const moveCursor = (index: number): void => {
    setFreeze((previous) => previous.snapshot && previous.snapshot.window.length > 0
      ? { ...previous, cursor: clampIndex(index, previous.snapshot.window.length) }
      : previous);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (!snapshot || !Number.isFinite(event.clientX)) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const { plot } = computeSweepLayout(rect.width, rect.height, channels.length);
    const time = pixelToTime(event.clientX - rect.left, plot, config.windowMs, snapshot.latestMs, mode);
    moveCursor(findNearestIndex(snapshot.window.t, snapshot.window.length, time));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>): void => {
    if (!snapshot) {
      return;
    }

    const step = KEY_STEPS[event.key];
    const page = PAGE_STEPS[event.key];

    if (step !== undefined) {
      moveCursor(cursor + step * (event.shiftKey ? 10 : 1));
    } else if (page !== undefined) {
      moveCursor(cursor + page * Math.max(1, Math.round(snapshot.window.length * PAGE_FRACTION)));
    } else if (event.key === "Home") {
      moveCursor(0);
    } else if (event.key === "End") {
      moveCursor(snapshot.window.length - 1);
    } else {
      return;
    }

    event.preventDefault();
  };

  const readout = snapshot && cursorTime !== undefined
    ? formatCursorReadout(cursorTime, channels.map((channel) => ({
      label: channel.label,
      unit: channel.unit,
      value: snapshot.window.values[channel.key][cursor] ?? Number.NaN,
    })))
    : null;

  // One canvas element in both states: remounting it would detach the render loop.
  const cursorProps = snapshot
    ? {
      "role": "slider",
      "tabIndex": 0,
      "aria-label": `${label} (congelado): cursor de medición`,
      "aria-valuemin": 0,
      "aria-valuemax": Math.max(0, snapshot.window.length - 1),
      "aria-valuenow": Math.max(0, cursor),
      "aria-valuetext": readout ?? "Sin datos",
      "aria-describedby": readoutId,
      "onPointerMove": handlePointerMove,
      "onKeyDown": handleKeyDown,
    }
    : { "role": "img", "aria-label": label };

  return (
    <div className={cx(styles.root, className)}>
      <canvas ref={canvasRef} className={styles.canvas} {...cursorProps} />
      {snapshot ? <span className={styles.badge}>Congelado</span> : null}
      {/* Not aria-live: the slider's aria-valuetext already announces it, and pointermove would flood a live region. */}
      <p ref={readoutRef} id={readoutId} className={styles.readout}>
        {readout}
      </p>
    </div>
  );
}

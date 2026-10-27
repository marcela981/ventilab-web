/*
* Funcionalidad: LoopCanvas
* Descripción: Raw canvas renderer for a ventilation loop (x channel vs y channel over the last window of samples, e.g. volume vs pressure for P-V or volume vs flow for F-V) read from a WaveformRingBuffer. The consumer switches loops by passing other axes. `frozen` keeps the window captured at freeze time. Depends on React, the loop painter and the console tokens. v1.1 (W3, Bloque 1): optional `playbackDelayMs` keeps the live loop in step with the time-based sweep curves.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@shared/lib/class-names";
import type { WaveformRingBuffer, WaveformWindow } from "./waveform-ring-buffer";
import { LoopPainter, readLoopWindow } from "./loop-painter";
import type { LoopAxis, LoopConfig } from "./loop-painter";
import { useWaveformRenderer } from "./use-waveform-renderer";
import styles from "./UI/sweep-canvas.module.css";

export type LoopCanvasProps<C extends string> = {
  buffer: WaveformRingBuffer<C>
  x: LoopAxis<C>
  y: LoopAxis<C>
  /** CSS custom property name of the loop color, e.g. `--vl-console-curve-pressure`. */
  colorVar: string
  /** Accessible name, e.g. "Bucle presión-volumen". */
  label: string
  /** Seconds of history drawn; about one or two breaths. */
  windowSeconds?: number
  frozen?: boolean
  fps?: number
  /** Live loop delay behind the newest sample in ms, in step with the sweep curves; 0 = none. */
  playbackDelayMs?: number
  className?: string
};

type LoopFreeze<C extends string> = { frozen: boolean, window: WaveformWindow<C> | null };

export function LoopCanvas<C extends string>({
  buffer,
  x,
  y,
  colorVar,
  label,
  windowSeconds = 4,
  frozen = false,
  fps,
  playbackDelayMs = 0,
  className,
}: LoopCanvasProps<C>) {
  const config = useMemo<LoopConfig<C>>(() => ({ x, y, colorVar, windowMs: windowSeconds * 1000 }), [x, y, colorVar, windowSeconds]);
  const [freeze, setFreeze] = useState<LoopFreeze<C>>({ frozen: false, window: null });
  const painterRef = useRef<LoopPainter<C> | null>(null);

  if (freeze.frozen !== frozen) {
    setFreeze({ frozen, window: frozen ? readLoopWindow(buffer, config.windowMs) : null });
  }

  const { canvasRef, invalidate } = useWaveformRenderer({
    fps,
    onFrame: (frame) => {
      painterRef.current ??= new LoopPainter<C>();

      if (freeze.window) {
        painterRef.current.paintFrozen(frame, freeze.window, config);
      } else {
        painterRef.current.paintLive(frame, buffer, config, playbackDelayMs);
      }
    },
  });

  useEffect(() => {
    invalidate();
  }, [config, freeze, buffer, invalidate]);

  return (
    <div className={cx(styles.loopRoot, className)}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={freeze.window ? `${label} (congelado)` : label} />
    </div>
  );
}

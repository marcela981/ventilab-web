/*
* Funcionalidad: useWaveformRenderer
* Descripción: Canvas plumbing shared by SweepCanvas and LoopCanvas: a requestAnimationFrame loop throttled to a target fps, devicePixelRatio-aware backing store sized by a ResizeObserver, and a `full` flag that tells the frame callback when it must repaint everything (first frame, resize, DPR change, explicit invalidate). Also resolves canvas colors and fonts from CSS custom properties of the canvas element. Depends on React only; degrades to a no-op when there is no 2D context (jsdom).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

export const DEFAULT_WAVEFORM_FPS = 30;

/** One frame handed to the draw callback. Sizes are CSS pixels; the context is already DPR-scaled. */
export type WaveformRenderFrame = {
  ctx: CanvasRenderingContext2D
  canvas: HTMLCanvasElement
  width: number
  height: number
  full: boolean
  now: number
};

export type WaveformRendererOptions = {
  onFrame: (frame: WaveformRenderFrame) => void
  fps?: number | undefined
};

export type WaveformRenderer = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  invalidate: () => void
};

export function useWaveformRenderer({ onFrame, fps = DEFAULT_WAVEFORM_FPS }: WaveformRendererOptions): WaveformRenderer {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onFrameRef = useRef(onFrame);
  const dirtyRef = useRef(true);

  useLayoutEffect(() => {
    onFrameRef.current = onFrame;
  });

  const invalidate = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;

    if (!canvas || !ctx || typeof requestAnimationFrame !== "function") {
      return undefined;
    }

    let width = 0;
    let height = 0;
    let dpr = 0;
    let last = Number.NEGATIVE_INFINITY;
    let handle = 0;
    const interval = 1000 / Math.max(1, fps);

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirtyRef.current = true;
    };

    const tick = (now: number): void => {
      handle = requestAnimationFrame(tick);

      // Small tolerance so a 60 Hz display reliably lands on every second frame at 30 fps.
      if (now - last < interval - 2) {
        return;
      }

      last = now;

      if ((window.devicePixelRatio || 1) !== dpr) {
        resize();
      }

      if (width <= 0 || height <= 0) {
        return;
      }

      const full = dirtyRef.current;
      dirtyRef.current = false;
      onFrameRef.current({ ctx, canvas, width, height, full, now });
    };

    resize();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);
    handle = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(handle);
      observer?.disconnect();
    };
  }, [fps]);

  return { canvasRef, invalidate };
}

/**
 * Resolves a CSS custom property of `canvas` (e.g. `--vl-console-curve-pressure`) to a value the
 * canvas accepts. An empty or unparsable value falls back to the element's computed text color.
 */
export function resolveCanvasColor(ctx: CanvasRenderingContext2D, styles: CSSStyleDeclaration, name: string): string {
  const raw = styles.getPropertyValue(name).trim();
  ctx.fillStyle = styles.color;

  if (raw) {
    ctx.fillStyle = raw;
  }

  return String(ctx.fillStyle);
}

/** Canvas font from the element's computed font size and family (set by the CSS module). */
export function resolveCanvasFont(styles: CSSStyleDeclaration): string {
  return `${styles.fontSize || "11px"} ${styles.fontFamily || "sans-serif"}`;
}

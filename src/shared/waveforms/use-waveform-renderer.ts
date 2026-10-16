/*
* Funcionalidad: useWaveformRenderer
* Descripción: Canvas plumbing shared by SweepCanvas and LoopCanvas: a requestAnimationFrame loop throttled to a target fps, devicePixelRatio-aware backing store sized by a ResizeObserver, and a `full` flag that tells the frame callback when it must repaint everything (first frame, resize, DPR change, explicit invalidate). Also resolves canvas colors and fonts from CSS custom properties of the canvas element. Depends on React only; degrades to a no-op when there is no 2D context (jsdom). v1.1: a theme change (`data-theme` on <html> or `prefers-color-scheme`) forces a full repaint so painters re-read their palette, and `onResize` reports the canvas CSS size.
* Versión: 1.1
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
  /** Called with the canvas CSS size after every backing-store resize. */
  onResize?: ((width: number, height: number) => void) | undefined
  fps?: number | undefined
};

/** Marks the canvas dirty when the app theme (`data-theme` on <html>) or the OS color scheme changes. */
function watchTheme(onChange: () => void): () => void {
  const observer = typeof MutationObserver === "function" ? new MutationObserver(onChange) : null;
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  media?.addEventListener("change", onChange);

  return () => {
    observer?.disconnect();
    media?.removeEventListener("change", onChange);
  };
}

export type WaveformRenderer = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  invalidate: () => void
};

export function useWaveformRenderer({ onFrame, onResize, fps = DEFAULT_WAVEFORM_FPS }: WaveformRendererOptions): WaveformRenderer {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onFrameRef = useRef(onFrame);
  const onResizeRef = useRef(onResize);
  const dirtyRef = useRef(true);

  useLayoutEffect(() => {
    onFrameRef.current = onFrame;
    onResizeRef.current = onResize;
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
      onResizeRef.current?.(width, height);
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
    const unwatchTheme = watchTheme(() => {
      dirtyRef.current = true;
    });
    handle = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(handle);
      observer?.disconnect();
      unwatchTheme();
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

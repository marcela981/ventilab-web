/*
 * Funcionalidad: perfInstrumentation (DEV)
 * Descripción: Instrumentación de rendimiento para desarrollo. Cuenta re-renders
 *   por componente y por segundo, y registra el crecimiento del heap JS. Aislado
 *   bajo flag de dev (NEXT_PUBLIC_DEV_PERF_HUD); apagado por defecto en producción.
 *   useRenderCount() es un no-op sin efecto cuando la flag está apagada.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { useEffect } from 'react';

export const PERF_HUD_ENABLED =
  process.env.NEXT_PUBLIC_DEV_PERF_HUD === '1';

// Conteo acumulado de renders por componente (sólo dev).
const renderCounts = new Map<string, number>();
let lastReport = 0;
let heapLogTimer: ReturnType<typeof setInterval> | null = null;

/** Vuelca a consola los renders acumulados (renders/seg) y resetea el mapa. */
function flushRenderReport(): void {
  const now = Date.now();
  if (now - lastReport < 1000) return;
  lastReport = now;
  const snapshot: Record<string, number> = {};
  renderCounts.forEach((count, key) => {
    snapshot[key] = count;
  });
  renderCounts.clear();
  console.log('[perf] renders/seg', snapshot);
}

/**
 * Cuenta cada commit (re-render efectivo) del componente que la invoca. Cada
 * ~1 s vuelca a consola los renders/seg de todos los componentes instrumentados.
 * El conteo ocurre en un efecto (fuera del render) para no introducir efectos
 * secundarios durante el render. No-op cuando la flag de dev está apagada.
 */
export function useRenderCount(name: string): void {
  // Hook siempre llamado (reglas de hooks); el efecto no hace nada sin flag.
  useEffect(() => {
    if (!PERF_HUD_ENABLED) return;
    renderCounts.set(name, (renderCounts.get(name) ?? 0) + 1);
    flushRenderReport();
  });
}

interface PerformanceWithMemory extends Performance {
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
}

/**
 * Arranca un log periódico del heap JS (Chrome). Devuelve función de parada.
 * No-op si la flag está apagada o el navegador no expone performance.memory.
 */
export function startHeapLogging(intervalMs = 5000): () => void {
  if (!PERF_HUD_ENABLED || heapLogTimer) return () => {};
  const perf = (typeof performance !== 'undefined'
    ? (performance as PerformanceWithMemory)
    : undefined);
  if (!perf?.memory) return () => {};

  const t0 = Date.now();
  const heap0 = perf.memory.usedJSHeapSize;
  heapLogTimer = setInterval(() => {
    const used = perf.memory!.usedJSHeapSize;
    console.log(
      `[perf] heap +${Math.round((Date.now() - t0) / 1000)}s: ` +
        `${(used / 1048576).toFixed(1)} MB (Δ ${((used - heap0) / 1048576).toFixed(1)} MB)`,
    );
  }, intervalMs);

  return () => {
    if (heapLogTimer) {
      clearInterval(heapLogTimer);
      heapLogTimer = null;
    }
  };
}

/** Hook de conveniencia: arranca/para el log de heap con el ciclo de vida. */
export function useHeapLogging(): void {
  useEffect(() => {
    const stop = startHeapLogging();
    return stop;
  }, []);
}

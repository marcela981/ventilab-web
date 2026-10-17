/*
* Funcionalidad: Telemetry latency
* Descripción: Pure display-path latency of the live telemetry. Each `ventilator:telemetry` batch carries the server time it was flushed (`serverTs`); its latency is (client now + server clock offset) − serverTs, the offset being measured at the midpoint of an API request (shared server-clock), so a browser clock that is ahead or behind does not distort it. A small negative result is the residual error of the offset and is shown as 0. Levels against the 100 ms threshold of the thesis requirement: ok below 70 % of it (70 ms, a margin to react before the limit), warning from 70 ms up to the threshold, critical from 100 ms. The tracker keeps the latest value and the nearest-rank p95 of EVERY batch of the session in a bounded histogram (1 ms bins up to LATENCY_HISTOGRAM_MAX_MS, one overflow bin reported with the largest value seen, so a slow tail is never under-reported); memory is constant whatever the session length. v1.1 (T6 review fix S3): session-wide p95 (was a ~2 min rolling window, while the copy said "p95 de la sesión"). No dependencies.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const LATENCY_THRESHOLD_MS = 100;
/** Yellow band: from 70 % of the threshold. */
export const LATENCY_WARNING_RATIO = 0.7;
export const LATENCY_WARNING_MS = Math.round(LATENCY_THRESHOLD_MS * LATENCY_WARNING_RATIO);
/** Upper bound of the 1 ms session histogram; slower batches share one overflow bin. */
export const LATENCY_HISTOGRAM_MAX_MS = 2000;

export type LatencyLevel = "ok" | "warning" | "critical" | "unknown";

export type LatencySnapshot = {
  currentMs: number | null
  p95Ms: number | null
  /** Batches measured in this session (not capped by the window). */
  count: number
};

/** Latency of one batch on the server clock; null for an invalid timestamp. */
export function batchLatencyMs(serverTs: number, clientNowMs: number, offsetMs: number): number | null {
  if (!Number.isFinite(serverTs) || !Number.isFinite(clientNowMs) || !Number.isFinite(offsetMs)) {
    return null;
  }

  return Math.max(0, Math.round(clientNowMs + offsetMs - serverTs));
}

export function latencyLevel(latencyMs: number | null): LatencyLevel {
  if (latencyMs === null) {
    return "unknown";
  }

  if (latencyMs >= LATENCY_THRESHOLD_MS) {
    return "critical";
  }

  return latencyMs >= LATENCY_WARNING_MS ? "warning" : "ok";
}

/** Nearest-rank percentile (p in (0, 1]); null for no values. */
export function nearestRankPercentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil(p * sorted.length)));

  return sorted[rank - 1] ?? null;
}

export type LatencyTracker = {
  push: (latencyMs: number) => void
  snapshot: () => LatencySnapshot
  reset: () => void
};

/** Session-wide tracker: a histogram of 1 ms bins (0..maxMs) plus an overflow bin, no allocation per push. */
export function createLatencyTracker(maxMs: number = LATENCY_HISTOGRAM_MAX_MS): LatencyTracker {
  const top = Math.max(1, Math.floor(maxMs));
  const overflowBin = top + 1;
  let bins = new Uint32Array(top + 2);
  let count = 0;
  let current: number | null = null;
  let largest = 0;

  const p95 = (): number | null => {
    if (count === 0) {
      return null;
    }

    const rank = Math.min(count, Math.max(1, Math.ceil(0.95 * count)));
    let seen = 0;

    for (let bin = 0; bin < bins.length; bin += 1) {
      seen += bins[bin] ?? 0;

      if (seen >= rank) {
        return bin === overflowBin ? largest : bin;
      }
    }

    return largest;
  };

  return {
    push(latencyMs) {
      const value = Math.max(0, Math.round(latencyMs));
      const bin = Math.min(overflowBin, value);

      bins[bin] = (bins[bin] ?? 0) + 1;
      count += 1;
      current = latencyMs;
      largest = Math.max(largest, value);
    },
    snapshot() {
      return { currentMs: current, p95Ms: p95(), count };
    },
    reset() {
      bins = new Uint32Array(top + 2);
      count = 0;
      current = null;
      largest = 0;
    },
  };
}

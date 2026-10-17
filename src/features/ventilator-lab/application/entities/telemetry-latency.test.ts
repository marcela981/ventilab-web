/*
* Funcionalidad: Telemetry latency tests
* Descripción: The display-path latency of a telemetry batch is (client now + server clock offset) − batch serverTs, so a skewed browser clock does not distort it; the level is green below 70 % of the 100 ms threshold, yellow up to it and red from it; the p95 uses the nearest rank over every batch of the session (bounded 1 ms histogram). v1.1 (T6 review fix S3): session-wide p95 instead of a rolling window. Depends on vitest and the telemetry latency entity.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  batchLatencyMs,
  createLatencyTracker,
  LATENCY_HISTOGRAM_MAX_MS,
  LATENCY_THRESHOLD_MS,
  LATENCY_WARNING_MS,
  latencyLevel,
  nearestRankPercentile,
} from "./telemetry-latency";

const SERVER_TS = 1_000_000;

describe("batchLatencyMs", () => {
  it("measures the delay on the server clock, cancelling the browser clock skew", () => {
    // Batch sent at server 1 000 000, received 40 ms later. The browser clock is 5 s behind the server.
    const clientNow = SERVER_TS + 40 - 5_000;

    expect(batchLatencyMs(SERVER_TS, clientNow, 5_000)).toBe(40);
    // Without the offset the skew would hide the delay (-4960 ms, clamped to 0).
    expect(batchLatencyMs(SERVER_TS, clientNow, 0)).toBe(0);
    // A browser 3 s ahead: 85 ms with the offset, 3085 ms without it.
    expect(batchLatencyMs(SERVER_TS, SERVER_TS + 85 + 3_000, -3_000)).toBe(85);
    expect(batchLatencyMs(SERVER_TS, SERVER_TS + 85 + 3_000, 0)).toBe(3_085);
  });

  it("clamps the residual offset error to zero and rejects invalid timestamps", () => {
    expect(batchLatencyMs(SERVER_TS, SERVER_TS - 12, 0)).toBe(0);
    expect(batchLatencyMs(Number.NaN, SERVER_TS, 0)).toBeNull();
  });
});

describe("latencyLevel", () => {
  it("is green below 70 % of the threshold, yellow up to it and red from it", () => {
    expect(LATENCY_THRESHOLD_MS).toBe(100);
    expect(LATENCY_WARNING_MS).toBe(70);
    expect(latencyLevel(0)).toBe("ok");
    expect(latencyLevel(69)).toBe("ok");
    expect(latencyLevel(70)).toBe("warning");
    expect(latencyLevel(99)).toBe("warning");
    expect(latencyLevel(100)).toBe("critical");
    expect(latencyLevel(null)).toBe("unknown");
  });
});

describe("nearestRankPercentile", () => {
  it("returns the nearest-rank value", () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1);

    expect(nearestRankPercentile(values, 0.95)).toBe(95);
    expect(nearestRankPercentile([5], 0.95)).toBe(5);
    expect(nearestRankPercentile([30, 10, 20], 0.95)).toBe(30);
    expect(nearestRankPercentile([], 0.95)).toBeNull();
  });
});

describe("createLatencyTracker", () => {
  it("keeps the current value and the p95 of the session", () => {
    const tracker = createLatencyTracker();

    expect(tracker.snapshot()).toEqual({ currentMs: null, p95Ms: null, count: 0 });

    for (let index = 1; index <= 20; index += 1) {
      tracker.push(index * 10);
    }

    // 20 values 10..200: rank ceil(0.95 × 20) = 19 → 190.
    expect(tracker.snapshot()).toEqual({ currentMs: 200, p95Ms: 190, count: 20 });
  });

  it("keeps the p95 of the WHOLE session, not of a rolling window", () => {
    const tracker = createLatencyTracker();

    // 1 000 slow batches at the start of the session, then 9 000 fast ones (5 minutes at 30 batches/s).
    for (let index = 0; index < 1_000; index += 1) {
      tracker.push(150);
    }

    for (let index = 0; index < 9_000; index += 1) {
      tracker.push(20);
    }

    // rank ceil(0.95 × 10 000) = 9 500 → one of the slow batches; a ~2 min window would have forgotten them (20 ms).
    expect(tracker.snapshot()).toEqual({ currentMs: 20, p95Ms: 150, count: 10_000 });
  });

  it("counts latencies above the histogram range in one bin reported with the largest value seen", () => {
    const tracker = createLatencyTracker(100);

    [10, 20, 400, 900].forEach((value) => tracker.push(value));

    // rank ceil(0.95 × 4) = 4 → the overflow bin, reported as the largest value seen (never under-reported).
    expect(tracker.snapshot()).toEqual({ currentMs: 900, p95Ms: 900, count: 4 });
    expect(LATENCY_HISTOGRAM_MAX_MS).toBeGreaterThanOrEqual(1_000);
  });

  it("restarts", () => {
    const tracker = createLatencyTracker();

    tracker.push(50);
    tracker.reset();

    expect(tracker.snapshot()).toEqual({ currentMs: null, p95Ms: null, count: 0 });
  });
});

/*
* Funcionalidad: useReplaySession tests
* Descripción: Verifies that a new replay source (a new object for the same session, as a refetch produces) never
*   reuses the frame source id or the playback state of the previous run: the seek generation keeps growing across
*   effect runs, and the new run publishes a fresh "starting" playback at time 0 before its first batch. Fake worker
*   clients stand in for the Web Worker (jsdom has none). Depends on vitest, Testing Library and the simulator test
*   helpers. v1.1 (W2, Bloque 1): the adapter is a store (read through getSnapshot); a ×8 replay with a metrics
*   snapshot in every 30 Hz batch publishes at most one store snapshot per UI refresh window (≤ 4 per second) and keeps
*   the adapter identity.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { replay } from "@shared/sim-engine";
import { buildBatch, buildEngineCase, createFakeWorker } from "../session/sim-session-test-helpers";
import type { FakeWorker } from "../session/sim-session-test-helpers";
import { useReplaySession } from "./use-replay-session";
import type { ReplaySource } from "./use-replay-session";

function buildSource(): ReplaySource {
  return { sessionId: "s1", engineCase: buildEngineCase(), seed: 42, timeMultiplier: 1, events: [], durationMs: 8000 };
}

describe("useReplaySession", () => {
  it("gives a new source a new frame source id and a fresh starting playback", () => {
    const workers: FakeWorker[] = [];
    const createWorker = () => {
      const worker = createFakeWorker();

      workers.push(worker);

      return worker;
    };
    const { result, rerender } = renderHook(({ source }) => useReplaySession(source, { createWorker, now: () => 0 }), {
      initialProps: { source: buildSource() },
    });

    act(() => workers.at(-1)?.emit({ type: "ready", engineVersion: "1.0.0" }));
    act(() => workers.at(-1)?.emit({ type: "batch", batch: buildBatch({ simTimeMs: 3000, status: "running" }) }));

    const firstSourceId = result.current.adapter?.getSnapshot().frames.sourceId;

    expect(result.current.simTimeMs).toBe(3000);
    expect(result.current.status).toBe("playing");

    rerender({ source: buildSource() });

    expect(workers.length).toBeGreaterThanOrEqual(2);
    expect(result.current.status).toBe("starting");
    expect(result.current.simTimeMs).toBe(0);
    expect(result.current.adapter?.getSnapshot().frames.sourceId).not.toBe(firstSourceId);

    // The generation kept growing across the effect runs instead of restarting at 1.
    expect(result.current.adapter?.getSnapshot().frames.sourceId).toBe(`s1:replay:${result.current.seekGeneration}`);
    expect(result.current.seekGeneration).toBeGreaterThan(1);
  });

  it("publishes at most one snapshot per UI refresh window under 30 Hz batches that all carry metrics (×8)", () => {
    vi.useFakeTimers();

    try {
      const worker = createFakeWorker();
      const source = buildSource();
      const { result } = renderHook(() => useReplaySession(source, { createWorker: () => worker }));
      const { final: metrics } = replay(buildEngineCase(), 42, [], 2000);

      act(() => worker.emit({ type: "ready", engineVersion: "1.0.0" }));

      const adapter = result.current.adapter;
      const published = vi.fn();

      adapter?.subscribe(published);

      // 2 s of wall time at 30 Hz; at ×8 every batch carries a metrics snapshot.
      act(() => {
        for (let tick = 1; tick <= 60; tick += 1) {
          worker.emit({ type: "batch", batch: buildBatch({ simTimeMs: tick * 100, status: "running", metrics }) });
          vi.advanceTimersByTime(33);
        }
      });
      act(() => vi.advanceTimersByTime(250));

      // One publish for the status change, then at most one per 250 ms window (the trailing one included).
      expect(published.mock.calls.length).toBeLessThanOrEqual(1 + Math.ceil((60 * 33 + 250) / 250));
      expect(published.mock.calls.length).toBeGreaterThanOrEqual(4);
      expect(result.current.adapter).toBe(adapter);
      expect(result.current.simTimeMs).toBe(6000);
      expect(result.current.adapter?.getSnapshot().patient.values.spo2).toBe(metrics.gasExchange.spo2Percent);
    } finally {
      vi.useRealTimers();
    }
  });
});

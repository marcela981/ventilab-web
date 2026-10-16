/*
* Funcionalidad: useReplaySession tests
* Descripción: Verifies that a new replay source (a new object for the same session, as a refetch produces) never
*   reuses the frame source id or the playback state of the previous run: the seek generation keeps growing across
*   effect runs, and the new run publishes a fresh "starting" playback at time 0 before its first batch. Fake worker
*   clients stand in for the Web Worker (jsdom has none). Depends on vitest, Testing Library and the simulator test
*   helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

    const firstSourceId = result.current.adapter?.frames.sourceId;

    expect(result.current.simTimeMs).toBe(3000);
    expect(result.current.status).toBe("playing");

    rerender({ source: buildSource() });

    expect(workers.length).toBeGreaterThanOrEqual(2);
    expect(result.current.status).toBe("starting");
    expect(result.current.simTimeMs).toBe(0);
    expect(result.current.adapter?.frames.sourceId).not.toBe(firstSourceId);

    // The generation kept growing across the effect runs instead of restarting at 1.
    expect(result.current.adapter?.frames.sourceId).toBe(`s1:replay:${result.current.seekGeneration}`);
    expect(result.current.seekGeneration).toBeGreaterThan(1);
  });
});

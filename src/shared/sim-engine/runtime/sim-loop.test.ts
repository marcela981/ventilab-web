/*
* Funcionalidad: Fixed-step simulation loop tests
* Descripción: Verifies the pure simulation loop: simulated time follows wall time × multiplier with a carried
*   remainder, a long gap is caught up in bounded chunks without losing or inventing time, pause stops time, the
*   multiplier change converts elapsed time at the previous rate, and events are applied at their exact simulated
*   time (matching the engine replay). Uses a manual clock. Depends on vitest and the vendored engine.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { replay } from "../engine/simulation";
import { createSimLoop, type SimBatch } from "./sim-loop";
import { buildTestCase, createManualClock } from "./sim-test-helpers";

const SEED = 42;

function setup(options: { multiplier?: 1 | 2 | 4; maxCatchUpMsPerTick?: number } = {}) {
  const clock = createManualClock(1000);
  const loop = createSimLoop(buildTestCase(), SEED, { clock, ...options });

  return { clock, loop };
}

/** Ticks without new wall time until the backlog is consumed; returns every batch. */
function tickUntilCaughtUp(loop: ReturnType<typeof createSimLoop>): SimBatch[] {
  const batches = [loop.tick()];

  while ((batches.at(-1)?.backlogMs ?? 0) > 0 && batches.length < 1000) {
    batches.push(loop.tick());
  }

  return batches;
}

describe("createSimLoop time base", () => {
  it("does not advance before start", () => {
    const { clock, loop } = setup();

    clock.advance(5000);

    expect(loop.tick().simTimeMs).toBe(0);
    expect(loop.status).toBe("idle");
  });

  it("advances wall delta × multiplier in fixed steps and carries the remainder", () => {
    const { clock, loop } = setup({ multiplier: 2 });

    loop.start();
    clock.advance(1000);
    expect(loop.tick().simTimeMs).toBe(2000);

    clock.advance(7.5); // 15 ms of simulated time: one 10 ms step, 5 ms carried
    const partial = loop.tick();

    expect(partial.simTimeMs).toBe(2010);
    expect(partial.backlogMs).toBe(5);

    clock.advance(2.5); // 5 more ms complete the carried step
    expect(loop.tick().simTimeMs).toBe(2020);
  });

  it("catches up a 60 s gap in bounded chunks with no loss and no invented time", () => {
    const { clock, loop } = setup({ multiplier: 2, maxCatchUpMsPerTick: 2000 });

    loop.start();
    clock.advance(60_000);

    const batches: SimBatch[] = [];
    let batch = loop.tick();

    batches.push(batch);
    expect(batch.simTimeMs).toBe(2000);
    expect(batch.backlogMs).toBe(118_000);

    while (batch.backlogMs > 0 && batches.length < 1000) {
      batch = loop.tick();
      batches.push(batch);
    }

    expect(batches).toHaveLength(60);
    expect(batches.every((b, i) => b.simTimeMs === (i + 1) * 2000)).toBe(true);
    expect(loop.simTimeMs).toBe(120_000);

    // Further ticks without wall time do not invent time.
    expect(loop.tick().simTimeMs).toBe(120_000);

    // Draining every tick keeps the waveform ring from overflowing: 50 Hz over 120 s.
    const samples = batches.reduce((total, b) => total + b.samples.length, 0);
    const dropped = batches.reduce((total, b) => total + b.droppedSamples, 0);

    expect(dropped).toBe(0);
    expect(samples).toBe(6000);
  });

  it("stops time while paused and resumes from the resume instant", () => {
    const { clock, loop } = setup();

    loop.start();
    clock.advance(1000);
    loop.pause();
    clock.advance(5000);
    expect(loop.tick().simTimeMs).toBe(1000);
    expect(loop.status).toBe("paused");

    loop.resume();
    clock.advance(500);
    expect(loop.tick().simTimeMs).toBe(1500);
  });

  it("converts the time elapsed before a multiplier change at the previous multiplier", () => {
    const { clock, loop } = setup();

    loop.start();
    clock.advance(1000);
    loop.setMultiplier(4);
    clock.advance(1000);

    expect(tickUntilCaughtUp(loop).at(-1)?.simTimeMs).toBe(5000);
    expect(loop.multiplier).toBe(4);
  });

  it("does not advance after stop", () => {
    const { clock, loop } = setup();

    loop.start();
    clock.advance(1000);
    loop.tick();
    loop.stop();
    clock.advance(3000);

    const batch = loop.tick();

    expect(batch.simTimeMs).toBe(1000);
    expect(batch.status).toBe("stopped");
  });
});

describe("createSimLoop events", () => {
  it("applies a scheduled event at its exact simulated time, matching the engine replay", () => {
    const { clock, loop } = setup();
    const changes = { peepCmH2O: 8 };

    loop.start();
    loop.queueEvent({ type: "PARAM_CHANGE", simTimeMs: 1500, changes });
    clock.advance(3000);

    const batches = tickUntilCaughtUp(loop);
    const expected = replay(buildTestCase(), SEED, [{ type: "PARAM_CHANGE", simTimeMs: 1500, changes }], 3000);

    expect(batches.flatMap((batch) => batch.appliedEvents)).toEqual([{ type: "PARAM_CHANGE", simTimeMs: 1500, changes }]);
    expect(batches.at(-1)?.simTimeMs).toBe(3000);
    expect(batches.at(-1)?.metrics).toEqual(expected.final);
  });

  it("stamps an unscheduled event with the current simulated time", () => {
    const { clock, loop } = setup();

    loop.start();
    clock.advance(1000);
    loop.tick();
    loop.queueEvent({ type: "PARAM_CHANGE", changes: { fio2: 0.6 } });

    const batch = loop.tick();

    expect(batch.appliedEvents).toEqual([{ type: "PARAM_CHANGE", simTimeMs: 1000, changes: { fio2: 0.6 } }]);
    expect(batch.metrics).not.toBeNull();
  });

  it("reports an event the engine rejects instead of throwing", () => {
    const { loop } = setup();
    const event = { type: "PARAM_CHANGE", changes: { peepCmH2O: 99 } } as const;

    loop.start();
    loop.queueEvent(event);

    const batch = loop.tick();

    expect(batch.appliedEvents).toEqual([]);
    expect(batch.rejectedEvents).toHaveLength(1);
    expect(batch.rejectedEvents[0]?.event).toEqual(event);
  });

  it("emits metrics about once per simulated second", () => {
    const { clock, loop } = setup();

    loop.start();
    expect(loop.tick().metrics).not.toBeNull(); // first snapshot

    clock.advance(500);
    expect(loop.tick().metrics).toBeNull();

    clock.advance(500);
    expect(loop.tick().metrics?.simTimeMs).toBe(1000);
  });
});

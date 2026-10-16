/*
* Funcionalidad: Simulation worker host tests
* Descripción: Drives the worker-side command handler with a fake port, fake timers and a manual clock: init posts
*   ready, start schedules the ~30 Hz batch timer, ticks post batches only when they carry data, pause and stop flush,
*   and malformed or out-of-order commands become error messages. v1.1: start after stop does not re-arm the timer
*   (typed error instead), and a re-init while running clears the previous timer. v1.2: an event confirmation is posted
*   even when the batch carries nothing else. Depends on vitest and the sim-engine runtime.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "../engine/engine-version";
import type { SimWorkerMessage } from "./protocol";
import { createSimWorkerHost } from "./sim-worker-host";
import { buildTestCase, createManualClock } from "./sim-test-helpers";

function setup() {
  const clock = createManualClock();
  const posted: SimWorkerMessage[] = [];
  const timers: { handler: () => void; ms: number; cleared: boolean }[] = [];
  const host = createSimWorkerHost({
    post: (message) => posted.push(message),
    setInterval: (handler, ms) => {
      const timer = { handler, ms, cleared: false };

      timers.push(timer);

      return timer;
    },
    clearInterval: (handle) => {
      (handle as { cleared: boolean }).cleared = true;
    },
    clock,
  });

  return { clock, posted, timers, host };
}

const batches = (posted: SimWorkerMessage[]) =>
  posted.flatMap((message) => (message.type === "batch" ? [message.batch] : []));

describe("createSimWorkerHost", () => {
  it("posts ready on init and batches at about 30 Hz after start", () => {
    const { clock, posted, timers, host } = setup();

    host.handle({ type: "init", engineCase: buildTestCase(), seed: 3 });
    expect(posted).toEqual([{ type: "ready", engineVersion: ENGINE_VERSION }]);

    host.handle({ type: "start" });
    expect(timers).toHaveLength(1);
    expect(timers[0]?.ms).toBe(33);

    clock.advance(100);
    timers[0]?.handler();

    expect(batches(posted).at(-1)?.simTimeMs).toBe(100);
  });

  it("does not post an empty batch while paused and stops the timer on stop", () => {
    const { clock, posted, timers, host } = setup();

    host.handle({ type: "init", engineCase: buildTestCase(), seed: 3 });
    host.handle({ type: "start" });
    clock.advance(1000);
    host.handle({ type: "pause" });

    const afterPause = posted.length;

    expect(batches(posted).at(-1)?.status).toBe("paused");

    clock.advance(1000);
    timers[0]?.handler();
    expect(posted).toHaveLength(afterPause);

    host.handle({ type: "stop" });
    expect(batches(posted).at(-1)?.status).toBe("stopped");
    expect(timers[0]?.cleared).toBe(true);
  });

  it("forwards events to the loop", () => {
    const { clock, posted, timers, host } = setup();

    host.handle({ type: "init", engineCase: buildTestCase(), seed: 3 });
    host.handle({ type: "start" });
    host.handle({ type: "applyEvent", event: { type: "PARAM_CHANGE", changes: { peepCmH2O: 7 }, simTimeMs: 200 } });
    clock.advance(500);
    timers[0]?.handler();

    expect(batches(posted).flatMap((batch) => batch.appliedEvents)).toEqual([
      { type: "PARAM_CHANGE", simTimeMs: 200, changes: { peepCmH2O: 7 } },
    ]);
  });

  it("posts the confirmation of an event applied while paused", () => {
    const { clock, posted, timers, host } = setup();

    host.handle({ type: "init", engineCase: buildTestCase(), seed: 3 });
    host.handle({ type: "start" });
    clock.advance(300);
    timers[0]?.handler();
    host.handle({ type: "pause" });
    host.handle({ type: "applyEvent", event: { type: "PARAM_CHANGE", id: "evt-9", changes: { peepCmH2O: 7 } } });
    host.handle({ type: "stop" });

    expect(batches(posted).flatMap((batch) => batch.confirmedEvents)).toEqual([{ id: "evt-9", effectiveSimTimeMs: 300 }]);
  });

  it("answers malformed and premature commands with an error", () => {
    const { posted, host } = setup();

    host.handle({ type: "explode" });
    host.handle({ type: "start" });

    expect(posted[0]).toEqual({ type: "error", message: "Malformed simulation command" });
    expect(posted[1]).toMatchObject({ type: "error", command: "start" });
  });

  it("does not re-arm the timer on start after stop and asks for a new init", () => {
    const { posted, timers, host } = setup();

    host.handle({ type: "init", engineCase: buildTestCase(), seed: 3 });
    host.handle({ type: "start" });
    host.handle({ type: "stop" });
    host.handle({ type: "start" });

    expect(timers).toHaveLength(1);
    expect(timers.every((timer) => timer.cleared)).toBe(true);
    expect(posted.at(-1)).toEqual({
      type: "error",
      message: "The simulation is stopped; send init to start a new one",
      command: "start",
    });
  });

  it("clears the running timer on a re-init and starts a fresh one", () => {
    const { clock, posted, timers, host } = setup();

    host.handle({ type: "init", engineCase: buildTestCase(), seed: 3 });
    host.handle({ type: "start" });
    clock.advance(1000);
    timers[0]?.handler();

    host.handle({ type: "init", engineCase: buildTestCase(), seed: 4 });
    expect(timers[0]?.cleared).toBe(true);
    expect(posted.at(-1)).toEqual({ type: "ready", engineVersion: ENGINE_VERSION });

    host.handle({ type: "start" });
    expect(timers).toHaveLength(2);
    expect(timers[1]?.cleared).toBe(false);

    clock.advance(200);
    timers[1]?.handler();
    expect(batches(posted).at(-1)?.simTimeMs).toBe(200);
  });
});

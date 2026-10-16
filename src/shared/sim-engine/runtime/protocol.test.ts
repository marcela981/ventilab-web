/*
* Funcionalidad: Simulation worker protocol tests
* Descripción: Verifies that every command and worker message survives a structured clone round trip and is still
*   recognised by its type guard, and that malformed messages are rejected (v1.1: including non-finite or negative event times, a non-finite seed
*   and invalid init options). Depends on vitest, the protocol and the
*   simulation loop (to produce a real batch). v1.2 (T6): init resume options (initial events, start time). v1.3: an event
*   id is optional and must be a non-empty string of at most 64 characters.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { isSimCommand, isSimWorkerMessage, type SimCommand, type SimWorkerMessage } from "./protocol";
import { createSimLoop } from "./sim-loop";
import { buildTestCase, createManualClock } from "./sim-test-helpers";

function roundTrip<T>(value: T): T {
  return structuredClone(value);
}

describe("simulation worker protocol", () => {
  const commands: SimCommand[] = [
    { type: "init", engineCase: buildTestCase(), seed: 7, options: { multiplier: 2, metricsEveryMs: 500 } },
    { type: "start" },
    { type: "pause" },
    { type: "resume" },
    { type: "setMultiplier", multiplier: 4 },
    { type: "applyEvent", event: { type: "PARAM_CHANGE", changes: { peepCmH2O: 10 }, simTimeMs: 2000 } },
    { type: "applyEvent", event: { type: "RECONNECT" } },
    { type: "stop" },
  ];

  it.each(commands)("round-trips the $type command", (command) => {
    const cloned = roundTrip(command);

    expect(cloned).toEqual(command);
    expect(isSimCommand(cloned)).toBe(true);
  });

  it("round-trips ready, batch and error messages", () => {
    const clock = createManualClock();
    const loop = createSimLoop(buildTestCase(), 1, { clock });

    loop.start();
    clock.advance(1000);

    const messages: SimWorkerMessage[] = [
      { type: "ready", engineVersion: "1.0.0" },
      { type: "batch", batch: loop.tick() },
      { type: "error", message: "boom", command: "start" },
    ];

    for (const message of messages) {
      const cloned = roundTrip(message);

      expect(cloned).toEqual(message);
      expect(isSimWorkerMessage(cloned)).toBe(true);
    }
  });

  it("rejects malformed commands and messages", () => {
    expect(isSimCommand(null)).toBe(false);
    expect(isSimCommand({ type: "launch" })).toBe(false);
    expect(isSimCommand({ type: "init", seed: 1 })).toBe(false);
    expect(isSimCommand({ type: "setMultiplier", multiplier: 3 })).toBe(false);
    expect(isSimCommand({ type: "applyEvent", event: { type: "PARAM_CHANGE" } })).toBe(false);
    expect(isSimCommand({ type: "applyEvent", event: { type: "RECONNECT", simTimeMs: "soon" } })).toBe(false);
    expect(isSimCommand({ type: "applyEvent", event: { type: "RECONNECT", simTimeMs: Number.NaN } })).toBe(false);
    expect(isSimCommand({ type: "applyEvent", event: { type: "RECONNECT", simTimeMs: Number.POSITIVE_INFINITY } })).toBe(
      false,
    );
    expect(isSimCommand({ type: "applyEvent", event: { type: "RECONNECT", simTimeMs: -1 } })).toBe(false);
    expect(isSimCommand({ type: "applyEvent", event: { type: "RECONNECT", simTimeMs: 0 } })).toBe(true);
    expect(isSimCommand({ type: "applyEvent", event: { type: "RECONNECT", id: "evt-1" } })).toBe(true);
    expect(isSimCommand({ type: "applyEvent", event: { type: "RECONNECT", id: 7 } })).toBe(false);
    expect(isSimCommand({ type: "applyEvent", event: { type: "RECONNECT", id: "" } })).toBe(false);
    expect(isSimCommand({ type: "applyEvent", event: { type: "RECONNECT", id: "x".repeat(65) } })).toBe(false);
    expect(isSimWorkerMessage({ type: "batch", batch: { simTimeMs: 1 } })).toBe(false);
    expect(isSimWorkerMessage({ type: "ready" })).toBe(false);
    expect(isSimWorkerMessage("ready")).toBe(false);
  });

  it("rejects an init with a non-finite seed or invalid options", () => {
    const init = (fields: Record<string, unknown>) => ({ type: "init", engineCase: buildTestCase(), seed: 1, ...fields });

    expect(isSimCommand(init({}))).toBe(true);
    expect(isSimCommand(init({ seed: Number.NaN }))).toBe(false);
    expect(isSimCommand(init({ seed: Number.POSITIVE_INFINITY }))).toBe(false);
    expect(isSimCommand(init({ seed: "1" }))).toBe(false);
    expect(isSimCommand(init({ options: 5 }))).toBe(false);
    expect(isSimCommand(init({ options: { multiplier: 3 } }))).toBe(false);
    expect(isSimCommand(init({ options: { multiplier: "2" } }))).toBe(false);
    expect(isSimCommand(init({ options: { fixedStepMs: Number.NaN } }))).toBe(false);
    expect(isSimCommand(init({ options: { maxCatchUpMsPerTick: Number.POSITIVE_INFINITY } }))).toBe(false);
    expect(isSimCommand(init({ options: { metricsEveryMs: "1000" } }))).toBe(false);
    expect(isSimCommand(init({ options: { engineOptions: 1 } }))).toBe(false);
    expect(isSimCommand(init({ options: { engineOptions: { sampleRateHz: Number.NaN } } }))).toBe(false);
    expect(isSimCommand(init({ options: { engineOptions: { waveformCapacity: Number.POSITIVE_INFINITY } } }))).toBe(
      false,
    );
    expect(isSimCommand(init({ options: { engineOptions: { timeMultiplier: 3 } } }))).toBe(false);
    expect(isSimCommand(init({ options: { engineOptions: { noise: "yes" } } }))).toBe(false);
    expect(
      isSimCommand(
        init({
          options: {
            multiplier: 4,
            fixedStepMs: 10,
            maxCatchUpMsPerTick: 2000,
            metricsEveryMs: 1000,
            engineOptions: { sampleRateHz: 50, noise: false, timeMultiplier: 2, waveformCapacity: 1000 },
          },
        }),
      ),
    ).toBe(true);
  });
});

describe("init resume options (v1.2)", () => {
  const init = (options: unknown) => ({ type: "init", engineCase: buildTestCase(), seed: 1, options });

  it("accepts initial events with times and a start time", () => {
    const command = init({
      initialEvents: [{ type: "PARAM_CHANGE", simTimeMs: 100, changes: { peepCmH2O: 8 } }],
      startAtSimTimeMs: 2000,
    });

    expect(isSimCommand(roundTrip(command))).toBe(true);
  });

  it("rejects malformed initial events or start time", () => {
    expect(isSimCommand(init({ initialEvents: {} }))).toBe(false);
    expect(isSimCommand(init({ initialEvents: [{ type: "PARAM_CHANGE" }] }))).toBe(false);
    expect(isSimCommand(init({ initialEvents: [{ type: "PARAM_CHANGE", simTimeMs: -5, changes: {} }] }))).toBe(false);
    expect(isSimCommand(init({ startAtSimTimeMs: -1 }))).toBe(false);
    expect(isSimCommand(init({ startAtSimTimeMs: Number.POSITIVE_INFINITY }))).toBe(false);
  });
});

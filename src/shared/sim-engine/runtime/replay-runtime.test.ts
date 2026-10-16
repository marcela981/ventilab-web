/*
* Funcionalidad: Replay runtime tests
* Descripción: Verifies the replay additions of the simulation runtime (T8): the loop playback rate (any positive
*   finite speed, independent of the session multiplier) and its end time (the loop pauses there and never steps
*   past it), the protocol guards of setPlaybackRate, the replay request and the replayResult response, the worker
*   host round trip of a replay request (same result as the engine replay, typed error with the request id) and the
*   main-thread replay client (resolves on its own request id, rejects on its error, ignores other ids). Depends on
*   vitest, the engine replay and the sim-engine runtime. v1.1: an event exactly at the end and start == end against
*   the engine replay(untilMs); the client ignores other requests' and commands' errors, times out and aborts.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it, vi } from "vitest";
import { replay } from "../engine/simulation";
import type { EngineEvent } from "../engine/engine.types";
import type { SimWorkerClient, SimWorkerListener } from "./create-sim-worker";
import { isSimCommand, isSimWorkerMessage } from "./protocol";
import type { SimCommand, SimWorkerMessage } from "./protocol";
import { requestWorkerReplay } from "./replay-client";
import { createSimLoop } from "./sim-loop";
import { createSimWorkerHost } from "./sim-worker-host";
import { buildTestCase, createManualClock } from "./sim-test-helpers";

const EVENTS: EngineEvent[] = [{ type: "PARAM_CHANGE", simTimeMs: 2000, changes: { peepCmH2O: 8 } }];

describe("sim loop replay mode", () => {
  it("advances playbackRate simulated ms per wall ms, beyond the session multipliers", () => {
    const clock = createManualClock();
    const loop = createSimLoop(buildTestCase(), 1, { clock, playbackRate: 8 });

    loop.start();
    clock.advance(100);

    expect(loop.tick().simTimeMs).toBe(800);

    loop.setPlaybackRate(2);
    clock.advance(100);

    expect(loop.tick().simTimeMs).toBe(1000);
    expect(loop.playbackRate).toBe(2);
  });

  it("rejects a non-positive playback rate", () => {
    expect(() => createSimLoop(buildTestCase(), 1, { playbackRate: 0 })).toThrow(RangeError);
    expect(() => createSimLoop(buildTestCase(), 1).setPlaybackRate(Number.NaN)).toThrow(RangeError);
  });

  it("pauses at endAtSimTimeMs and never steps past it", () => {
    const clock = createManualClock();
    const loop = createSimLoop(buildTestCase(), 1, { clock, playbackRate: 4, endAtSimTimeMs: 1005 });

    loop.start();
    clock.advance(1000);

    const batch = loop.tick();

    expect(batch.simTimeMs).toBe(1005);
    expect(batch.status).toBe("paused");
    expect(batch.backlogMs).toBe(0);

    loop.resume();
    clock.advance(500);

    const after = loop.tick();

    expect(after.simTimeMs).toBe(1005);
    expect(after.status).toBe("paused");
  });

  it("applies the recorded events while playing, as the engine replay does", () => {
    const clock = createManualClock();
    const loop = createSimLoop(buildTestCase(), 9, { clock, playbackRate: 8, initialEvents: EVENTS, endAtSimTimeMs: 4000 });

    loop.start();

    let last = loop.tick();

    while (last.status === "running") {
      clock.advance(100);
      last = loop.tick();
    }

    const expected = replay(buildTestCase(), 9, EVENTS, 4000).final;

    expect(last.simTimeMs).toBe(4000);
    expect(last.metrics?.gasExchange).toEqual(expected.gasExchange);
    expect(last.metrics?.lastCycle).toEqual(expected.lastCycle);
  });

  function playToEnd(loop: ReturnType<typeof createSimLoop>, clock: ReturnType<typeof createManualClock>) {
    loop.start();

    let last = loop.tick();
    let metrics = last.metrics;
    const applied = [...last.appliedEvents];

    while (last.status === "running") {
      clock.advance(100);
      last = loop.tick();
      metrics = last.metrics ?? metrics;
      applied.push(...last.appliedEvents);
    }

    return { last, metrics, applied };
  }

  it("applies an event recorded exactly at endAtSimTimeMs, as the engine replay(untilMs) does", () => {
    const atEnd: EngineEvent[] = [{ type: "PARAM_CHANGE", simTimeMs: 3000, changes: { peepCmH2O: 10 } }];
    const clock = createManualClock();
    const loop = createSimLoop(buildTestCase(), 4, { clock, playbackRate: 8, initialEvents: atEnd, endAtSimTimeMs: 3000 });
    const { last, metrics, applied } = playToEnd(loop, clock);
    const expected = replay(buildTestCase(), 4, atEnd, 3000);

    expect(last.simTimeMs).toBe(3000);
    expect(last.status).toBe("paused");
    // The scheduled event is applied at the very end, never skipped and never past it.
    expect(applied.map((event) => event.simTimeMs)).toEqual([3000]);
    expect(metrics).toEqual(expected.final);
  });

  it("starting at the end shows the engine replay(untilMs) state and never steps", () => {
    const clock = createManualClock();
    const loop = createSimLoop(buildTestCase(), 6, { clock, playbackRate: 8, initialEvents: EVENTS, startAtSimTimeMs: 2500, endAtSimTimeMs: 2500 });

    loop.start();
    clock.advance(1000);

    const batch = loop.tick();
    const expected = replay(buildTestCase(), 6, EVENTS, 2500).final;

    expect(batch.simTimeMs).toBe(2500);
    expect(batch.status).toBe("paused");
    expect(batch.samples).toEqual([]);
    expect(batch.metrics).toEqual(expected);
  });
});

describe("protocol replay messages", () => {
  const request = { engineCase: buildTestCase(), seed: 3, events: EVENTS, untilMs: 5000 };

  it("accepts setPlaybackRate, replay and the replay init options", () => {
    expect(isSimCommand({ type: "setPlaybackRate", rate: 8 })).toBe(true);
    expect(isSimCommand({ type: "replay", requestId: "r1", request })).toBe(true);
    expect(isSimCommand({ type: "replay", requestId: "r1", request: { ...request, options: { timeMultiplier: 2, metricsIntervalMs: 1000 } } })).toBe(true);
    expect(isSimCommand({ type: "init", engineCase: buildTestCase(), seed: 1, options: { playbackRate: 8, endAtSimTimeMs: 9000 } })).toBe(true);
  });

  it("rejects malformed replay commands and options", () => {
    expect(isSimCommand({ type: "setPlaybackRate", rate: 0 })).toBe(false);
    expect(isSimCommand({ type: "setPlaybackRate", rate: 1000 })).toBe(false);
    expect(isSimCommand({ type: "replay", requestId: "", request })).toBe(false);
    expect(isSimCommand({ type: "replay", requestId: "r1", request: { ...request, untilMs: -1 } })).toBe(false);
    expect(isSimCommand({ type: "replay", requestId: "r1", request: { ...request, events: [{ type: "PARAM_CHANGE", simTimeMs: Number.NaN, changes: {} }] } })).toBe(false);
    expect(isSimCommand({ type: "init", engineCase: buildTestCase(), seed: 1, options: { endAtSimTimeMs: -5 } })).toBe(false);
  });

  it("guards the replayResult message", () => {
    const result = replay(buildTestCase(), 3, [], 2000);

    expect(isSimWorkerMessage({ type: "replayResult", requestId: "r1", result })).toBe(true);
    expect(isSimWorkerMessage({ type: "replayResult", requestId: "r1", result: { final: null } })).toBe(false);
  });
});

function hostSetup() {
  const posted: SimWorkerMessage[] = [];
  const host = createSimWorkerHost({
    post: (message) => posted.push(message),
    setInterval: () => 1,
    clearInterval: () => undefined,
    clock: createManualClock(),
  });

  return { host, posted };
}

describe("worker host replay round trip", () => {
  it("answers a replay request with the engine replay result", () => {
    const { host, posted } = hostSetup();

    host.handle({ type: "replay", requestId: "r1", request: { engineCase: buildTestCase(), seed: 5, events: EVENTS, untilMs: 6000, options: { timeMultiplier: 2 } } });

    const expected = replay(buildTestCase(), 5, EVENTS, 6000, { timeMultiplier: 2 });

    expect(posted).toEqual([{ type: "replayResult", requestId: "r1", result: expected }]);
  });

  it("posts a typed error with the request id when the engine refuses the replay", () => {
    const { host, posted } = hostSetup();
    const invalid = { type: "PARAM_CHANGE" as const, simTimeMs: 100, changes: { peepCmH2O: 500 } };

    host.handle({ type: "replay", requestId: "r2", request: { engineCase: buildTestCase(), seed: 5, events: [invalid], untilMs: 1000 } });

    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ type: "error", command: "replay", requestId: "r2" });
  });

  it("changes the playback rate of the running loop", () => {
    const { host, posted } = hostSetup();

    host.handle({ type: "init", engineCase: buildTestCase(), seed: 1, options: { playbackRate: 2 } });
    host.handle({ type: "setPlaybackRate", rate: 8 });

    expect(posted.filter((message) => message.type === "error")).toEqual([]);
  });
});

function createClientDouble() {
  const listeners = new Set<SimWorkerListener>();
  const sent: SimCommand[] = [];
  const client: SimWorkerClient = {
    send: (command) => {
      sent.push(command);
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    terminate: () => undefined,
  };

  return { client, sent, emit: (message: SimWorkerMessage) => listeners.forEach((listener) => listener(message)), listeners };
}

describe("requestWorkerReplay", () => {
  const request = { engineCase: buildTestCase(), seed: 3, events: [], untilMs: 2000 };

  it("resolves with the result of its own request id and unsubscribes", async() => {
    const { client, sent, emit, listeners } = createClientDouble();
    const result = replay(buildTestCase(), 3, [], 2000);
    const pending = requestWorkerReplay(client, request, "mine");

    expect(sent).toEqual([{ type: "replay", requestId: "mine", request }]);

    emit({ type: "replayResult", requestId: "other", result: { ...result, metricsTimeline: [] } });
    emit({ type: "replayResult", requestId: "mine", result });

    await expect(pending).resolves.toBe(result);
    expect(listeners.size).toBe(0);
  });

  it("rejects on an error for its request id or a replay error without an id", async() => {
    const first = createClientDouble();
    const failing = requestWorkerReplay(first.client, request, "a");

    first.emit({ type: "error", message: "boom", command: "replay", requestId: "a" });
    await expect(failing).rejects.toThrow("boom");

    const second = createClientDouble();
    const anonymous = requestWorkerReplay(second.client, request, { requestId: "b" });

    second.emit({ type: "error", message: "replay refused", command: "replay" });
    await expect(anonymous).rejects.toThrow("replay refused");
  });

  it("ignores the errors of other requests and other commands", async() => {
    const { client, emit, listeners } = createClientDouble();
    const result = replay(buildTestCase(), 3, [], 2000);
    const pending = requestWorkerReplay(client, request, { requestId: "mine" });

    emit({ type: "error", message: "other replay", command: "replay", requestId: "theirs" });
    emit({ type: "error", message: "start after stop", command: "start" });
    emit({ type: "error", message: "Malformed simulation command" });
    expect(listeners.size).toBe(1);

    emit({ type: "replayResult", requestId: "mine", result });
    await expect(pending).resolves.toBe(result);
  });

  it("rejects after timeoutMs and unsubscribes", async() => {
    vi.useFakeTimers();

    try {
      const { client, listeners } = createClientDouble();
      const pending = requestWorkerReplay(client, request, { requestId: "slow", timeoutMs: 500 });
      const settled = pending.catch((error: unknown) => error);

      vi.advanceTimersByTime(499);
      expect(listeners.size).toBe(1);
      vi.advanceTimersByTime(1);

      const error = await settled;

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe("WorkerReplayTimeout");
      expect(listeners.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects when aborted (before or while waiting) and unsubscribes", async() => {
    const { client, sent, listeners } = createClientDouble();
    const controller = new AbortController();
    const pending = requestWorkerReplay(client, request, { requestId: "c", signal: controller.signal, timeoutMs: 10_000 });

    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "WorkerReplayAborted" });
    expect(listeners.size).toBe(0);

    const before = sent.length;

    await expect(requestWorkerReplay(client, request, { signal: controller.signal })).rejects.toMatchObject({ name: "WorkerReplayAborted" });
    expect(sent).toHaveLength(before);
  });
});

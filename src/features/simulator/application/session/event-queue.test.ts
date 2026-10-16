/*
* Funcionalidad: Simulation event queue tests
* Descripción: Verifies the event outbox with fake timers: batching on the ~3 s timer, the in-flight batch kept until
*   acknowledged and later events sent in the next request, exponential backoff on network and 5xx failures with
*   the same ids on re-send, no retry on a 4xx (reported and dropped), flush() for the end (resolves when empty,
*   rejects after its attempts while keeping the events) and overlapping flushes without loss or duplicate sends.
*   Depends on vitest and the api-client error type. v1.1: a refused batch is re-sent event by event (only the
*   offending event is dropped) and onChange/snapshot report the unacknowledged events. v1.2 (review of 180a0a1): a
*   disposed queue never reports onChange for a send that was still in flight. v1.3 (review of 8cbd3de): an enqueue
*   after dispose is an explicit no-op with one development warning.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { backoffDelayMs, createEventQueue, isRetryableSendError } from "./event-queue";

type TestEvent = { id: string };

const networkError = () => new ApiError({ code: "network.unavailable", message: "offline", status: 0 });
const serverError = () => new ApiError({ code: "common.unknown", message: "boom", status: 503 });
const clientError = () => new ApiError({ code: "simulation.session_not_active", message: "ended", status: 409 });

function deferred() {
  let resolve: (value?: unknown) => void = () => undefined;
  const promise = new Promise((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

function setup(send: (events: readonly TestEvent[]) => Promise<unknown>, onRejected = vi.fn()) {
  const calls: string[][] = [];
  const queue = createEventQueue<TestEvent>({
    send: (events) => {
      calls.push(events.map((event) => event.id));

      return send(events);
    },
    flushIntervalMs: 3000,
    retryBaseMs: 1000,
    retryMaxMs: 8000,
    flushAttempts: 3,
    onRejected,
  });

  return { queue, calls, onRejected };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createEventQueue", () => {
  it("sends the events enqueued within the interval as one batch after ~3 s", async() => {
    const { queue, calls } = setup(() => Promise.resolve());

    queue.enqueue({ id: "a" });
    await vi.advanceTimersByTimeAsync(1000);
    queue.enqueue({ id: "b" });
    await vi.advanceTimersByTimeAsync(1999);
    expect(calls).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toEqual([["a", "b"]]);
    expect(queue.pendingCount()).toBe(0);
  });

  it("keeps an in-flight batch until it is acknowledged and sends later events in the next request", async() => {
    const gate = deferred();
    let first = true;
    const { queue, calls } = setup(() => {
      if (first) {
        first = false;

        return gate.promise;
      }

      return Promise.resolve();
    });

    queue.enqueue({ id: "a" });
    await vi.advanceTimersByTimeAsync(3000);
    queue.enqueue({ id: "b" });
    expect(queue.pendingCount()).toBe(2);

    gate.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toEqual([["a"], ["b"]]);
    expect(queue.pendingCount()).toBe(0);
  });

  it("retries network and 5xx failures with exponential backoff and the same ids", async() => {
    const failures = [networkError(), serverError(), serverError()];
    const { queue, calls } = setup(() => {
      const error = failures.shift();

      return error ? Promise.reject(error) : Promise.resolve();
    });

    queue.enqueue({ id: "a" });
    await vi.advanceTimersByTimeAsync(3000);
    expect(calls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(calls).toHaveLength(3);

    await vi.advanceTimersByTimeAsync(4000);
    expect(calls).toEqual([["a"], ["a"], ["a"], ["a"]]);
    expect(queue.pendingCount()).toBe(0);
  });

  it("does not retry a 4xx: the batch is reported and dropped, later events still go out", async() => {
    let refuse = true;
    const { queue, calls, onRejected } = setup(() => {
      if (refuse) {
        refuse = false;

        return Promise.reject(clientError());
      }

      return Promise.resolve();
    });

    queue.enqueue({ id: "a" });
    await vi.advanceTimersByTimeAsync(3000);

    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(onRejected.mock.calls[0]?.[1]).toEqual([{ id: "a" }]);
    expect(queue.pendingCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toEqual([["a"]]);

    queue.enqueue({ id: "b" });
    await queue.flush();
    expect(calls).toEqual([["a"], ["b"]]);
  });

  it("re-sends a refused batch one event at a time so only the offending event is dropped", async() => {
    const { queue, calls, onRejected } = setup((events) => (
      events.some((event) => event.id === "b") ? Promise.reject(clientError()) : Promise.resolve()
    ));

    queue.enqueue({ id: "a" });
    queue.enqueue({ id: "b" });
    queue.enqueue({ id: "c" });
    await queue.flush();

    expect(calls).toEqual([["a", "b", "c"], ["a"], ["b"], ["c"]]);
    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(onRejected.mock.calls[0]?.[1]).toEqual([{ id: "b" }]);
    expect(queue.pendingCount()).toBe(0);

    // Back to normal batches once the isolated events are settled.
    queue.enqueue({ id: "d" });
    queue.enqueue({ id: "e" });
    await queue.flush();
    expect(calls.at(-1)).toEqual(["d", "e"]);
  });

  it("reports every change of the unacknowledged events and exposes a snapshot", async() => {
    const changes: string[][] = [];
    const queue = createEventQueue<TestEvent>({
      send: () => Promise.resolve(),
      onChange: (pending) => changes.push(pending.map((event) => event.id)),
    });

    queue.enqueue({ id: "a" });
    queue.enqueue({ id: "b" });
    expect(queue.snapshot()).toEqual([{ id: "a" }, { id: "b" }]);
    await queue.flush();

    expect(changes).toEqual([["a"], ["a", "b"], []]);
    expect(queue.snapshot()).toEqual([]);
    queue.dispose();
  });

  it("flush() sends immediately on end and resolves once the queue is empty", async() => {
    const { queue, calls } = setup(() => Promise.resolve());

    queue.enqueue({ id: "a" });
    queue.enqueue({ id: "b" });
    await queue.flush();

    expect(calls).toEqual([["a", "b"]]);
    expect(queue.pendingCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(1);
  });

  it("flush() rejects after its attempts but keeps the events for a later retry", async() => {
    let online = false;
    const { queue, calls } = setup(() => (online ? Promise.resolve() : Promise.reject(networkError())));

    queue.enqueue({ id: "a" });

    const flushing = queue.flush();
    const outcome = expect(flushing).rejects.toBeInstanceOf(ApiError);

    await vi.advanceTimersByTimeAsync(1000 + 2000);
    await outcome;
    expect(calls).toHaveLength(3);
    expect(queue.pendingCount()).toBe(1);

    online = true;
    await vi.advanceTimersByTimeAsync(8000);
    expect(calls.at(-1)).toEqual(["a"]);
    expect(queue.pendingCount()).toBe(0);
  });

  it("serialises overlapping flushes: nothing is lost and nothing is sent twice", async() => {
    const gate = deferred();
    let first = true;
    const { queue, calls } = setup(() => {
      if (first) {
        first = false;

        return gate.promise;
      }

      return Promise.resolve();
    });

    queue.enqueue({ id: "a" });

    const one = queue.flush();

    // "a" is in flight when "b" arrives and a second flush overlaps the first.
    await vi.advanceTimersByTimeAsync(0);
    queue.enqueue({ id: "b" });

    const two = queue.flush();

    gate.resolve();
    await Promise.all([one, two]);

    expect(calls).toEqual([["a"], ["b"]]);
    expect(queue.pendingCount()).toBe(0);
  });

  it("classifies errors and computes the backoff", () => {
    expect(isRetryableSendError(networkError())).toBe(true);
    expect(isRetryableSendError(serverError())).toBe(true);
    expect(isRetryableSendError(new ApiError({ code: "common.too_many_requests", message: "", status: 429 }))).toBe(true);
    expect(isRetryableSendError(clientError())).toBe(false);
    expect([1, 2, 3, 4, 10].map((failures) => backoffDelayMs(failures, 1000, 30_000))).toEqual([1000, 2000, 4000, 8000, 30_000]);
  });
});

describe("event queue disposal", () => {
  it("never reports onChange after dispose, even when an in-flight send is acknowledged later", async() => {
    const inFlight = deferred();
    const onChange = vi.fn();
    const queue = createEventQueue<TestEvent>({ send: () => inFlight.promise, flushIntervalMs: 3000, onChange });

    queue.enqueue({ id: "a" });
    expect(onChange).toHaveBeenCalledTimes(1);

    const flushing = queue.flush();

    queue.dispose();
    inFlight.resolve();
    await flushing;

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(queue.pendingCount()).toBe(0);
  });

  it("ignores an enqueue after dispose: nothing is queued, sent or reported, and it warns once", async() => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const send = vi.fn(() => Promise.resolve());
    const onChange = vi.fn();
    const queue = createEventQueue<TestEvent>({ send, flushIntervalMs: 3000, onChange });

    queue.dispose();
    queue.enqueue({ id: "late-1" });
    queue.enqueue({ id: "late-2" });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(queue.pendingCount()).toBe(0);
    expect(queue.snapshot()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("disposed");

    warn.mockRestore();
    vi.useRealTimers();
  });
});

/*
* Funcionalidad: Autosave queue tests
* Descripción: Unit tests of the pure answer save queue with vitest fake timers and an injected sender: the debounce sends only the last value of a burst, a network failure keeps the value queued and the backoff retry succeeds, a value typed during a failed or in-flight send wins (last write wins), retryNow resends at once, a non-retryable failure is reported and dropped, flush sends everything immediately and reports what is left, and the persisted snapshot always holds every unsaved value. Depends on vitest and the autosave queue entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AutosaveStatus } from "./autosave-queue";
import { AutosaveQueue } from "./autosave-queue";

class NetworkError extends Error {}
class RejectedError extends Error {}

type Sent = { key: string, value: string };

function setup(sendImpl?: (key: string, value: string) => Promise<void>) {
  const sent: Sent[] = [];
  const statuses: Array<[string, AutosaveStatus]> = [];
  const snapshots: Array<Record<string, string>> = [];
  const onError = vi.fn<(key: string, error: unknown) => void>();
  const send = vi.fn((key: string, value: string) => {
    sent.push({ key, value });

    return sendImpl ? sendImpl(key, value) : Promise.resolve();
  });
  const queue = new AutosaveQueue<string>({
    send,
    isRetryable: (error) => error instanceof NetworkError,
    onStatus: (key, status) => statuses.push([key, status]),
    onError,
    persist: (pending) => snapshots.push({ ...pending }),
    retryBaseMs: 1000,
  });

  return { queue, send, sent, statuses, snapshots, onError, lastSnapshot: () => snapshots[snapshots.length - 1] ?? {} };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AutosaveQueue", () => {
  it("debounces a burst and sends only the last value", async() => {
    const { queue, sent, lastSnapshot } = setup();

    queue.enqueue("q1", "a", 800);
    await vi.advanceTimersByTimeAsync(500);
    queue.enqueue("q1", "ab", 800);
    await vi.advanceTimersByTimeAsync(500);
    queue.enqueue("q1", "abc", 800);
    await vi.advanceTimersByTimeAsync(799);
    expect(sent).toEqual([]);
    expect(lastSnapshot()).toEqual({ q1: "abc" });

    await vi.advanceTimersByTimeAsync(1);
    expect(sent).toEqual([{ key: "q1", value: "abc" }]);
    expect(queue.getStatus("q1")).toBe("saved");
    expect(queue.hasUnsaved()).toBe(false);
    expect(lastSnapshot()).toEqual({});
  });

  it("keeps a failed value queued and retries it with backoff until it is saved", async() => {
    let failures = 2;
    const { queue, sent, lastSnapshot } = setup(() => {
      if (failures > 0) {
        failures -= 1;

        return Promise.reject(new NetworkError("offline"));
      }

      return Promise.resolve();
    });

    queue.enqueue("q1", "texto", 0);
    await vi.advanceTimersByTimeAsync(0);
    expect(queue.getStatus("q1")).toBe("retrying");
    expect(lastSnapshot()).toEqual({ q1: "texto" });
    expect(queue.hasUnsaved()).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(sent).toHaveLength(2);
    expect(queue.getStatus("q1")).toBe("retrying");

    await vi.advanceTimersByTimeAsync(1999);
    expect(sent).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(sent).toHaveLength(3);
    expect(sent.every((item) => item.value === "texto")).toBe(true);
    expect(queue.getStatus("q1")).toBe("saved");
    expect(lastSnapshot()).toEqual({});
  });

  it("sends the newest value when it changed during a failed send (last write wins, nothing lost)", async() => {
    let rejectFirst: (error: unknown) => void = () => undefined;
    let calls = 0;
    const { queue, sent } = setup(() => {
      calls += 1;

      return calls === 1
        ? new Promise<void>((_resolve, reject) => {
          rejectFirst = reject;
        })
        : Promise.resolve();
    });

    queue.enqueue("q1", "v1", 0);
    await vi.advanceTimersByTimeAsync(0);
    queue.enqueue("q1", "v2", 0);
    rejectFirst(new NetworkError("offline"));
    await vi.advanceTimersByTimeAsync(0);

    expect(sent.map((item) => item.value)).toEqual(["v1", "v2"]);
    expect(queue.getStatus("q1")).toBe("saved");
    expect(queue.hasUnsaved()).toBe(false);
  });

  it("never sends two requests for the same question at once", async() => {
    let resolveFirst: () => void = () => undefined;
    let calls = 0;
    const { queue, sent } = setup(() => {
      calls += 1;

      return calls === 1 ? new Promise<void>((resolve) => {
        resolveFirst = resolve;
      }) : Promise.resolve();
    });

    queue.enqueue("q1", "a", 0);
    await vi.advanceTimersByTimeAsync(0);
    queue.enqueue("q1", "b", 0);
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toHaveLength(1);

    resolveFirst();
    await vi.advanceTimersByTimeAsync(0);
    expect(sent.map((item) => item.value)).toEqual(["a", "b"]);
    expect(queue.getStatus("q1")).toBe("saved");
  });

  it("resends at once on retryNow (browser back online)", async() => {
    let online = false;
    const { queue, sent } = setup(() => (online ? Promise.resolve() : Promise.reject(new NetworkError("offline"))));

    queue.enqueue("q1", "x", 0);
    await vi.advanceTimersByTimeAsync(0);
    expect(queue.getStatus("q1")).toBe("retrying");

    online = true;
    queue.retryNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toHaveLength(2);
    expect(queue.getStatus("q1")).toBe("saved");
  });

  it("reports and drops a value the backend rejects", async() => {
    const { queue, onError, lastSnapshot } = setup(() => Promise.reject(new RejectedError("422")));

    queue.enqueue("q1", "x", 0);
    await vi.advanceTimersByTimeAsync(0);

    expect(queue.getStatus("q1")).toBe("error");
    expect(onError).toHaveBeenCalledWith("q1", expect.any(RejectedError));
    expect(lastSnapshot()).toEqual({});
    expect(queue.hasUnsaved()).toBe(false);
  });

  it("flushes every pending value without waiting for the debounce", async() => {
    const { queue, sent } = setup();

    queue.enqueue("q1", "a", 800);
    queue.enqueue("q2", "b", 800);

    await expect(queue.flush()).resolves.toBe(true);
    expect(sent).toEqual([{ key: "q1", value: "a" }, { key: "q2", value: "b" }]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("flush reports false and keeps the value when the network is down", async() => {
    const { queue, lastSnapshot } = setup(() => Promise.reject(new NetworkError("offline")));

    queue.enqueue("q1", "a", 800);

    await expect(queue.flush()).resolves.toBe(false);
    expect(lastSnapshot()).toEqual({ q1: "a" });
    expect(queue.getPendingValue("q1")).toBe("a");
  });

  it("stop cancels the scheduled sends but keeps the values", async() => {
    const { queue, sent } = setup();

    queue.enqueue("q1", "a", 800);
    queue.stop();
    await vi.advanceTimersByTimeAsync(1000);

    expect(sent).toEqual([]);
    expect(queue.getPendingValue("q1")).toBe("a");
  });
});

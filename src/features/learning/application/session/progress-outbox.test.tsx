/*
* Funcionalidad: Progress outbox tests
* Descripción: The offline queue of page views: a network error or a 5xx queues the page once (a set, no duplicates)
*   under the user's key; a 403/404 is dropped with a console warning, also during a flush; a flush sends, removes
*   what got through and stops at a transient failure; two tabs never send at the same time (Web Lock and the
*   BroadcastChannel fallback); each user only flushes their own queue; storage failures never throw. The hook
*   flushes on mount, on `online` and when the tab becomes visible, retries with capped exponential backoff and calls
*   onSent. Depends on vitest fake timers, Testing Library, jsdom localStorage and a mocked progress service.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import {
  broadcastLock,
  createProgressOutbox,
  outboxBackoffMs,
  progressOutboxKey,
  useProgressOutbox,
} from "./progress-outbox";
import type { CrossTabLock } from "./progress-outbox";

const service = vi.hoisted(() => ({ recordPageView: vi.fn() }));

vi.mock("../../api/services/progress.service", () => ({ recordPageView: service.recordPageView }));

const apiError = (status: number) => new ApiError({ code: `http.${status}`, message: `status ${status}`, status });
const stored = (userId: string): unknown => JSON.parse(window.localStorage.getItem(progressOutboxKey(userId)) ?? "null");

/** Web Lock double with `ifAvailable` semantics, shared by the "tabs" of a test. */
function fakeWebLock(): CrossTabLock {
  let held = false;

  return async(task) => {
    if (held) {
      return null;
    }

    held = true;

    try {
      return await task();
    } finally {
      held = false;
    }
  };
}

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

beforeEach(() => {
  window.localStorage.clear();
  service.recordPageView.mockReset();
});

describe("createProgressOutbox", () => {
  it.each([0, 500, 503])("queues the page on a transient failure (status %i)", (status) => {
    const outbox = createProgressOutbox("u1", { send: vi.fn(), lock: fakeWebLock() });

    expect(outbox.handleFailure("p1", apiError(status))).toBe(true);
    expect(stored("u1")).toEqual(["p1"]);
  });

  it("keeps a set: the same page twice is queued once", () => {
    const outbox = createProgressOutbox("u1", { send: vi.fn(), lock: fakeWebLock() });

    outbox.handleFailure("p1", apiError(0));
    outbox.handleFailure("p2", apiError(503));
    outbox.handleFailure("p1", apiError(0));

    expect(stored("u1")).toEqual(["p1", "p2"]);
  });

  it.each([403, 404])("drops a %i with a console warning instead of queueing it", (status) => {
    const warn = vi.fn();
    const outbox = createProgressOutbox("u1", { send: vi.fn(), lock: fakeWebLock(), warn });

    expect(outbox.handleFailure("p1", apiError(status))).toBe(false);
    expect(stored("u1")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`status ${status}`), expect.any(ApiError));
  });

  it("warns on the real console by default", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    createProgressOutbox("u1", { send: vi.fn(), lock: fakeWebLock() }).handleFailure("p1", apiError(403));

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("flush sends every page, removes what got through and drops a 403 with a warning", async() => {
    const warn = vi.fn();
    const send = vi.fn((pageId: string) => (pageId === "p2" ? Promise.reject(apiError(403)) : Promise.resolve()));
    const outbox = createProgressOutbox("u1", { send, lock: fakeWebLock(), warn });

    ["p1", "p2", "p3"].forEach((pageId) => outbox.enqueue(pageId));

    await expect(outbox.flush()).resolves.toEqual({ status: "done", sent: 2 });
    expect(send.mock.calls.map(([pageId]) => pageId)).toEqual(["p1", "p2", "p3"]);
    expect(stored("u1")).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("flush stops at a transient failure and keeps the rest", async() => {
    const send = vi.fn((pageId: string) => (pageId === "p2" ? Promise.reject(apiError(502)) : Promise.resolve()));
    const outbox = createProgressOutbox("u1", { send, lock: fakeWebLock() });

    ["p1", "p2", "p3"].forEach((pageId) => outbox.enqueue(pageId));

    await expect(outbox.flush()).resolves.toEqual({ status: "retry", sent: 1 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(stored("u1")).toEqual(["p2", "p3"]);
  });

  it("does not take the lock nor send anything with an empty queue", async() => {
    const base = fakeWebLock();
    let lockCalls = 0;
    const lock: CrossTabLock = (task) => {
      lockCalls += 1;

      return base(task);
    };
    const send = vi.fn();

    await expect(createProgressOutbox("u1", { send, lock }).flush()).resolves.toEqual({ status: "done", sent: 0 });
    expect(lockCalls).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("the lock prevents two tabs from sending at the same time", async() => {
    const lock = fakeWebLock();
    const gate = deferred();
    const send = vi.fn(() => gate.promise);
    const tabA = createProgressOutbox("u1", { send, lock });
    const tabB = createProgressOutbox("u1", { send, lock });

    tabA.enqueue("p1");
    const first = tabA.flush();

    await expect(tabB.flush()).resolves.toEqual({ status: "busy", sent: 0 });
    gate.resolve();
    await expect(first).resolves.toEqual({ status: "done", sent: 1 });
    // Tab B reads the queue again inside the lock: nothing left to send.
    await expect(tabB.flush()).resolves.toEqual({ status: "done", sent: 0 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("isolates the queue of each user", async() => {
    const send = vi.fn(() => Promise.resolve());
    const ana = createProgressOutbox("ana", { send, lock: fakeWebLock() });
    const bob = createProgressOutbox("bob", { send, lock: fakeWebLock() });

    ana.handleFailure("p1", apiError(0));

    expect(bob.read()).toEqual([]);
    await expect(bob.flush()).resolves.toEqual({ status: "done", sent: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(stored("ana")).toEqual(["p1"]);
  });

  it("never throws when storage is unavailable or corrupted", async() => {
    const broken = () => {
      throw new Error("SecurityError");
    };
    const outbox = createProgressOutbox("u1", { send: vi.fn(), lock: fakeWebLock(), getStorage: broken });

    expect(() => outbox.handleFailure("p1", apiError(0))).not.toThrow();
    expect(outbox.read()).toEqual([]);
    await expect(outbox.flush()).resolves.toEqual({ status: "done", sent: 0 });

    window.localStorage.setItem(progressOutboxKey("u2"), "{not json");
    expect(createProgressOutbox("u2", { send: vi.fn() }).read()).toEqual([]);
  });
});

describe("broadcastLock (fallback without Web Locks)", () => {
  it("skips while another tab announced a flush and in-tab while busy", async() => {
    const tabA = broadcastLock("progress-outbox-test");
    const tabB = broadcastLock("progress-outbox-test");
    const gate = deferred();
    const first = tabA(() => gate.promise.then(() => "a"));

    await expect(tabA(() => Promise.resolve("again"))).resolves.toBeNull();
    // Let the "busy" message reach the other channel.
    await new Promise((resolve) => setTimeout(resolve, 20));
    await expect(tabB(() => Promise.resolve("b"))).resolves.toBeNull();

    gate.resolve();
    await expect(first).resolves.toBe("a");
    await new Promise((resolve) => setTimeout(resolve, 20));
    await expect(tabB(() => Promise.resolve("b"))).resolves.toBe("b");
  });
});

describe("outboxBackoffMs", () => {
  it("doubles from 2 s and is capped at 60 s", () => {
    expect([0, 1, 2, 3, 4, 5, 10].map(outboxBackoffMs)).toEqual([2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000]);
  });
});

describe("useProgressOutbox", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function advance(ms: number) {
    await act(async() => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  it("flushes the queue on mount and calls onSent", async() => {
    createProgressOutbox("u1", { send: vi.fn() }).enqueue("p1");
    service.recordPageView.mockResolvedValue({});
    const onSent = vi.fn();

    renderHook(() => useProgressOutbox("u1", { onSent }));
    await advance(0);

    expect(service.recordPageView).toHaveBeenCalledWith("p1");
    expect(stored("u1")).toBeNull();
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it("queues a failed view and reconciles it when the browser is back online", async() => {
    service.recordPageView.mockRejectedValue(apiError(0));
    const onSent = vi.fn();
    const { result } = renderHook(() => useProgressOutbox("u1", { onSent }));

    act(() => result.current.handleFailure("p1", apiError(0)));
    expect(stored("u1")).toEqual(["p1"]);

    service.recordPageView.mockResolvedValue({});
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await advance(0);

    expect(stored("u1")).toBeNull();
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it("retries with exponential backoff while the flush keeps failing", async() => {
    createProgressOutbox("u1", { send: vi.fn() }).enqueue("p1");
    service.recordPageView.mockRejectedValue(apiError(503));

    renderHook(() => useProgressOutbox("u1"));
    await advance(0);
    expect(service.recordPageView).toHaveBeenCalledTimes(1);

    await advance(outboxBackoffMs(0) - 1);
    expect(service.recordPageView).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(service.recordPageView).toHaveBeenCalledTimes(2);

    await advance(outboxBackoffMs(1));
    expect(service.recordPageView).toHaveBeenCalledTimes(3);
    expect(stored("u1")).toEqual(["p1"]);
  });

  it("flushes when the tab becomes visible", async() => {
    service.recordPageView.mockResolvedValue({});
    renderHook(() => useProgressOutbox("u1"));
    await advance(0);

    createProgressOutbox("u1", { send: vi.fn() }).enqueue("p9");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await advance(0);

    expect(service.recordPageView).toHaveBeenCalledWith("p9");
    expect(stored("u1")).toBeNull();
  });

  it("does nothing without a user", async() => {
    createProgressOutbox("u1", { send: vi.fn() }).enqueue("p1");
    const { result } = renderHook(() => useProgressOutbox(null));

    act(() => result.current.handleFailure("p2", apiError(0)));
    await advance(outboxBackoffMs(5));

    expect(service.recordPageView).not.toHaveBeenCalled();
    expect(stored("u1")).toEqual(["p1"]);
  });
});

/*
* Funcionalidad: Progress outbox (offline page views)
* Descripción: Offline queue of page views (DISENO_BLOQUE2 §2.9). A page view that fails with a network error or a
*   transient status (5xx, 408, 429) is kept in localStorage under `progress.outbox.v1:<userId>` as a SET of pageIds
*   (the server is idempotent per user and page, so no client id, timeSpent or counters are sent). The queue is
*   flushed (`POST /api/progress/pages/{pageId}/view`) on mount, on `online` and when the tab becomes visible, with
*   exponential backoff (capped) while it keeps failing. A flush runs under the Web Lock 'progress-outbox'
*   (ifAvailable: a tab that finds it taken skips, the holder is already sending); without Web Locks a
*   BroadcastChannel lease plays that role, and without either only this tab is guarded. A success removes the
*   entry; a 403/404 (or any other non-transient error) drops it with a console.warn, never silently. Every storage
*   access is wrapped in try/catch (private mode, blocked storage, quota): without storage the view is just lost, as
*   before. createProgressOutbox is the testable core (storage, send, lock and warn injectable); useProgressOutbox
*   wires it to a component (flush triggers, backoff, onSent callback). Depends on React, @shared/api-client and the
*   progress service.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef } from "react";
import { isApiError } from "@shared/api-client/api-error";
import { recordPageView } from "../../api/services/progress.service";

export const PROGRESS_OUTBOX_KEY_PREFIX = "progress.outbox.v1:";
export const PROGRESS_OUTBOX_LOCK_NAME = "progress-outbox";
export const OUTBOX_BACKOFF_BASE_MS = 2_000;
export const OUTBOX_BACKOFF_CAP_MS = 60_000;
// A BroadcastChannel lease older than this is considered abandoned (the holder tab closed mid-flush).
const BROADCAST_LEASE_MS = 30_000;
const TRANSIENT_STATUSES = new Set([0, 408, 429]);

export const progressOutboxKey = (userId: string): string => `${PROGRESS_OUTBOX_KEY_PREFIX}${userId}`;

/** Delay before the retry number `attempt` (0-based): 2 s, 4 s, 8 s… capped at 60 s. */
export function outboxBackoffMs(attempt: number): number {
  return Math.min(OUTBOX_BACKOFF_BASE_MS * 2 ** Math.max(0, attempt), OUTBOX_BACKOFF_CAP_MS);
}

/** Whether a failed page view may succeed later (network error, 5xx, 408, 429) and so belongs in the queue. */
export function isTransientViewError(error: unknown): boolean {
  if (!isApiError(error)) {
    // Not mapped by the api-client (should not happen): assume the network, keeping the view is harmless.
    return true;
  }

  return TRANSIENT_STATUSES.has(error.status) || error.status >= 500;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Runs `task` while holding the cross-tab lock; resolves null without running it when another tab holds it. */
export type CrossTabLock = <T>(task: () => Promise<T>) => Promise<T | null>;

export type FlushOutcome = {
  /** done: queue empty (or only drops left); retry: a transient failure stopped it; busy: another flush holds the lock. */
  status: "done" | "retry" | "busy"
  sent: number
};

export type ProgressOutbox = {
  read: () => string[]
  enqueue: (pageId: string) => void
  /** Queues the view when the error is transient (returns true); otherwise drops it with a warning. */
  handleFailure: (pageId: string, error: unknown) => boolean
  flush: () => Promise<FlushOutcome>
};

export type ProgressOutboxDeps = {
  send: (pageId: string) => Promise<unknown>
  getStorage?: () => StorageLike | null
  lock?: CrossTabLock
  warn?: (message: string, details: unknown) => void
};

function browserLocalStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function webLock(name: string): CrossTabLock | null {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;

  if (typeof locks?.request !== "function") {
    return null;
  }

  return async <T>(task: () => Promise<T>): Promise<T | null> => {
    const result = await locks.request(name, { ifAvailable: true }, async(held) => (held ? task() : null));

    return result;
  };
}

type LeaseMessage = { type: "busy", until: number } | { type: "free" };

/** Fallback lock: a lease announced on a BroadcastChannel (when there is one) plus an in-tab flag. Best effort. */
export function broadcastLock(name: string, now: () => number = Date.now): CrossTabLock {
  let channel: BroadcastChannel | null = null;
  let peerBusyUntil = 0;
  let busyHere = false;

  try {
    channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(name);
    channel?.addEventListener("message", (event: MessageEvent<LeaseMessage>) => {
      peerBusyUntil = event.data?.type === "busy" ? event.data.until : 0;
    });
  } catch {
    channel = null;
  }

  const post = (message: LeaseMessage): void => {
    try {
      channel?.postMessage(message);
    } catch {
      // A closed channel only weakens the cross-tab guard; the server stays idempotent.
    }
  };

  return async <T>(task: () => Promise<T>) => {
    if (busyHere || now() < peerBusyUntil) {
      return null;
    }

    busyHere = true;
    post({ type: "busy", until: now() + BROADCAST_LEASE_MS });

    try {
      return await task();
    } finally {
      busyHere = false;
      post({ type: "free" });
    }
  };
}

let defaultLock: CrossTabLock | null = null;

function sharedLock(): CrossTabLock {
  defaultLock ??= webLock(PROGRESS_OUTBOX_LOCK_NAME) ?? broadcastLock(PROGRESS_OUTBOX_LOCK_NAME);

  return defaultLock;
}

function warnDropped(message: string, details: unknown): void {
  console.warn(message, details);
}

export function createProgressOutbox(userId: string, deps: ProgressOutboxDeps): ProgressOutbox {
  const { send, getStorage = browserLocalStorage, warn = warnDropped } = deps;
  const key = progressOutboxKey(userId);

  const read = (): string[] => {
    try {
      const raw = getStorage()?.getItem(key) ?? null;
      const value: unknown = raw === null ? [] : JSON.parse(raw);

      return Array.isArray(value)
        ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))]
        : [];
    } catch {
      return [];
    }
  };

  const write = (pageIds: readonly string[]): void => {
    try {
      if (pageIds.length === 0) {
        getStorage()?.removeItem(key);
      } else {
        getStorage()?.setItem(key, JSON.stringify(pageIds));
      }
    } catch {
      // Storage unavailable: the view is lost, as without the outbox.
    }
  };

  const enqueue = (pageId: string): void => {
    const pageIds = read();

    if (!pageIds.includes(pageId)) {
      write([...pageIds, pageId]);
    }
  };

  const remove = (pageId: string): void => {
    write(read().filter((item) => item !== pageId));
  };

  const drop = (pageId: string, error: unknown): void => {
    const status = isApiError(error) ? error.status : undefined;

    warn(`[progress-outbox] page view of ${pageId} dropped (status ${status ?? "unknown"})`, error);
  };

  const handleFailure = (pageId: string, error: unknown): boolean => {
    if (isTransientViewError(error)) {
      enqueue(pageId);

      return true;
    }

    drop(pageId, error);

    return false;
  };

  const drain = async(): Promise<FlushOutcome> => {
    let sent = 0;

    // Read inside the lock: a tab that flushed before us already removed what it sent.
    for (const pageId of read()) {
      try {
        await send(pageId);
        sent += 1;
        remove(pageId);
      } catch (error) {
        if (isTransientViewError(error)) {
          return { status: "retry", sent };
        }

        remove(pageId);
        drop(pageId, error);
      }
    }

    return { status: "done", sent };
  };

  const flush = async(): Promise<FlushOutcome> => {
    if (read().length === 0) {
      return { status: "done", sent: 0 };
    }

    return (await (deps.lock ?? sharedLock())(drain)) ?? { status: "busy", sent: 0 };
  };

  return { read, enqueue, handleFailure, flush };
}

export type UseProgressOutboxOptions = {
  /** Called after a flush that sent at least one view (e.g. to invalidate the progress queries). */
  onSent?: () => void
};

export type ProgressOutboxHandle = {
  /** Queues a failed view (transient errors) and schedules a flush, or drops it with a warning. */
  handleFailure: (pageId: string, error: unknown) => void
};

/**
 * Flushes the outbox of `userId` on mount, on `online` and when the tab becomes visible, retrying with backoff while
 * it keeps failing. A null userId (no session, preview mode) disables it.
 */
export function useProgressOutbox(userId: string | null, { onSent }: UseProgressOutboxOptions = {}): ProgressOutboxHandle {
  const outbox = useMemo(() => (userId ? createProgressOutbox(userId, { send: recordPageView }) : null), [userId]);
  const onSentRef = useRef(onSent);
  const retryRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onSentRef.current = onSent;
  }, [onSent]);

  useEffect(() => {
    if (!outbox) {
      return undefined;
    }

    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const run = async(): Promise<void> => {
      const outcome = await outbox.flush();

      if (disposed) {
        return;
      }

      if (outcome.sent > 0) {
        onSentRef.current?.();
      }

      if (outcome.status === "retry") {
        schedule(outboxBackoffMs(attempt));
        attempt += 1;
      } else {
        attempt = 0;
      }
    };

    const schedule = (delayMs: number): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        timer = null;
        void run();
      }, delayMs);
    };

    const flushNow = (): void => {
      attempt = 0;
      schedule(0);
    };
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") {
        flushNow();
      }
    };

    retryRef.current = () => {
      if (timer === null) {
        schedule(outboxBackoffMs(attempt));
      }
    };
    window.addEventListener("online", flushNow);
    document.addEventListener("visibilitychange", onVisibility);
    void run();

    return () => {
      disposed = true;
      retryRef.current = null;

      if (timer !== null) {
        clearTimeout(timer);
      }

      window.removeEventListener("online", flushNow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [outbox]);

  const handleFailure = useCallback((pageId: string, error: unknown): void => {
    if (outbox?.handleFailure(pageId, error)) {
      retryRef.current?.();
    }
  }, [outbox]);

  // Stable while the user does not change, so callers can list it as an effect dependency.
  return useMemo(() => ({ handleFailure }), [handleFailure]);
}

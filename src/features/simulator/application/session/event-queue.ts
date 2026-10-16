/*
* Funcionalidad: Simulation event queue
* Descripción: Pure, injectable outbox of the client session events (no React, no HTTP of its own). Events are kept
*   in order until the server acknowledges them: a background timer sends a batch about every 3 s, an in-flight batch
*   stays at the head of the queue until its request succeeds, and events enqueued meanwhile go out in the next
*   request, so nothing is lost when sends overlap (sends are serialised). Network, 429 and 5xx failures are retried
*   with exponential backoff; a re-send carries the same client ids, which the server counts as duplicates
*   (idempotent). A 4xx is not retried: the batch is dropped from the queue and reported through `onRejected`.
*   `flush()` (end, deadline, page hide) sends everything now with a bounded number of attempts and returns a promise
*   that rejects with the last retryable error while keeping the events queued. Timers and the send function are
*   injected for tests. Depends on the api-client error type and the console config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import {
  EVENT_FLUSH_ATTEMPTS,
  EVENT_FLUSH_INTERVAL_MS,
  EVENT_MAX_BATCH_SIZE,
  EVENT_RETRY_BASE_MS,
  EVENT_RETRY_MAX_MS,
} from "../config/sim-console.config";

export type QueueTimers = {
  setTimeout: (handler: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
};

export type EventQueueOptions<E> = {
  send: (events: readonly E[]) => Promise<unknown>
  timers?: QueueTimers
  flushIntervalMs?: number
  retryBaseMs?: number
  retryMaxMs?: number
  flushAttempts?: number
  maxBatchSize?: number
  isRetryable?: (error: unknown) => boolean
  /** A batch the server refused (4xx): it is dropped from the queue and never re-sent. */
  onRejected?: (error: unknown, events: readonly E[]) => void
};

export type EventQueue<E> = {
  enqueue: (event: E) => void
  /** Sends every queued event now; resolves when the queue is empty, rejects after the flush attempts run out. */
  flush: () => Promise<void>
  /** Events not yet acknowledged, in-flight included. */
  pendingCount: () => number
  /** Stops the timers; queued events stay readable through pendingCount. */
  dispose: () => void
};

/** Network failures (status 0), 429 and 5xx are transient; any other status is a definitive refusal. */
export function isRetryableSendError(error: unknown): boolean {
  const { status } = toApiError(error);

  return status === 0 || status === 429 || status >= 500;
}

export function backoffDelayMs(failures: number, baseMs: number = EVENT_RETRY_BASE_MS, maxMs: number = EVENT_RETRY_MAX_MS): number {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, failures - 1));
}

const browserTimers: QueueTimers = {
  setTimeout: (handler, ms) => globalThis.setTimeout(handler, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
};

export function createEventQueue<E>(options: EventQueueOptions<E>): EventQueue<E> {
  const timers = options.timers ?? browserTimers;
  const intervalMs = options.flushIntervalMs ?? EVENT_FLUSH_INTERVAL_MS;
  const baseMs = options.retryBaseMs ?? EVENT_RETRY_BASE_MS;
  const maxMs = options.retryMaxMs ?? EVENT_RETRY_MAX_MS;
  const flushAttempts = Math.max(1, options.flushAttempts ?? EVENT_FLUSH_ATTEMPTS);
  const maxBatch = Math.max(1, options.maxBatchSize ?? EVENT_MAX_BATCH_SIZE);
  const isRetryable = options.isRetryable ?? isRetryableSendError;

  const queue: E[] = [];
  let failures = 0;
  let timer: unknown = null;
  let disposed = false;
  // Every send goes through this chain, so two flushes never send the same head concurrently.
  let chain: Promise<void> = Promise.resolve();

  function clearTimer(): void {
    if (timer !== null) {
      timers.clearTimeout(timer);
      timer = null;
    }
  }

  function schedule(delayMs: number): void {
    if (disposed || timer !== null || queue.length === 0) {
      return;
    }

    timer = timers.setTimeout(() => {
      timer = null;
      void run(1).catch(() => undefined);
    }, delayMs);
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      timers.setTimeout(resolve, ms);
    });
  }

  /** Sends batches until the queue is empty; gives up (rejects) after `attempts` consecutive transient failures. */
  async function drain(attempts: number): Promise<void> {
    let tries = 0;

    while (queue.length > 0) {
      const batch = queue.slice(0, maxBatch);

      try {
        await options.send(batch);
        queue.splice(0, batch.length);
        failures = 0;
        tries = 0;
      } catch (error) {
        if (!isRetryable(error)) {
          queue.splice(0, batch.length);
          options.onRejected?.(error, batch);
          continue;
        }

        failures += 1;
        tries += 1;

        if (tries >= attempts) {
          throw error;
        }

        await sleep(backoffDelayMs(failures, baseMs, maxMs));
      }
    }
  }

  function run(attempts: number): Promise<void> {
    clearTimer();

    const next = chain.then(() => drain(attempts));

    chain = next.catch(() => undefined);

    // Whatever happened, keep the background sender alive for what is left.
    return next.then(
      () => schedule(intervalMs),
      (error: unknown) => {
        schedule(backoffDelayMs(failures, baseMs, maxMs));
        throw error;
      },
    );
  }

  return {
    enqueue(event) {
      queue.push(event);
      schedule(intervalMs);
    },
    flush: () => run(flushAttempts),
    pendingCount: () => queue.length,
    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}

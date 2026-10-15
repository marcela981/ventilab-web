/*
* Funcionalidad: Autosave queue
* Descripción: Pure, framework-free save queue of the attempt answers with an injected sender, timers and persistence. Each question keeps only its latest unsaved value (last write wins): enqueue debounces the send (a longer delay for typing, a short one for choices), a value typed while a save is in flight is sent right after it, a retryable failure (network, timeout, 429, 5xx) keeps the value and retries with exponential backoff, retryNow resends everything at once (used on the browser `online` event), a non-retryable failure (409, 422…) drops the value and reports it (onError option or the late-bound setErrorListener), and flush sends every pending value immediately and resolves true only when nothing is left unsaved, and stop cancels the scheduled sends without dropping any value. Every change of the pending values is handed to persist, so a reload can restore and resend them. Statuses per question: pending, saving, saved, retrying, error. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type AutosaveStatus = "pending" | "saving" | "saved" | "retrying" | "error";

export type AutosaveTimers = {
  setTimeout: (callback: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
};

export type AutosaveQueueOptions<T> = {
  send: (key: string, value: T) => Promise<void>
  isRetryable: (error: unknown) => boolean
  onStatus?: (key: string, status: AutosaveStatus) => void
  onError?: (key: string, error: unknown) => void
  persist?: (pending: Record<string, T>) => void
  timers?: AutosaveTimers
  retryBaseMs?: number
  retryMaxMs?: number
};

type Entry<T> = {
  value: T
  version: number
  failures: number
};

const defaultTimers: AutosaveTimers = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
};

export const AUTOSAVE_RETRY_BASE_MS = 1000;
export const AUTOSAVE_RETRY_MAX_MS = 30_000;

export class AutosaveQueue<T> {
  private readonly pending = new Map<string, Entry<T>>();
  private readonly scheduled = new Map<string, unknown>();
  private readonly inflight = new Map<string, Promise<void>>();
  private readonly statuses = new Map<string, AutosaveStatus>();
  private readonly options: AutosaveQueueOptions<T>;
  private readonly timers: AutosaveTimers;
  private nextVersion = 1;
  private errorListener: ((key: string, error: unknown) => void) | null = null;

  constructor(options: AutosaveQueueOptions<T>) {
    this.options = options;
    this.timers = options.timers ?? defaultTimers;
  }

  enqueue(key: string, value: T, delayMs: number): void {
    this.pending.set(key, { value, version: this.nextVersion++, failures: 0 });
    this.persist();
    this.setStatus(key, "pending");
    this.schedule(key, delayMs);
  }

  // Late-bound error listener (a React binding swaps it on every render without recreating the queue).
  setErrorListener(listener: ((key: string, error: unknown) => void) | null): void {
    this.errorListener = listener;
  }

  getStatus(key: string): AutosaveStatus | null {
    return this.statuses.get(key) ?? null;
  }

  getPendingValue(key: string): T | null {
    return this.pending.get(key)?.value ?? null;
  }

  hasUnsaved(): boolean {
    return this.pending.size > 0 || this.inflight.size > 0;
  }

  // Sends every pending value now (e.g. when the browser comes back online).
  retryNow(): void {
    for (const key of [...this.pending.keys()]) {
      this.cancel(key);
      void this.run(key);
    }
  }

  // Sends everything now and waits; true when no value is left unsaved.
  async flush(): Promise<boolean> {
    for (const key of [...this.pending.keys()]) {
      this.cancel(key);
    }

    const runs = [...this.pending.keys()].map((key) => this.run(key));

    await Promise.all([...runs, ...this.inflight.values()]);
    // A failed send schedules a retry; the caller decides what to do with what is left.
    return this.pending.size === 0;
  }

  // Cancels the scheduled sends (unmount); pending values stay and retryNow or flush send them.
  stop(): void {
    for (const key of [...this.scheduled.keys()]) {
      this.cancel(key);
    }
  }

  private schedule(key: string, delayMs: number): void {
    this.cancel(key);
    this.scheduled.set(key, this.timers.setTimeout(() => {
      this.scheduled.delete(key);
      void this.run(key);
    }, delayMs));
  }

  private cancel(key: string): void {
    const handle = this.scheduled.get(key);

    if (handle !== undefined) {
      this.timers.clearTimeout(handle);
      this.scheduled.delete(key);
    }
  }

  private run(key: string): Promise<void> {
    const current = this.inflight.get(key);

    // The loop picks up the newest value once the request in flight settles.
    if (current) {
      return current;
    }

    const promise = this.sendLoop(key).finally(() => {
      this.inflight.delete(key);
    });

    this.inflight.set(key, promise);

    return promise;
  }

  private async sendLoop(key: string): Promise<void> {
    for (;;) {
      const entry = this.pending.get(key);

      if (!entry) {
        return;
      }

      const { version, value } = entry;

      this.setStatus(key, "saving");

      let failure: { error: unknown } | null = null;

      try {
        await this.options.send(key, value);
      } catch (error) {
        failure = { error };
      }

      const latest = this.pending.get(key);

      if (latest && latest.version !== version) {
        // A newer value arrived while sending: its debounce sends it, or send it now.
        if (this.scheduled.has(key)) {
          this.setStatus(key, "pending");

          return;
        }

        continue;
      }

      if (!failure) {
        this.pending.delete(key);
        this.persist();
        this.setStatus(key, "saved");

        return;
      }

      if (this.options.isRetryable(failure.error)) {
        entry.failures += 1;
        this.setStatus(key, "retrying");
        this.schedule(key, this.backoff(entry.failures));

        return;
      }

      this.pending.delete(key);
      this.persist();
      this.setStatus(key, "error");
      this.options.onError?.(key, failure.error);
      this.errorListener?.(key, failure.error);

      return;
    }
  }

  private backoff(failures: number): number {
    const base = this.options.retryBaseMs ?? AUTOSAVE_RETRY_BASE_MS;
    const max = this.options.retryMaxMs ?? AUTOSAVE_RETRY_MAX_MS;

    return Math.min(max, base * 2 ** (failures - 1));
  }

  private setStatus(key: string, status: AutosaveStatus): void {
    if (this.statuses.get(key) === status) {
      return;
    }

    this.statuses.set(key, status);
    this.options.onStatus?.(key, status);
  }

  private persist(): void {
    if (!this.options.persist) {
      return;
    }

    const snapshot: Record<string, T> = {};

    for (const [key, entry] of this.pending) {
      snapshot[key] = entry.value;
    }

    this.options.persist(snapshot);
  }
}

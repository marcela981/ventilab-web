/*
* Funcionalidad: Attempt timer
* Descripción: Pure countdown of an evaluation attempt corrected for the clock skew between the browser and the server. The offset is serverNow - clientNowAtResponse (the client clock read when the attempt response arrived), and the remaining time is deadlineAt - (now + offset), so a wrong local clock never shortens or extends the attempt. startAttemptTimer ticks every second with injected timers and clock: it reports the remaining milliseconds, fires each warning threshold (5 and 1 minutes by default) once, only the closest one when several are crossed at once (a reload with 30 s left warns once), and calls onExpire exactly once when the remaining time reaches zero. formatRemaining renders mm:ss or h:mm:ss. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const MINUTE_MS = 60_000;
export const TIMER_WARNING_THRESHOLDS_MS = [5 * MINUTE_MS, MINUTE_MS] as const;
const TICK_MS = 1000;

export function computeClockOffset(serverNow: string, clientNowAtResponse: number): number {
  const server = Date.parse(serverNow);

  return Number.isNaN(server) ? 0 : server - clientNowAtResponse;
}

export function computeRemainingMs(deadlineAt: string, offsetMs: number, clientNow: number): number {
  const deadline = Date.parse(deadlineAt);

  if (Number.isNaN(deadline)) {
    return 0;
  }

  return Math.max(0, deadline - (clientNow + offsetMs));
}

export function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export type TimerScheduler = {
  setInterval: (callback: () => void, ms: number) => unknown
  clearInterval: (handle: unknown) => void
};

const defaultScheduler: TimerScheduler = {
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) => globalThis.clearInterval(handle as ReturnType<typeof globalThis.setInterval>),
};

export type AttemptTimerOptions = {
  deadlineAt: string
  serverNow: string
  clientNowAtResponse: number
  onTick: (remainingMs: number) => void
  onWarning: (thresholdMs: number) => void
  onExpire: () => void
  thresholdsMs?: readonly number[]
  now?: () => number
  scheduler?: TimerScheduler
};

export type AttemptTimer = {
  stop: () => void
};

export function startAttemptTimer(options: AttemptTimerOptions): AttemptTimer {
  const now = options.now ?? (() => Date.now());
  const scheduler = options.scheduler ?? defaultScheduler;
  const thresholds = [...(options.thresholdsMs ?? TIMER_WARNING_THRESHOLDS_MS)].sort((a, b) => b - a);
  const offset = computeClockOffset(options.serverNow, options.clientNowAtResponse);
  const fired = new Set<number>();
  let expired = false;
  let handle: unknown = null;

  const stop = () => {
    if (handle !== null) {
      scheduler.clearInterval(handle);
      handle = null;
    }
  };

  const tick = () => {
    if (expired) {
      return;
    }

    const remaining = computeRemainingMs(options.deadlineAt, offset, now());

    options.onTick(remaining);

    if (remaining <= 0) {
      expired = true;
      stop();
      options.onExpire();

      return;
    }

    const crossed = thresholds.filter((threshold) => remaining <= threshold && !fired.has(threshold));

    if (crossed.length > 0) {
      crossed.forEach((threshold) => fired.add(threshold));
      // Thresholds are sorted descending: the last crossed one is the closest to zero.
      options.onWarning(crossed[crossed.length - 1] as number);
    }
  };

  tick();

  if (!expired) {
    handle = scheduler.setInterval(tick, TICK_MS);
  }

  return { stop };
}

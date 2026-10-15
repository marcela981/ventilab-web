/*
* Funcionalidad: Attempt timer tests
* Descripción: Unit tests of the pure attempt countdown with vitest fake timers: a client clock 2 minutes ahead of or behind the server yields the same remaining time, the 5 and 1 minute warnings fire once each, a start inside both thresholds warns only once, onExpire fires exactly once at zero and the ticking stops, and the mm:ss formatter. Depends on vitest and the attempt timer entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeClockOffset, computeRemainingMs, formatRemaining, MINUTE_MS, startAttemptTimer } from "./attempt-timer";

const SERVER_NOW = "2026-10-14T15:00:00.000Z";
const DEADLINE = "2026-10-14T15:30:00.000Z";
const SERVER_MS = Date.parse(SERVER_NOW);

function start(clientNow: number, deadlineAt = DEADLINE) {
  const onTick = vi.fn<(remaining: number) => void>();
  const onWarning = vi.fn<(threshold: number) => void>();
  const onExpire = vi.fn<() => void>();
  const timer = startAttemptTimer({ deadlineAt, serverNow: SERVER_NOW, clientNowAtResponse: clientNow, onTick, onWarning, onExpire });

  return { timer, onTick, onWarning, onExpire };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("clock skew", () => {
  it.each([
    ["ahead", 2 * MINUTE_MS],
    ["behind", -2 * MINUTE_MS],
  ])("keeps the server remaining time when the client clock is 2 minutes %s", (_label, skew) => {
    const clientNow = SERVER_MS + skew;

    vi.setSystemTime(clientNow);
    const offset = computeClockOffset(SERVER_NOW, clientNow);

    expect(offset).toBe(-skew);
    expect(computeRemainingMs(DEADLINE, offset, Date.now())).toBe(30 * MINUTE_MS);

    const { onTick, timer } = start(clientNow);

    expect(onTick).toHaveBeenLastCalledWith(30 * MINUTE_MS);
    vi.advanceTimersByTime(10 * MINUTE_MS);
    expect(onTick).toHaveBeenLastCalledWith(20 * MINUTE_MS);
    timer.stop();
  });
});

describe("startAttemptTimer", () => {
  it("fires the 5 and 1 minute warnings once each", () => {
    vi.setSystemTime(SERVER_MS);
    const { onWarning, onExpire } = start(SERVER_MS, "2026-10-14T15:06:00.000Z");

    vi.advanceTimersByTime(MINUTE_MS - 1000);
    expect(onWarning).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenLastCalledWith(5 * MINUTE_MS);

    vi.advanceTimersByTime(3 * MINUTE_MS);
    expect(onWarning).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(MINUTE_MS);
    expect(onWarning).toHaveBeenCalledTimes(2);
    expect(onWarning).toHaveBeenLastCalledWith(MINUTE_MS);

    vi.advanceTimersByTime(30_000);
    expect(onWarning).toHaveBeenCalledTimes(2);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("warns only once when it starts inside both thresholds", () => {
    vi.setSystemTime(SERVER_MS);
    const { onWarning } = start(SERVER_MS, "2026-10-14T15:00:30.000Z");

    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(MINUTE_MS);
  });

  it("calls onExpire exactly once at zero and stops ticking", () => {
    vi.setSystemTime(SERVER_MS);
    const { onExpire, onTick } = start(SERVER_MS, "2026-10-14T15:00:03.000Z");

    vi.advanceTimersByTime(2000);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onTick).toHaveBeenLastCalledWith(0);

    const ticks = onTick.mock.calls.length;

    vi.advanceTimersByTime(10_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onTick).toHaveBeenCalledTimes(ticks);
  });

  it("expires immediately when the deadline already passed on the server", () => {
    vi.setSystemTime(SERVER_MS);
    const { onExpire } = start(SERVER_MS, "2026-10-14T14:59:00.000Z");

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("formatRemaining", () => {
  it("formats minutes and hours", () => {
    expect(formatRemaining(65_000)).toBe("01:05");
    expect(formatRemaining(3_725_000)).toBe("1:02:05");
    expect(formatRemaining(-5)).toBe("00:00");
  });
});

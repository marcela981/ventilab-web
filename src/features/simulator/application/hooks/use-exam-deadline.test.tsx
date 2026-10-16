/*
* Funcionalidad: useExamDeadline tests
* Descripción: Verifies the EXAM countdown hook: the expiry fires at the exact time left (one setTimeout re-armed on
*   every tick) instead of at the next interval tick, a tab that becomes visible ticks at once (a background tab
*   throttles the timers), a deadline already past expires at mount, and the expiry runs exactly once. Depends on
*   vitest and Testing Library (renderHook) with fake timers. v1.1: a deadline weeks away never arms a timer longer
*   than one tick.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEADLINE_TICK_MS } from "../config/sim-exam.config";
import { useExamDeadline } from "./use-exam-deadline";

const START_MS = Date.parse("2026-10-16T14:00:00.000Z");

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useExamDeadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START_MS);
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  });

  it("expires at the exact time left, not at the next interval tick", () => {
    const onExpire = vi.fn();

    renderHook(() => useExamDeadline({ deadline: new Date(START_MS + 1500).toISOString(), onExpire }));

    act(() => {
      vi.advanceTimersByTime(1499);
    });
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("never arms a timer longer than one tick (a delay above 2^31-1 ms would fire at once)", () => {
    const onExpire = vi.fn();
    const timeout = vi.spyOn(globalThis, "setTimeout");
    const farAway = START_MS + 30 * 24 * 3600 * 1000;

    renderHook(() => useExamDeadline({ deadline: new Date(farAway).toISOString(), onExpire }));

    act(() => {
      vi.advanceTimersByTime(3 * DEADLINE_TICK_MS);
    });

    const delays = timeout.mock.calls.map((call) => Number(call[1] ?? 0));

    expect(delays.length).toBeGreaterThan(0);
    expect(Math.max(...delays)).toBeLessThanOrEqual(DEADLINE_TICK_MS);
    expect(onExpire).not.toHaveBeenCalled();
    timeout.mockRestore();
  });

  it("ticks when the tab becomes visible again (throttled background timers)", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useExamDeadline({ deadline: new Date(START_MS + 600_000).toISOString(), onExpire }));

    expect(result.current).toBe(600_000);

    // The clock moves on while no timer runs (a hidden tab), then the tab is shown.
    act(() => {
      vi.setSystemTime(START_MS + 120_000);
      setVisibility("hidden");
    });
    expect(result.current).toBe(600_000);

    act(() => setVisibility("visible"));
    expect(result.current).toBe(480_000);

    act(() => {
      vi.setSystemTime(START_MS + 700_000);
      setVisibility("visible");
    });
    expect(result.current).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("expires at once when the deadline has already passed at mount", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useExamDeadline({ deadline: new Date(START_MS - 1000).toISOString(), onExpire }));

    expect(result.current).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("stops listening and timing after unmount", () => {
    const onExpire = vi.fn();
    const { unmount } = renderHook(() => useExamDeadline({ deadline: new Date(START_MS + 1000).toISOString(), onExpire }));

    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
      setVisibility("visible");
    });
    expect(onExpire).not.toHaveBeenCalled();
  });
});

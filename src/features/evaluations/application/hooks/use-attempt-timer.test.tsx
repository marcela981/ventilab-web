/*
* Funcionalidad: useAttemptTimer tests
* Descripción: Hook tests of the attempt countdown with vitest fake timers: the clock offset uses the arrival time recorded for the response that carried serverNow (a cached attempt rendered a minute later does not gain that minute), it falls back to the current clock when no arrival is recorded, and a fresh serverNow restarts the countdown with the new offset. Depends on vitest, Testing Library, the toast provider and the attempt response clock.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@shared/design-system/components/toast-provider";
import { clearAttemptResponses, recordAttemptResponse } from "../entities/attempt-response-clock";
import type { UseAttemptTimerOptions } from "./use-attempt-timer";
import { useAttemptTimer } from "./use-attempt-timer";

const SERVER_NOW = "2026-10-14T15:00:00.000Z";
const DEADLINE = "2026-10-14T15:10:00.000Z";
const TEN_MINUTES = 10 * 60_000;

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function renderTimer(options: Partial<UseAttemptTimerOptions> = {}) {
  return renderHook((props: UseAttemptTimerOptions) => useAttemptTimer(props), {
    wrapper,
    initialProps: { attemptId: "at1", deadlineAt: DEADLINE, serverNow: SERVER_NOW, onExpire: vi.fn(), ...options },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse(SERVER_NOW));
  clearAttemptResponses();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAttemptTimer", () => {
  it("measures the offset at the arrival of the response, not when a cached attempt renders", () => {
    recordAttemptResponse("at1", SERVER_NOW, Date.now());
    vi.setSystemTime(Date.parse(SERVER_NOW) + 60_000);

    const { result } = renderTimer();

    expect(result.current).toBe(TEN_MINUTES - 60_000);
  });

  it("falls back to the current clock when the arrival of that serverNow is unknown", () => {
    recordAttemptResponse("at1", "2026-10-14T14:00:00.000Z", Date.now() - 3_600_000);
    vi.setSystemTime(Date.parse(SERVER_NOW) + 60_000);

    const { result } = renderTimer();

    expect(result.current).toBe(TEN_MINUTES);
  });

  it("restarts with the new offset when a fresh serverNow arrives", () => {
    const { result, rerender } = renderTimer();

    expect(result.current).toBe(TEN_MINUTES);

    // Fresh response: the server says 2 minutes passed, received now.
    const fresh = "2026-10-14T15:02:00.000Z";

    recordAttemptResponse("at1", fresh, Date.now());
    rerender({ attemptId: "at1", deadlineAt: DEADLINE, serverNow: fresh, onExpire: vi.fn() });

    expect(result.current).toBe(TEN_MINUTES - 120_000);
  });
});

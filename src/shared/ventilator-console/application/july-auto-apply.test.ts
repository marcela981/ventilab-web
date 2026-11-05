/*
* Funcionalidad: July console auto apply scheduler tests
* Descripción: Unit tests of the auto apply scheduler with fake timers: a discrete input applies in the same tick, a continuous input applies 300 ms after its last change (one application for a burst), a discrete input applies what a continuous one left debouncing, flush applies now (Enter) and cancel drops the wait (Esc), and the delays are read at scheduling time. v0.1 (Ajustes A, A1): first version. Depends on Vitest and the scheduler.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTO_APPLY_DEBOUNCE_MS, createAutoApplyScheduler } from "./july-auto-apply";
import type { AutoApplyDelays } from "./july-auto-apply";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createAutoApplyScheduler", () => {
  it("uses 0 ms for discrete inputs and 300 ms for sliders and the wheel", () => {
    expect(AUTO_APPLY_DEBOUNCE_MS).toEqual({ discrete: 0, continuous: 300 });
  });

  it("applies a discrete input in the same tick", () => {
    const apply = vi.fn();
    const scheduler = createAutoApplyScheduler({ apply });

    scheduler.schedule("discrete");

    expect(apply).toHaveBeenCalledTimes(1);
    expect(scheduler.isScheduled()).toBe(false);
  });

  it("applies a burst of continuous changes once, 300 ms after the last one", () => {
    const apply = vi.fn();
    const scheduler = createAutoApplyScheduler({ apply });

    scheduler.schedule("continuous");
    vi.advanceTimersByTime(200);
    scheduler.schedule("continuous");
    vi.advanceTimersByTime(299);

    expect(apply).not.toHaveBeenCalled();
    expect(scheduler.isScheduled()).toBe(true);

    vi.advanceTimersByTime(1);

    expect(apply).toHaveBeenCalledTimes(1);
    expect(scheduler.isScheduled()).toBe(false);
  });

  it("applies what a slider left debouncing when a discrete input arrives", () => {
    const apply = vi.fn();
    const scheduler = createAutoApplyScheduler({ apply });

    scheduler.schedule("continuous");
    scheduler.schedule("discrete");

    expect(apply).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);

    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("flushes now on Enter and drops the wait on Escape", () => {
    const apply = vi.fn();
    const scheduler = createAutoApplyScheduler({ apply });

    expect(scheduler.flush()).toBe(false);
    scheduler.schedule("continuous");
    expect(scheduler.flush()).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);

    scheduler.schedule("continuous");
    expect(scheduler.cancel()).toBe(true);
    vi.advanceTimersByTime(1000);

    expect(apply).toHaveBeenCalledTimes(1);
    expect(scheduler.cancel()).toBe(false);
  });

  it("reads the delays when an edit is scheduled", () => {
    const apply = vi.fn();
    let delays: AutoApplyDelays = { discrete: 0, continuous: 300 };
    const scheduler = createAutoApplyScheduler({ apply, delays: () => delays });

    delays = { discrete: 50, continuous: 0 };
    scheduler.schedule("continuous");

    expect(apply).toHaveBeenCalledTimes(1);

    scheduler.schedule("discrete");
    vi.advanceTimersByTime(49);
    expect(apply).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(apply).toHaveBeenCalledTimes(2);
  });
});

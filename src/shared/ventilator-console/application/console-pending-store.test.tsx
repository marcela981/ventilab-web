/*
* Funcionalidad: Console pending edits store tests
* Descripción: Unit tests of the per-console pending store: it runs the controls reducer and notifies only on a new state, the per-parameter selectors are stable and isolate one control from the edits of another (render counters), the edit operations adjust from the reported base (none without one) and preview the value, a mode selection drops the parameters that no longer apply, the confirmation diff and its count, the lifecycle hook reports only transitions (and false on unmount) and drops the edits on a new reset key, and two ConsoleControls sharing a store see the same edits. v0.1 (Bloque 5, C1): first version. Depends on Vitest, Testing Library and the console pending store.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Profiler } from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConsoleControls } from "./console-controls";
import {
  adjustPending,
  confirmationCount,
  createPendingControlsStore,
  isSelectedSelector,
  parameterBase,
  pendingConfirmation,
  pendingValueSelector,
  selectPendingMode,
  usePendingLifecycle,
} from "./console-pending-store";
import type { PendingControlsStore } from "./console-pending-store";
import { useStoreSelector } from "./console-store";
import type { ConsoleLimits, ConsoleMode, ConsoleSettings } from "./ventilator-console.entity";

const LIMITS: ConsoleLimits = {
  tidalVolume: { min: 200, max: 800, step: 10, unit: "mL" },
  inspiratoryPressure: { min: 5, max: 40, step: 1, unit: "cmH2O" },
  respiratoryRate: { min: 6, max: 40, step: 1, unit: "rpm" },
  peep: { min: 0, max: 20, step: 1, unit: "cmH2O" },
};
const SETTINGS: ConsoleSettings = {
  current: { tidalVolume: 450, respiratoryRate: 14, peep: 5 },
  applied: { tidalVolume: 450, respiratoryRate: 14, peep: 5 },
};
const MODE: ConsoleMode = { current: "VCV", options: [{ id: "VCV", label: "VCV" }, { id: "PCV", label: "PCV" }] };

describe("createPendingControlsStore", () => {
  it("runs the reducer, returns the next state and notifies only on a new state", () => {
    const store = createPendingControlsStore();
    const listener = vi.fn();

    store.subscribe(listener);
    const next = store.dispatch({ type: "adjust", parameter: "peep", steps: 2, base: 5, limit: LIMITS.peep! });

    expect(next.pendingValues).toEqual({ peep: 7 });
    expect(store.getSnapshot()).toBe(next);
    expect(listener).toHaveBeenCalledTimes(1);

    store.dispatch({ type: "reset" });
    store.dispatch({ type: "reset" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("caches one selector per parameter", () => {
    expect(pendingValueSelector("peep")).toBe(pendingValueSelector("peep"));
    expect(isSelectedSelector("peep")).toBe(isSelectedSelector("peep"));
    expect(pendingValueSelector("peep")).not.toBe(pendingValueSelector("fio2"));
  });

  it("re-renders a subscriber only when its own parameter changes", () => {
    const store = createPendingControlsStore();
    const renders: Record<string, number> = { peep: 0, respiratoryRate: 0 };
    const count = (id: string) => {
      renders[id] = (renders[id] ?? 0) + 1;
    };

    function Probe({ id }: { id: string }) {
      const value = useStoreSelector(store, pendingValueSelector(id));

      return <span>{value ?? "none"}</span>;
    }

    render(
      <>
        <Profiler id="peep" onRender={count}><Probe id="peep" /></Profiler>
        <Profiler id="respiratoryRate" onRender={count}><Probe id="respiratoryRate" /></Profiler>
      </>,
    );
    act(() => {
      store.dispatch({ type: "adjust", parameter: "peep", steps: 1, base: 5, limit: LIMITS.peep! });
    });
    act(() => {
      store.dispatch({ type: "adjust", parameter: "peep", steps: 1, base: 5, limit: LIMITS.peep! });
    });

    expect(renders).toEqual({ peep: 3, respiratoryRate: 1 });
  });
});

describe("edit operations", () => {
  it("adjusts from the applied value, else the current one, and previews the pending value", () => {
    const store = createPendingControlsStore();
    const onProposeChange = vi.fn();
    const settings: ConsoleSettings = { current: { peep: 8 }, applied: {} };

    expect(parameterBase(settings, "peep")).toBe(8);
    expect(adjustPending(store, { parameter: "peep", limit: LIMITS.peep!, adjustment: { kind: "steps", steps: 1 }, settings, onProposeChange })).toBe(true);
    expect(onProposeChange).toHaveBeenCalledWith({ parameter: "peep", value: 9 });
    expect(store.getSnapshot().pendingValues).toEqual({ peep: 9 });
  });

  it("does not adjust a parameter the source does not report", () => {
    const store = createPendingControlsStore();
    const onProposeChange = vi.fn();

    expect(adjustPending(store, { parameter: "inspiratoryPressure", limit: LIMITS.inspiratoryPressure!, adjustment: { kind: "value", value: 20 }, settings: SETTINGS, onProposeChange })).toBe(false);
    expect(onProposeChange).not.toHaveBeenCalled();
    expect(store.getSnapshot().pendingValues).toEqual({});
  });

  it("makes a mode pending, drops parameters that no longer apply and builds the confirmation", () => {
    const store = createPendingControlsStore();

    adjustPending(store, { parameter: "tidalVolume", limit: LIMITS.tidalVolume!, adjustment: { kind: "steps", steps: 5 }, settings: SETTINGS });
    adjustPending(store, { parameter: "peep", limit: LIMITS.peep!, adjustment: { kind: "steps", steps: 1 }, settings: SETTINGS });
    expect(confirmationCount(pendingConfirmation(store, SETTINGS, MODE))).toBe(2);

    selectPendingMode(store, "PCV", MODE, LIMITS, undefined);
    const confirmation = pendingConfirmation(store, SETTINGS, MODE);

    expect(confirmation).toEqual({ mode: "PCV", changes: [{ parameter: "peep", value: 6 }] });
    expect(confirmationCount(confirmation)).toBe(2);

    selectPendingMode(store, "VCV", MODE, LIMITS, undefined);
    store.dispatch({ type: "adjust", parameter: "peep", steps: -1, base: 5, limit: LIMITS.peep! });
    expect(pendingConfirmation(store, SETTINGS, MODE)).toBeNull();
    expect(confirmationCount(null)).toBe(0);
  });
});

describe("usePendingLifecycle", () => {
  it("reports only transitions and false on unmount with pending edits", () => {
    const store = createPendingControlsStore();
    const onPendingChange = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ hasPending }: { hasPending: boolean }) => usePendingLifecycle(store, { hasPending, onPendingChange }),
      { initialProps: { hasPending: false } },
    );

    expect(onPendingChange).not.toHaveBeenCalled();
    rerender({ hasPending: true });
    rerender({ hasPending: true });
    expect(onPendingChange.mock.calls).toEqual([[true]]);

    unmount();
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
  });

  it("drops the edits when the reset key changes, not on the first render", () => {
    const store = createPendingControlsStore();

    store.dispatch({ type: "adjust", parameter: "peep", steps: 1, base: 5, limit: LIMITS.peep! });
    const { rerender } = renderHook(
      ({ pendingResetKey }: { pendingResetKey: number }) => usePendingLifecycle(store, { hasPending: true, pendingResetKey }),
      { initialProps: { pendingResetKey: 1 } },
    );

    expect(store.getSnapshot().pendingValues).toEqual({ peep: 6 });
    rerender({ pendingResetKey: 2 });
    expect(store.getSnapshot().pendingValues).toEqual({});
  });
});

describe("ConsoleControls with a shared pending store", () => {
  function Controls({ store }: { store: PendingControlsStore }) {
    return <ConsoleControls settings={SETTINGS} mode={MODE} limits={LIMITS} readOnly={false} onConfirm={vi.fn()} pendingStore={store} />;
  }

  it("shows edits made through the store and writes its own into it", () => {
    const store = createPendingControlsStore();

    render(<Controls store={store} />);
    act(() => {
      adjustPending(store, { parameter: "peep", limit: LIMITS.peep!, adjustment: { kind: "steps", steps: 2 }, settings: SETTINGS });
    });
    expect(screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" })).toHaveAttribute("aria-valuenow", "7");
    expect(screen.getByRole("status")).toHaveTextContent("1 cambio pendiente");

    fireEvent.click(screen.getByRole("button", { name: "Aumentar FR" }));
    expect(store.getSnapshot().pendingValues).toEqual({ peep: 7, respiratoryRate: 15 });
  });
});

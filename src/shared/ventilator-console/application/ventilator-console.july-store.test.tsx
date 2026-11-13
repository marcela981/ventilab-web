/*
* Funcionalidad: VentilatorConsole July layout render isolation tests
* Descripción: With a store adapter, the July layout keeps the zones isolated: v0.2 (Ajustes A, A1): the edit applies on its own through adapter.onConfirm. An edit (a click on a control) re-renders neither the curves zone nor the value cards, and a new metrics snapshot does not re-render the shell, so neither the curves nor the cards host are re-rendered from above (the real cards subscribe to the metrics on their own). The curves zone and the value cards are mocked as render counters. v0.1 (Bloque 5, C3): first version. Depends on Vitest, Testing Library and the console.
*   v0.3 (2026-11-10, reverts A-1 to A-4): the edits wait for Enviar, which emits them once.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExternalStore, reuseUnchangedSlices } from "./console-store";
import { VentilatorConsole } from "./ventilator-console";
import type { VentilatorConsoleAdapter } from "./ventilator-console.entity";

const counts = vi.hoisted(() => ({ curves: 0, cards: 0 }));

vi.mock("./curves-zone", () => ({
  CurvesZone: () => {
    counts.curves += 1;

    return null;
  },
}));

vi.mock("./monitor-cards", () => ({
  MonitorCards: () => {
    counts.cards += 1;

    return null;
  },
}));

const VALUES = { peep: 5, fio2: 40 };
const FRAMES = { subscribe: () => () => undefined };

function adapter(peakPressure: number): VentilatorConsoleAdapter {
  return {
    frames: FRAMES,
    settings: { current: VALUES, applied: VALUES },
    mode: { current: "VCV", options: [{ id: "VCV", label: "VCV" }] },
    metrics: { peakPressure },
    patient: { values: {} },
    alarms: [],
    permissions: { canControl: true },
    limits: { peep: { min: 0, max: 20, step: 1, unit: "cmH2O" }, fio2: { min: 21, max: 100, step: 1, unit: "%" } },
    onConfirm: confirmed,
  };
}

beforeEach(() => {
  counts.curves = 0;
  counts.cards = 0;
});

const confirmed = vi.fn();

describe("VentilatorConsole layout=\"july\" with a store adapter", () => {
  it("re-renders neither the curves nor the cards host on an edit or on new metrics", () => {
    const first = adapter(20);
    const store = createExternalStore(first);

    render(<VentilatorConsole adapter={store} layout="july" />);
    const mounted = { ...counts };

    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    // Pending until Enviar (2026-11-10, reverts A-1 to A-4); then one confirmation through the adapter.
    expect(confirmed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(counts).toEqual(mounted);

    act(() => {
      store.set(reuseUnchangedSlices(first, adapter(25)));
    });
    expect(counts.curves).toBe(mounted.curves);
    expect(counts.cards).toBe(mounted.cards);
  });
});

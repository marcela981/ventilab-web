/*
* Funcionalidad: Monitor value cards tests
* Descripción: The July value cards with a preference controller: the pure order helpers (moves relative to the cards on screen, reorder keeping the off-screen slots, hide toggle), "Ajustar" mounting the drag-and-drop list only while adjusting (handles "Mover", "Subir" / "Bajar", "Ocultar" / "Mostrar" with aria-pressed, "Restablecer tarjetas"), hidden cards gone outside "Ajustar", the saved preference applied, the EXAM lock (disabled with its reason, preference still applied), and the isolation proof: adjusting the cards never re-renders the console shell nor the curves (the shell logo image and the curves zone are mocked as render counters). v0.1 (Bloque 5, C5): first version. Depends on Vitest, Testing Library and the console.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MonitorCardId } from "./config/console.config";
import { createExternalStore } from "./console-store";
import { createMemoryCardsController, moveCardInView, reorderCardsInView, toggleHiddenCard } from "./monitor-cards";
import { VentilatorConsole } from "./ventilator-console";
import type { VentilatorConsoleAdapter } from "./ventilator-console.entity";

const counts = vi.hoisted(() => ({ shell: 0, curves: 0 }));

// The logos render straight in the July shell: a shell render renders them again.
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => {
    counts.shell += 1;

    return <span role="img" aria-label={alt} />;
  },
}));

vi.mock("./curves-zone", () => ({
  CurvesZone: () => {
    counts.curves += 1;

    return null;
  },
}));

const FRAMES = { subscribe: () => () => undefined };

function makeAdapter(): VentilatorConsoleAdapter {
  return {
    frames: FRAMES,
    settings: { current: { peep: 5 }, applied: { peep: 5 } },
    mode: { current: "VCV", options: [{ id: "VCV", label: "VCV" }] },
    metrics: { peakPressure: 22, meanPressure: 9 },
    patient: { values: { spo2: 95 } },
    alarms: [],
    permissions: { canControl: true },
    limits: { peep: { min: 0, max: 20, step: 1, unit: "cmH2O" } },
    onConfirm: () => undefined,
  };
}

const cardTerms = () => within(screen.getByRole("list", { name: "Valores del monitor" })).getAllByRole("term").map((term) => term.textContent);

beforeEach(() => {
  counts.shell = 0;
  counts.curves = 0;
});

describe("value card order helpers", () => {
  const layout = { order: ["peakPressure", "spo2", "meanPressure", "totalPeep"] as MonitorCardId[], hidden: [] };
  const onScreen: MonitorCardId[] = ["peakPressure", "meanPressure", "totalPeep"];

  it("moves relative to the cards on screen", () => {
    expect(moveCardInView(layout, onScreen, "peakPressure", 1).order).toEqual(["meanPressure", "spo2", "peakPressure", "totalPeep"]);
    expect(moveCardInView(layout, onScreen, "peakPressure", -1)).toBe(layout);
  });

  it("reorders the cards on screen and keeps the other slots", () => {
    expect(reorderCardsInView(layout, onScreen, 2, 0).order).toEqual(["totalPeep", "spo2", "peakPressure", "meanPressure"]);
    expect(reorderCardsInView(layout, onScreen, 1, 1)).toBe(layout);
  });

  it("toggles a hidden card", () => {
    expect(toggleHiddenCard(layout, "spo2").hidden).toEqual(["spo2"]);
    expect(toggleHiddenCard({ ...layout, hidden: ["spo2"] }, "spo2").hidden).toEqual([]);
  });
});

describe("MonitorCards in the July console", () => {
  it("applies the preference and adjusts it without re-rendering the console", async () => {
    const cards = createMemoryCardsController();
    const store = createExternalStore(makeAdapter());

    render(<VentilatorConsole adapter={store} layout="july" cards={cards} />);
    const mounted = { ...counts };

    expect(cardTerms().slice(0, 2)).toEqual(["Ppico", "Pmedia"]);
    expect(screen.queryByRole("button", { name: "Mover Ppico" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ajustar" }));
    expect(screen.getByRole("button", { name: "Ajustar" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByRole("button", { name: "Mover Ppico" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bajar Ppico" }));
    expect(cardTerms().slice(0, 2)).toEqual(["Pmedia", "Ppico"]);
    fireEvent.click(screen.getByRole("button", { name: "Subir SpO2" }));
    const hide = screen.getByRole("button", { name: "Ocultar PEEP total" });

    expect(hide).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(hide);
    expect(screen.getByRole("button", { name: "Mostrar PEEP total" })).toHaveAttribute("aria-pressed", "true");
    expect(cards.getSnapshot().hidden).toEqual(["totalPeep"]);

    fireEvent.click(screen.getByRole("button", { name: "Ajustar" }));
    expect(cardTerms()).not.toContain("PEEP total");
    expect(screen.queryByRole("button", { name: /^Mover / })).not.toBeInTheDocument();

    expect(counts).toEqual(mounted);

    fireEvent.click(screen.getByRole("button", { name: "Ajustar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Restablecer tarjetas" }));
    expect(cards.getSnapshot().hidden).toEqual([]);
    expect(cardTerms().slice(0, 2)).toEqual(["Ppico", "Pmedia"]);
    expect(counts).toEqual(mounted);
  });

  it("locks Ajustar in EXAM and still applies the saved preference", () => {
    const cards = createMemoryCardsController({ order: ["meanPressure", "peakPressure"], hidden: ["peakPressure"] });

    render(<VentilatorConsole adapter={makeAdapter()} layout="july" cards={cards} cardsLockedReason="Disponible fuera del examen" />);
    const adjust = screen.getByRole("button", { name: "Ajustar" });

    expect(adjust).toBeDisabled();
    expect(adjust).toHaveAccessibleDescription("Disponible fuera del examen");
    expect(cardTerms()).toEqual(["Pmedia"]);
  });
});

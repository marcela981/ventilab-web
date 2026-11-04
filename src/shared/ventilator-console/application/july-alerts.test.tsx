/*
* Funcionalidad: July alerts tests
* Descripción: The alerts of the July console (C9): "Estado de la mecánica" with the derived Cst / Cdin, "Alertas (n)" counting only sourced validation alerts (metrics outside their range, unconfirmed edits, rejected changes), "Ver alertas detalladas" and "Historial de alarmas" opening the same 380 px "Alertas detalladas" drawer (validation, alarm history, limits only when the source has them), Escape closing it and giving the focus back to the button that opened it, and the icon-only alarm actions keeping their accessible names. v0.1 (Bloque 5, C9): first version. Depends on Vitest, Testing Library and the console.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VentilatorConsole } from "./ventilator-console";
import type { VentilatorConsoleAdapter } from "./ventilator-console.entity";

const VALUES = { fio2: 40, tidalVolume: 450, peep: 5, respiratoryRate: 15, inspiratoryTime: 1 };

function makeAdapter(overrides: Partial<VentilatorConsoleAdapter> = {}): VentilatorConsoleAdapter {
  return {
    frames: { subscribe: () => () => undefined },
    settings: { current: VALUES, applied: VALUES },
    mode: { current: "VCV", options: [{ id: "VCV", label: "VCV" }, { id: "PCV", label: "PCV" }] },
    metrics: { peakPressure: 40, plateauPressure: 20, totalPeep: 5, exhaledTidalVolume: 450 },
    patient: { values: {} },
    alarms: [],
    permissions: { canControl: true },
    limits: {
      fio2: { min: 21, max: 100, step: 1, unit: "%" },
      tidalVolume: { min: 200, max: 800, step: 10, unit: "mL" },
      peep: { min: 0, max: 20, step: 1, unit: "cmH2O" },
      respiratoryRate: { min: 6, max: 40, step: 1, unit: "rpm" },
      inspiratoryTime: { min: 0.3, max: 3, step: 0.05, unit: "s" },
    },
    onConfirm: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const drawer = () => screen.queryByRole("complementary", { name: "Alertas detalladas" });

describe("July alerts", () => {
  it("shows the derived mechanics and counts the sourced validation alerts", () => {
    render(<VentilatorConsole adapter={makeAdapter()} layout="july" />);
    const mechanics = screen.getByRole("region", { name: "Estado de la mecánica" });

    // Cst = 450 / (20 − 5) = 30; Cdin = 450 / (40 − 5) ≈ 13.
    expect(within(mechanics).getByText("Cst").nextElementSibling).toHaveTextContent("30 mL/cmH2O");
    expect(within(mechanics).getByText("Cdin").nextElementSibling).toHaveTextContent("13 mL/cmH2O");
    expect(within(mechanics).getAllByText("derivada")).toHaveLength(2);
    // Ppico 40 > 35 is the only out-of-range metric.
    expect(screen.getByText("Alertas (1)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    expect(screen.getByText("Alertas (2)")).toBeInTheDocument();
  });

  it("opens one drawer from the right column or the alarms bar and Escape gives the focus back", () => {
    const rejected = makeAdapter({ settings: { current: VALUES, applied: VALUES, inFlight: { peep: { status: "rejected", message: "fuera de rango" } } } });

    render(<VentilatorConsole adapter={rejected} layout="july" />);
    const open = screen.getByRole("button", { name: "Ver alertas detalladas" });

    open.focus();
    fireEvent.click(open);
    const panel = drawer();

    expect(panel).not.toBeNull();
    expect(open).toHaveAttribute("aria-expanded", "true");
    expect(open).toHaveTextContent("Ocultar alertas");
    expect(within(panel!).getByRole("region", { name: "Alertas de validación" })).toHaveTextContent("Presión pico");
    expect(within(panel!).getByRole("region", { name: "Alertas de validación" })).toHaveTextContent("PEEP: el equipo rechazó el cambio — fuera de rango");
    expect(within(panel!).getByRole("region", { name: /^Historial de alarmas/ })).toHaveTextContent("Sin eventos de alarma en esta sesión.");
    // No alarm limits from this source: no limits panel, no "Límites" button.
    expect(within(panel!).queryByRole("region", { name: "Límites de alarma" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Límites" })).not.toBeInTheDocument();

    fireEvent.keyDown(panel!, { key: "Escape" });
    expect(drawer()).toBeNull();
    expect(open).toHaveFocus();

    const history = screen.getByRole("button", { name: "Historial de alarmas (0)" });

    history.focus();
    fireEvent.click(history);
    expect(history).toHaveAttribute("aria-expanded", "true");
    expect(drawer()).not.toBeNull();
    fireEvent.click(within(drawer()!).getByRole("button", { name: "Ocultar alertas" }));
    expect(drawer()).toBeNull();
    expect(history).toHaveFocus();
  });

  it("puts the alarm limits in the drawer when the source offers them", () => {
    const adapter = makeAdapter({
      alarmLimits: [{ id: "peakPressureHigh", label: "Presión pico alta", min: 10, max: 60, step: 1, unit: "cmH2O", value: 40 }],
      onAlarmLimitsChange: vi.fn(),
    });

    render(<VentilatorConsole adapter={adapter} layout="july" />);
    fireEvent.click(screen.getByRole("button", { name: "Límites" }));

    expect(within(drawer()!).getByRole("region", { name: "Límites de alarma" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Silenciar 2 min" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sonido desactivado" })).toHaveAttribute("aria-pressed", "false");
  });
});

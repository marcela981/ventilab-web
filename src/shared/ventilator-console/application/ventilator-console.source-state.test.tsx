/*
* Funcionalidad: VentilatorConsole source-state tests
* Descripción: Covers the generic, optional source-state additions of the console contract (v1.4): hiding the patient monitor through `capabilities.patientMonitor`, the read-only reason next to the badge and on the disabled controls (aria-describedby), the per-parameter in-flight state of confirmed changes (tag, applied value kept, no re-edit while sending/awaiting), the frame-source `no-data` status (overlay with a configurable message, greyed curves, controls disabled), the derived-metric marker, the dash for a parameter the source does not report (v1.1: and that it cannot be stepped from an invented base while control is allowed) and the generic PCO2 vital. v1.2: `permissions.pendingResetKey` drops the unconfirmed edits when it changes. Depends on Vitest and Testing Library.
* Versión: 1.2
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

function makeAdapter(overrides: Partial<VentilatorConsoleAdapter> = {}): VentilatorConsoleAdapter {
  return {
    frames: { subscribe: () => () => undefined },
    settings: { current: { peep: 5, respiratoryRate: 14 }, applied: { peep: 5, respiratoryRate: 14 } },
    mode: { current: "VCV", options: [{ id: "VCV", label: "VCV" }] },
    metrics: { peakPressure: 20 },
    patient: { values: { spo2: 96 } },
    alarms: [],
    permissions: { canControl: true },
    limits: {
      peep: { min: 0, max: 20, step: 1, unit: "cmH2O" },
      respiratoryRate: { min: 5, max: 40, step: 1, unit: "rpm" },
    },
    onConfirm: vi.fn(),
    ...overrides,
  };
}

function tileOf(label: string): HTMLElement {
  const tile = screen.getByText(label, { selector: "dt" }).parentElement;

  if (!tile) {
    throw new Error(`No tile for ${label}`);
  }

  return tile;
}

function parameterItem(label: string): HTMLElement {
  const item = screen.getByRole("spinbutton", { name: label }).closest("li");

  if (!item) {
    throw new Error(`No parameter ${label}`);
  }

  return item;
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VentilatorConsole source state", () => {
  it("hides the patient monitor zone entirely when the source declares no patient monitor", () => {
    const adapter = makeAdapter();
    const { rerender } = render(<VentilatorConsole adapter={adapter} />);

    expect(screen.getByRole("region", { name: "Paciente" })).toBeInTheDocument();

    rerender(<VentilatorConsole adapter={{ ...adapter, capabilities: { patientMonitor: false } }} />);
    expect(screen.queryByRole("region", { name: "Paciente" })).not.toBeInTheDocument();
    expect(screen.queryByText("La fuente de datos no informa signos del paciente.")).not.toBeInTheDocument();
  });

  it("shows the read-only reason next to the badge and describes the disabled controls with it", () => {
    render(<VentilatorConsole adapter={makeAdapter({ permissions: { canControl: false, readOnlyReason: "Otra persona tiene el control." } })} />);

    const badge = screen.getByText("Solo lectura").parentElement as HTMLElement;
    expect(badge).toHaveTextContent("Otra persona tiene el control.");

    const spin = screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });
    const describedBy = spin.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")).toHaveTextContent("Otra persona tiene el control.");
    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveAttribute("aria-describedby", describedBy);
  });

  it("keeps the badge without a reason when none is given", () => {
    render(<VentilatorConsole adapter={makeAdapter({ permissions: { canControl: false } })} />);

    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" })).not.toHaveAttribute("aria-describedby");
  });

  it("tags the parameters with a change in flight and keeps showing the applied value", () => {
    const adapter = makeAdapter({
      settings: {
        current: { peep: 5, respiratoryRate: 14 },
        applied: { peep: 5, respiratoryRate: 14 },
        inFlight: {
          peep: { status: "awaiting" },
          respiratoryRate: { status: "rejected", message: "Fuera de rango" },
        },
      },
    });
    const { rerender } = render(<VentilatorConsole adapter={adapter} />);
    const peep = parameterItem("Presión positiva al final de la espiración");
    const rate = parameterItem("Frecuencia respiratoria");

    expect(within(peep).getByText("Esperando confirmación del equipo")).toBeInTheDocument();
    expect(within(peep).getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "5");
    expect(peep).toHaveAttribute("data-in-flight", "awaiting");
    // A change awaiting the source cannot be edited again; a rejected one can.
    expect(within(peep).getByRole("button", { name: "Aumentar PEEP" })).toBeDisabled();
    expect(within(rate).getByText("Rechazado: Fuera de rango")).toBeInTheDocument();
    expect(within(rate).getByRole("button", { name: "Aumentar FR" })).toBeEnabled();

    rerender(<VentilatorConsole adapter={{ ...adapter, settings: { ...adapter.settings, inFlight: { peep: { status: "sending" } } } }} />);
    expect(within(parameterItem("Presión positiva al final de la espiración")).getByText("Enviando")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("shows a dash for a parameter the source does not report", () => {
    render(<VentilatorConsole adapter={makeAdapter({ settings: { current: {}, applied: {} }, permissions: { canControl: false } })} />);
    const spin = screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });

    expect(spin).toHaveTextContent("—");
    expect(spin).not.toHaveAttribute("aria-valuenow");
    expect(spin).toHaveAttribute("aria-valuetext", "Sin valor informado");
  });

  it("never steps an unreported parameter from an invented base, even when the source allows control", () => {
    const onConfirm = vi.fn();
    render(
      <VentilatorConsole
        adapter={makeAdapter({ settings: { current: { respiratoryRate: 14 }, applied: { respiratoryRate: 14 } }, onConfirm })}
      />,
    );
    const spin = screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });
    const peep = parameterItem("Presión positiva al final de la espiración");

    expect(within(peep).getByRole("button", { name: "Aumentar PEEP" })).toBeDisabled();
    expect(within(peep).getByRole("button", { name: "Disminuir PEEP" })).toBeDisabled();
    fireEvent.click(spin);
    for (const key of ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]) {
      fireEvent.keyDown(spin, { key });
    }
    fireEvent.wheel(spin, { deltaY: -100 });

    expect(within(peep).queryByText("Pendiente")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
    // A reported parameter of the same console stays editable.
    expect(screen.getByRole("button", { name: "Aumentar FR" })).toBeEnabled();
  });

  it("drops the unconfirmed edits when permissions.pendingResetKey changes, and only then (v1.2)", () => {
    const onConfirm = vi.fn();
    const adapter = makeAdapter({ onConfirm, permissions: { canControl: true, pendingResetKey: 0 } });
    const { rerender } = render(<VentilatorConsole adapter={adapter} />);

    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    expect(screen.getByText("1 cambio pendiente")).toBeInTheDocument();

    // Same key (any other rerender, even read-only): the edit stays.
    rerender(<VentilatorConsole adapter={{ ...adapter, permissions: { canControl: false, pendingResetKey: 0 } }} />);
    expect(screen.getByText("1 cambio pendiente")).toBeInTheDocument();

    // New key (e.g. the control was taken away): the edit is dropped and nothing is emitted.
    rerender(<VentilatorConsole adapter={{ ...adapter, permissions: { canControl: false, pendingResetKey: 1 } }} />);
    expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument();
    rerender(<VentilatorConsole adapter={{ ...adapter, permissions: { canControl: true, pendingResetKey: 1 } }} />);
    expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("overlays the curves, greys them and disables the controls while the frame source has no data", () => {
    const adapter = makeAdapter();
    const { rerender } = render(<VentilatorConsole adapter={{ ...adapter, frames: { ...adapter.frames, status: "no-data" } }} />);

    const curves = screen.getByRole("region", { name: "Curvas" });
    expect(within(curves).getByRole("status")).toHaveTextContent("Sin datos de la fuente");
    expect(curves).toHaveAttribute("data-source-status", "no-data");
    expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeDisabled();
    expect(screen.getByText("Solo lectura").parentElement).toHaveTextContent("Sin datos de la fuente");

    rerender(<VentilatorConsole adapter={{ ...adapter, frames: { ...adapter.frames, status: "no-data", statusMessage: "Equipo sin datos" } }} />);
    expect(within(screen.getByRole("region", { name: "Curvas" })).getByRole("status")).toHaveTextContent("Equipo sin datos");

    rerender(<VentilatorConsole adapter={{ ...adapter, frames: { ...adapter.frames, status: "live" } }} />);
    expect(within(screen.getByRole("region", { name: "Curvas" })).queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Curvas" })).toHaveAttribute("data-source-status", "live");
    expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeEnabled();
    expect(screen.queryByText("Solo lectura")).not.toBeInTheDocument();
  });

  it("marks derived metrics with a visible and accessible label", () => {
    render(<VentilatorConsole adapter={makeAdapter({ metrics: { peakPressure: { value: 22, derived: true }, plateauPressure: { value: null, derived: true }, totalPeep: 5 } })} />);

    expect(tileOf("Ppico")).toHaveTextContent("22cmH2O");
    expect(within(tileOf("Ppico")).getByText("derivada")).toHaveAttribute("title", "Calculada a partir de las curvas");
    expect(tileOf("Pplat")).toHaveTextContent("—");
    expect(within(tileOf("Pplat")).getByText("derivada")).toBeInTheDocument();
    expect(within(tileOf("PEEP total")).queryByText("derivada")).not.toBeInTheDocument();
  });

  it("relabels a metric tile when the reading names a narrower measurement", () => {
    render(<VentilatorConsole adapter={makeAdapter({ metrics: { totalPeep: { value: 5, derived: true, label: "PEEP", description: "PEEP al final de la espiración" } } })} />);

    expect(screen.queryByText("PEEP total", { selector: "dt" })).not.toBeInTheDocument();
    expect(tileOf("PEEP")).toHaveTextContent("5.0cmH2O");
    expect(screen.getByText("PEEP", { selector: "dt" })).toHaveAttribute("title", "PEEP al final de la espiración");
  });

  it("shows a generic PCO2 vital when the source provides it", () => {
    render(<VentilatorConsole adapter={makeAdapter({ patient: { values: { pco2: 40 } } })} />);
    const patient = screen.getByRole("region", { name: "Paciente" });

    expect(within(patient).getAllByRole("term").map((term) => term.textContent)).toEqual(["PCO2"]);
    expect(tileOf("PCO2")).toHaveTextContent("40mmHg");
  });
});

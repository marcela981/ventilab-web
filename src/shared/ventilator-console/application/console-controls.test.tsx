/*
* Funcionalidad: ConsoleControls tests
* Descripción: Renders the ventilator console controls in jsdom: only the parameters of the current mode, pending edits highlighted with "Pendiente" that emit nothing but the optional proposal, CONFIRMAR emitting the diff once, CANCELAR and Escape emitting nothing, keyboard/wheel adjustment clamped to the injected limits, a mode change that stays pending until confirmed, the configure variant wording and the read-only state. v1.2: +/- and the arrow keys are disabled for a parameter without a valid step grid. Depends on Vitest and Testing Library.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConsoleControls } from "./console-controls";
import type { ConsoleControlsProps } from "./console-controls";

function renderControls(overrides: Partial<ConsoleControlsProps> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const onProposeChange = vi.fn();
  const props: ConsoleControlsProps = {
    settings: { current: { tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4, inspiratoryPressure: 15 }, applied: { tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4, inspiratoryPressure: 15 } },
    mode: {
      current: "VCV",
      options: [
        { id: "VCV", label: "VCV" },
        { id: "PCV", label: "PCV" },
      ],
    },
    limits: {
      tidalVolume: { min: 200, max: 800, step: 10, unit: "mL" },
      respiratoryRate: { min: 5, max: 40, step: 1, unit: "rpm" },
      peep: { min: 0, max: 20, step: 1, unit: "cmH2O" },
      fio2: { min: 0.21, max: 1, step: 0.01, unit: "" },
      inspiratoryPressure: { min: 5, max: 40, step: 1, unit: "cmH2O" },
    },
    readOnly: false,
    onConfirm,
    onCancel,
    onProposeChange,
    ...overrides,
  };
  render(<ConsoleControls {...props} />);

  return { onConfirm, onCancel, onProposeChange };
}

const peep = () => screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });

describe("ConsoleControls", () => {
  it("shows only the parameters of the current mode with their injected limits", () => {
    renderControls();

    expect(screen.getAllByRole("spinbutton").map((node) => node.getAttribute("aria-label"))).toEqual([
      "Volumen corriente",
      "Frecuencia respiratoria",
      "Presión positiva al final de la espiración",
      "Fracción inspirada de oxígeno",
    ]);
    expect(screen.getByText("0–20 cmH2O")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "Presión inspiratoria" })).not.toBeInTheDocument();
  });

  it("keeps an edit pending without emitting it, then confirms once with the diff", () => {
    const { onConfirm, onProposeChange } = renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));

    expect(peep()).toHaveAttribute("aria-valuenow", "7");
    expect(peep().closest("li")).toHaveAttribute("data-pending", "true");
    expect(within(peep().closest("li") as HTMLElement).getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 cambio pendiente");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onProposeChange).toHaveBeenLastCalledWith({ parameter: "peep", value: 7 });

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({ mode: null, changes: [{ parameter: "peep", value: 7 }] });
    expect(peep()).toHaveAttribute("aria-valuenow", "5");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("reverts with CANCELAR and with Escape and emits no change", () => {
    const { onConfirm, onCancel } = renderControls();

    fireEvent.keyDown(peep(), { key: "ArrowUp" });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(peep()).toHaveAttribute("aria-valuenow", "5");

    fireEvent.keyDown(peep(), { key: "PageUp" });
    expect(peep()).toHaveAttribute("aria-valuenow", "15");
    fireEvent.keyDown(peep(), { key: "Escape" });
    expect(peep()).toHaveAttribute("aria-valuenow", "5");

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("clamps keyboard and wheel adjustments to the injected limits", () => {
    renderControls();

    fireEvent.keyDown(peep(), { key: "End" });
    expect(peep()).toHaveAttribute("aria-valuenow", "20");
    fireEvent.keyDown(peep(), { key: "PageUp" });
    expect(peep()).toHaveAttribute("aria-valuenow", "20");
    expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeDisabled();

    fireEvent.keyDown(peep(), { key: "Home" });
    fireEvent.click(peep());
    fireEvent.wheel(peep(), { deltaY: 100 });
    expect(peep()).toHaveAttribute("aria-valuenow", "0");
    fireEvent.wheel(peep(), { deltaY: -100 });
    expect(peep()).toHaveAttribute("aria-valuenow", "1");
  });

  it("adjusts with the wheel only when the control is selected and ignores a zero delta", () => {
    renderControls();
    const rate = () => screen.getByRole("spinbutton", { name: "Frecuencia respiratoria" });

    fireEvent.wheel(rate(), { deltaY: -100 });
    expect(rate()).toHaveAttribute("aria-valuenow", "14");

    fireEvent.click(rate());
    fireEvent.wheel(rate(), { deltaY: 0 });
    expect(rate()).toHaveAttribute("aria-valuenow", "14");
    fireEvent.wheel(rate(), { deltaY: -100 });
    expect(rate()).toHaveAttribute("aria-valuenow", "15");
  });

  it("drops the pending tag when the applied value catches up with the pending one", () => {
    const props = {
      mode: { current: "VCV", options: [{ id: "VCV", label: "VCV" }] },
      limits: { peep: { min: 0, max: 20, step: 1, unit: "cmH2O" } },
      readOnly: false,
      onConfirm: vi.fn(),
    };
    const { rerender } = render(<ConsoleControls {...props} settings={{ current: { peep: 5 }, applied: { peep: 5 } }} />);

    fireEvent.keyDown(peep(), { key: "ArrowUp" });
    expect(peep().closest("li")).toHaveAttribute("data-pending", "true");

    rerender(<ConsoleControls {...props} settings={{ current: { peep: 6 }, applied: { peep: 6 } }} />);

    expect(peep().closest("li")).toHaveAttribute("data-pending", "false");
    expect(within(peep().closest("li") as HTMLElement).queryByText("Pendiente")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Sin cambios pendientes");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("does not emit a pending mode once it is the applied mode", () => {
    const base = {
      settings: { current: { peep: 5 }, applied: { peep: 5 } },
      limits: { peep: { min: 0, max: 20, step: 1, unit: "cmH2O" } },
      readOnly: false,
    };
    const options = [
      { id: "VCV", label: "VCV" },
      { id: "PCV", label: "PCV" },
    ];
    const onConfirm = vi.fn();
    const { rerender } = render(<ConsoleControls {...base} mode={{ current: "VCV", options }} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: /PCV/ }));
    rerender(<ConsoleControls {...base} mode={{ current: "PCV", options }} onConfirm={onConfirm} />);

    expect(screen.getByRole("button", { name: /PCV/ })).not.toHaveTextContent("Pendiente");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();

    fireEvent.keyDown(peep(), { key: "ArrowUp" });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledWith({ mode: null, changes: [{ parameter: "peep", value: 6 }] });
  });

  it("makes a mode change pending and applies it only on confirm", () => {
    const { onConfirm } = renderControls();
    const modes = screen.getByRole("group", { name: "Modo ventilatorio" });

    fireEvent.click(within(modes).getByRole("button", { name: /PCV/ }));

    expect(within(modes).getByRole("button", { name: /PCV/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(modes).getByRole("button", { name: /PCV/ })).toHaveTextContent("Pendiente");
    expect(screen.getByRole("spinbutton", { name: "Presión inspiratoria" })).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "Volumen corriente" })).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledWith({ mode: "PCV", changes: [] });
  });

  it("uses the configure wording in the case editor", () => {
    const { onConfirm } = renderControls({ variant: "configure" });

    fireEvent.keyDown(peep(), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onConfirm).toHaveBeenCalledWith({ mode: null, changes: [{ parameter: "peep", value: 4 }] });
    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
  });

  it("disables +/- and the arrow keys for a parameter without a valid step grid", () => {
    const { onProposeChange } = renderControls({
      limits: {
        tidalVolume: { min: 200, max: 800, step: 10, unit: "mL" },
        respiratoryRate: { min: 5, max: 40, step: 1, unit: "rpm" },
        peep: { min: 0, max: 20, step: 0, unit: "cmH2O" },
        fio2: { min: 0.21, max: 1, step: 0.01, unit: "" },
        inspiratoryPressure: { min: 5, max: 40, step: 1, unit: "cmH2O" },
      },
    });

    expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disminuir PEEP" })).toBeDisabled();

    fireEvent.keyDown(peep(), { key: "ArrowUp" });
    expect(peep()).toHaveAttribute("aria-valuenow", "5");
    expect(onProposeChange).not.toHaveBeenCalled();
  });

  it("disables every control in read-only and shows the values only", () => {
    const { onConfirm, onProposeChange } = renderControls({ readOnly: true });

    fireEvent.keyDown(peep(), { key: "ArrowUp" });
    fireEvent.wheel(peep(), { deltaY: -100 });

    expect(peep()).toHaveAttribute("aria-valuenow", "5");
    expect(peep()).toHaveAttribute("aria-readonly", "true");
    expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeDisabled();
    expect(within(screen.getByRole("group", { name: "Modo ventilatorio" })).getByRole("button", { name: /PCV/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onProposeChange).not.toHaveBeenCalled();
  });
});

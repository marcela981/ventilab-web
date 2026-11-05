/*
* Funcionalidad: VentilatorConsole July layout tests
* Descripción: The opt-in July layout of the console: the three regions (Valores, Curvas, Controles) in DOM order with the left column order of the E2E contract (logos, leftTop slot, Confirmar, Cancelar, pending status, value cards), the input row above the alarms and the curves, the right column (mode head, toggle with the assist slot, timing, rate), the value cards (15 metrics + the provided vitals, none without a patient monitor), the slots (leftTop, assistSlot, curvesToolbarStart, curvesFooter, rightFooter, header), Enter / Escape on the console root, the Real summary (`confirmSummary`), `controlsSlot={null}` (no July controls), the zoom buttons over the time windows, the classic layout untouched by default. v0.1 (Bloque 5, C3): first version. v0.2 (Bloque 5, C9): the rightFooter probe button has its own name (the console now renders "Ver alertas detalladas" itself). v0.3 (Ajustes A, A1): the July default applies on its own: no Confirmar, Cancelar, counter nor hint in the left column; edits go through adapter.onConfirm at once (sliders after 300 ms), Enter applies and Escape drops what debounces, per-source delays, a console turned read-only drops what still debounced; Enter / Escape with Confirmar and the Real summary run in `applyMode="confirm"`. Depends on Vitest, Testing Library and the console.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_METRIC_IDS, CYCLE_EXTRA_METRIC_IDS } from "./config/console.config";
import { stepWindow } from "./curves-zone";
import { VentilatorConsole } from "./ventilator-console";
import type { VentilatorConsoleAdapter } from "./ventilator-console.entity";

const VALUES = { fio2: 40, tidalVolume: 450, peep: 5, respiratoryRate: 15, inspiratoryTime: 1 };

function makeAdapter(overrides: Partial<VentilatorConsoleAdapter> = {}): VentilatorConsoleAdapter {
  return {
    frames: { subscribe: () => () => undefined },
    settings: { current: VALUES, applied: VALUES },
    mode: { current: "VCV", options: [{ id: "VCV", label: "VCV" }, { id: "PCV", label: "PCV" }, { id: "PSV", label: "PSV" }] },
    metrics: { peakPressure: 22, meanPressure: 9.5, peakInspiratoryFlow: 48, peakExpiratoryFlow: -40 },
    patient: { values: { spo2: 95, ph: 7.4 }, trends: { spo2: [94, 95] } },
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
    onCancel: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Elements in document order. */
function inOrder(...elements: HTMLElement[]): boolean {
  return elements.every((element, index) => index === 0 || Boolean(elements[index - 1]!.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING));
}

describe("VentilatorConsole layout=\"july\"", () => {
  it("renders the three regions and the left and centre orders of the contract", () => {
    render(<VentilatorConsole adapter={makeAdapter()} layout="july" leftTop={<div role="group" aria-label="Modo del monitor" />} />);

    const values = screen.getByRole("region", { name: "Valores" });
    const curves = screen.getByRole("region", { name: "Curvas" });
    const controls = screen.getByRole("complementary", { name: "Controles" });

    expect(inOrder(values, curves, controls)).toBe(true);
    expect(inOrder(
      within(values).getByRole("img", { name: "VentyLab" }),
      within(values).getByRole("img", { name: "Univalle" }),
      within(values).getByRole("group", { name: "Modo del monitor" }),
      within(values).getByRole("list", { name: "Valores del monitor" }),
    )).toBe(true);
    // Automatic application (Ajustes A): nothing to confirm, cancel or count.
    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    expect(screen.queryByText(/cambios? pendientes?/)).not.toBeInTheDocument();
    expect(screen.queryByText("Esc: cancelar · Enter: confirmar")).not.toBeInTheDocument();
    expect(inOrder(
      screen.getByRole("spinbutton", { name: "Fracción inspirada de oxígeno" }),
      screen.getByRole("spinbutton", { name: "Volumen corriente" }),
      screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" }),
      screen.getByRole("region", { name: "Alarmas" }),
      curves,
    )).toBe(true);
    expect(inOrder(
      within(controls).getByRole("group", { name: "Modo ventilatorio" }),
      within(controls).getByRole("button", { name: /Más modos/ }),
      within(controls).getByRole("slider", { name: "Relación inspiración/espiración" }),
      within(controls).getByRole("status", { name: "Relación I:E" }),
      within(controls).getByRole("spinbutton", { name: "Tiempo inspiratorio" }),
      within(controls).getByRole("spinbutton", { name: "Pausa espiratoria" }),
      within(controls).getByRole("spinbutton", { name: "Frecuencia respiratoria" }),
    )).toBe(true);
    expect(within(controls).getByText("Modo")).toBeInTheDocument();
  });

  it("shows every metric card in the July order and only the vitals the source provides", () => {
    render(<VentilatorConsole adapter={makeAdapter()} layout="july" />);

    const list = screen.getByRole("list", { name: "Valores del monitor" });
    const terms = within(list).getAllByRole("term").map((term) => term.textContent);

    expect(terms).toHaveLength(CONSOLE_METRIC_IDS.length + CYCLE_EXTRA_METRIC_IDS.length + 2);
    expect(terms.slice(0, 6)).toEqual(["Ppico", "Pmedia", "PEEP total", "Flujo máx", "Flujo mín", "Vte"]);
    expect(terms.slice(-2)).toEqual(["SpO2", "pH"]);
    expect(screen.queryByRole("region", { name: "Paciente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Monitorización" })).not.toBeInTheDocument();
  });

  it("hides the vital cards when the source has no patient monitor", () => {
    render(<VentilatorConsole adapter={makeAdapter({ capabilities: { patientMonitor: false } })} layout="july" />);

    expect(within(screen.getByRole("list", { name: "Valores del monitor" })).queryByText("SpO2")).not.toBeInTheDocument();
  });

  it("renders the July slots where the layout places them", () => {
    render(
      <VentilatorConsole
        adapter={makeAdapter()}
        layout="july"
        header={<p>Franja</p>}
        assistSlot={<button type="button">Asesoría IA</button>}
        curvesToolbarStart={<span role="status" aria-label="Estado de la señal">Simulando</span>}
        curvesFooter={<button type="button">Comandos recientes</button>}
        rightFooter={<button type="button">Pie de la columna</button>}
      />,
    );

    const controls = screen.getByRole("complementary", { name: "Controles" });
    const curves = screen.getByRole("region", { name: "Curvas" });

    expect(screen.getByText("Franja")).toBeInTheDocument();
    expect(inOrder(within(controls).getByRole("group", { name: "Modo ventilatorio" }), within(controls).getByRole("button", { name: "Asesoría IA" }))).toBe(true);
    expect(inOrder(within(curves).getByRole("status", { name: "Estado de la señal" }), within(curves).getByRole("group", { name: "Zoom de las curvas" }))).toBe(true);
    expect(inOrder(curves, screen.getByRole("button", { name: "Comandos recientes" }))).toBe(true);
    expect(within(controls).getByRole("button", { name: "Pie de la columna" })).toBeInTheDocument();
  });

  it("applies each edit through adapter.onConfirm, sliders after 300 ms, Enter now and Escape drops the wait", () => {
    vi.useFakeTimers();
    const adapter = makeAdapter();

    render(<VentilatorConsole adapter={adapter} layout="july" />);
    const peep = screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });
    const rate = screen.getByRole("slider", { name: "Frecuencia respiratoria" });

    fireEvent.keyDown(peep, { key: "ArrowUp" });
    expect(adapter.onConfirm).toHaveBeenLastCalledWith({ mode: null, changes: [{ parameter: "peep", value: 6 }] });

    fireEvent.change(rate, { target: { value: "18" } });
    expect(adapter.onConfirm).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(adapter.onConfirm).toHaveBeenLastCalledWith({ mode: null, changes: [{ parameter: "respiratoryRate", value: 18 }] });

    fireEvent.change(rate, { target: { value: "20" } });
    fireEvent.keyDown(rate, { key: "Enter" });
    expect(adapter.onConfirm).toHaveBeenLastCalledWith({ mode: null, changes: [{ parameter: "respiratoryRate", value: 20 }] });

    fireEvent.change(rate, { target: { value: "22" } });
    fireEvent.keyDown(rate, { key: "Escape" });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(adapter.onCancel).toHaveBeenCalledTimes(1);
    expect(adapter.onConfirm).toHaveBeenCalledTimes(3);
    expect(rate).toHaveValue("15");
  });

  it("takes the delays per source and drops what debounces when the console turns read-only", () => {
    vi.useFakeTimers();
    const adapter = makeAdapter();
    const { rerender } = render(<VentilatorConsole adapter={adapter} layout="july" autoApplyDelays={{ discrete: 500 }} />);

    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    expect(adapter.onConfirm).not.toHaveBeenCalled();
    rerender(<VentilatorConsole adapter={{ ...adapter, permissions: { canControl: false } }} layout="july" autoApplyDelays={{ discrete: 500 }} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(adapter.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" })).toHaveAttribute("aria-valuenow", "5");
  });

  it("confirms with Enter and cancels with Escape on the console (confirm mode)", () => {
    const adapter = makeAdapter();

    render(<VentilatorConsole adapter={adapter} layout="july" applyMode="confirm" />);
    const peep = screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });

    fireEvent.keyDown(peep, { key: "ArrowUp" });
    expect(screen.getByText("1 cambio pendiente")).toBeInTheDocument();
    fireEvent.keyDown(peep, { key: "Enter" });
    expect(adapter.onConfirm).toHaveBeenCalledWith({ mode: null, changes: [{ parameter: "peep", value: 6 }] });

    fireEvent.keyDown(peep, { key: "ArrowUp" });
    fireEvent.keyDown(peep, { key: "Escape" });
    expect(adapter.onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument();
  });

  it("asks for the summary first with confirmSummary (confirm mode)", async () => {
    const adapter = makeAdapter();

    render(<VentilatorConsole adapter={adapter} layout="july" applyMode="confirm" confirmSummary />);
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "Fracción inspirada de oxígeno" }), { key: "ArrowUp" });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent("FiO2 40 → 41 %");
    expect(adapter.onConfirm).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar al ventilador" }));
    expect(adapter.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("drops the July controls with controlsSlot={null} and stays read-only without control", () => {
    const { unmount } = render(<VentilatorConsole adapter={makeAdapter()} layout="july" applyMode="confirm" controlsSlot={null} />);

    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Modo ventilatorio" })).not.toBeInTheDocument();
    unmount();

    render(<VentilatorConsole adapter={makeAdapter({ permissions: { canControl: false, readOnlyReason: "Otro usuario opera el equipo" } })} layout="july" />);
    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volumen control" })).toHaveAccessibleDescription("Otro usuario opera el equipo");
  });

  it("zooms over the console time windows", () => {
    render(<VentilatorConsole adapter={makeAdapter()} layout="july" />);
    const zoom = screen.getByRole("group", { name: "Zoom de las curvas" });

    expect(screen.getByText("Ventana 10 s")).toBeInTheDocument();
    expect(within(zoom).getByRole("button", { name: "Restablecer zoom" })).toBeDisabled();
    fireEvent.click(within(zoom).getByRole("button", { name: "Acercar" }));
    expect(screen.getByText("Ventana 5 s")).toBeInTheDocument();
    expect(within(zoom).getByRole("button", { name: "Acercar" })).toBeDisabled();
    fireEvent.click(within(zoom).getByRole("button", { name: "Restablecer zoom" }));
    expect(screen.getByText("Ventana 10 s")).toBeInTheDocument();
    expect(stepWindow(30, 1)).toBe(30);
    expect(stepWindow(10, 1)).toBe(20);
  });

  it("keeps the classic layout by default", () => {
    render(<VentilatorConsole adapter={makeAdapter()} />);

    expect(screen.getByRole("region", { name: "Monitorización" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Valores" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Zoom de las curvas" })).not.toBeInTheDocument();
  });

});

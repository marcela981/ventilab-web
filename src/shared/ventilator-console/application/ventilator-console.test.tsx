/*
* Funcionalidad: VentilatorConsole tests
* Descripción: Renders the generic console from a fake adapter in jsdom (no 2D context): the curves, numeric monitoring and patient zones, "—" for metrics the source does not provide, out-of-range highlight with icon text and range overrides, only the vitals the adapter provides with their sparkline, the curves toolbar (window, loop toggle, freeze with the measurement cursor), frame batches pushed into the ring buffer, unsubscribe on unmount, and the read-only flag passed to the slots. Depends on Vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaveformRingBuffer } from "@shared/waveforms";
import { CONSOLE_METRIC_IDS, CURVE_IDS } from "./config/console.config";
import type { CurveId } from "./config/console.config";
import { pushConsoleBatch } from "./use-console-waveforms";
import { VentilatorConsole } from "./ventilator-console";
import type { ConsoleSlotContext } from "./ventilator-console";
import type { ConsoleFrameListener, VentilatorConsoleAdapter } from "./ventilator-console.entity";

type FakeAdapter = {
  adapter: VentilatorConsoleAdapter
  subscribe: ReturnType<typeof vi.fn>
  unsubscribe: ReturnType<typeof vi.fn>
  emit: ConsoleFrameListener
};

function makeAdapter(overrides: Partial<VentilatorConsoleAdapter> = {}): FakeAdapter {
  const listeners: ConsoleFrameListener[] = [];
  const unsubscribe = vi.fn();
  const subscribe = vi.fn((listener: ConsoleFrameListener) => {
    listeners.push(listener);

    return unsubscribe;
  });
  const adapter: VentilatorConsoleAdapter = {
    frames: { subscribe },
    settings: { current: { peep: 5 }, applied: { peep: 5 } },
    mode: { current: "VCV", options: [{ id: "VCV", label: "Volumen control (VCV)" }] },
    metrics: { peakPressure: 38, plateauPressure: 25, ieRatio: 0.5, tidalVolumePerKg: 6.1 },
    patient: { values: { spo2: 85, ph: 7.4 }, trends: { spo2: [90, 88, 86, 85] } },
    alarms: [],
    permissions: { canControl: true },
    limits: { peep: { min: 0, max: 20, step: 1, unit: "cmH2O" } },
    onProposeChange: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };

  return { adapter, subscribe, unsubscribe, emit: (batch) => listeners.forEach((listener) => listener(batch)) };
}

function tileOf(label: string): HTMLElement {
  const tile = screen.getByText(label, { selector: "dt" }).parentElement;

  if (!tile) {
    throw new Error(`No tile for ${label}`);
  }

  return tile;
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VentilatorConsole", () => {
  it("renders the curves, numeric monitoring and patient zones from the adapter", () => {
    render(<VentilatorConsole adapter={makeAdapter().adapter} />);

    const consoleRegion = screen.getByRole("region", { name: "Consola del ventilador" });
    expect(within(consoleRegion).getByRole("region", { name: "Curvas" })).toBeInTheDocument();
    expect(within(consoleRegion).getByRole("region", { name: "Monitorización" })).toBeInTheDocument();
    expect(within(consoleRegion).getByRole("region", { name: "Paciente" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Curvas de presión, flujo y volumen" })).toBeInTheDocument();
    expect(screen.getByText("Volumen control (VCV)")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("tablet en horizontal");
  });

  it("shows every metric with its unit and a dash for the ones the source does not provide", () => {
    render(<VentilatorConsole adapter={makeAdapter().adapter} />);
    const monitor = screen.getByRole("region", { name: "Monitorización" });

    expect(within(monitor).getAllByRole("term")).toHaveLength(CONSOLE_METRIC_IDS.length);
    expect(tileOf("I:E")).toHaveTextContent("1:2.0");
    expect(tileOf("Vt/kg PBW")).toHaveTextContent("6.1mL/kg");
    expect(tileOf("Auto-PEEP")).toHaveTextContent("—cmH2O");
    expect(tileOf("Auto-PEEP")).toHaveAttribute("data-status", "unknown");
  });

  it("highlights out-of-range values with text, not color alone, and honors range overrides", () => {
    const { adapter } = makeAdapter();
    const { rerender } = render(<VentilatorConsole adapter={adapter} />);

    expect(tileOf("Ppico")).toHaveAttribute("data-status", "high");
    expect(within(tileOf("Ppico")).getByText("Alto")).toBeInTheDocument();
    expect(tileOf("Pplat")).toHaveAttribute("data-status", "normal");

    rerender(<VentilatorConsole adapter={adapter} metricRanges={{ peakPressure: null, plateauPressure: { max: 20 } }} />);

    expect(within(tileOf("Ppico")).queryByText("Alto")).not.toBeInTheDocument();
    expect(within(tileOf("Pplat")).getByText("Alto")).toBeInTheDocument();
  });

  it("shows only the vitals the adapter provides, each with a trend sparkline", () => {
    render(<VentilatorConsole adapter={makeAdapter().adapter} />);
    const patient = screen.getByRole("region", { name: "Paciente" });

    expect(within(patient).getAllByRole("term").map((term) => term.textContent)).toEqual(["SpO2", "pH"]);
    expect(within(tileOf("SpO2")).getByText("Bajo")).toBeInTheDocument();
    expect(tileOf("pH")).toHaveTextContent("7.40");
    const sparkline = within(patient).getByRole("img", { name: "Tendencia de SpO2" });
    expect(sparkline.querySelector("path")?.getAttribute("d")).toMatch(/^M0\.0 0\.0 L/);
  });

  it("tells when the source provides no vitals", () => {
    render(<VentilatorConsole adapter={makeAdapter({ patient: { values: {} } }).adapter} />);

    expect(screen.getByText("La fuente de datos no informa signos del paciente.")).toBeInTheDocument();
  });

  it("switches the window, shows a loop and freezes the curves with the measurement cursor", () => {
    render(<VentilatorConsole adapter={makeAdapter().adapter} />);
    const windowGroup = screen.getByRole("group", { name: "Ventana de tiempo" });

    fireEvent.click(within(windowGroup).getByRole("button", { name: "20 s" }));
    expect(within(windowGroup).getByRole("button", { name: "20 s" })).toHaveAttribute("aria-pressed", "true");
    expect(within(windowGroup).getByRole("button", { name: "10 s" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "P-V" }));
    expect(screen.getByRole("img", { name: "Bucle presión-volumen" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "F-V" }));
    expect(screen.getByRole("img", { name: "Bucle flujo-volumen" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Congelar" }));
    expect(screen.getByRole("button", { name: "Reanudar" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("slider", { name: /cursor de medición/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bucle flujo-volumen (congelado)" })).toBeInTheDocument();
  });

  it("subscribes to the frame source once and unsubscribes on unmount", () => {
    const fake = makeAdapter();
    const { unmount } = render(<VentilatorConsole adapter={fake.adapter} />);

    expect(fake.subscribe).toHaveBeenCalledTimes(1);
    fake.emit({ samples: [{ tMs: 0, pressure: 5, flow: 0, volume: 0 }] });

    unmount();

    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("passes the read-only flag to the slots and shows the badge", () => {
    const slot = vi.fn(({ readOnly }: ConsoleSlotContext) => <p>{readOnly ? "controles bloqueados" : "controles activos"}</p>);
    const { adapter } = makeAdapter({ permissions: { canControl: false } });
    const { rerender } = render(<VentilatorConsole adapter={adapter} controlsSlot={slot} alarmsSlot={<p>alarmas</p>} />);

    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    expect(screen.getByText("controles bloqueados")).toBeInTheDocument();
    expect(screen.getByText("alarmas")).toBeInTheDocument();
    expect(slot).toHaveBeenLastCalledWith(expect.objectContaining({ readOnly: true, adapter }));
    expect(screen.getByRole("region", { name: "Consola del ventilador" })).toHaveAttribute("data-readonly", "true");

    const writable = { ...adapter, permissions: { canControl: true } };
    rerender(<VentilatorConsole adapter={writable} controlsSlot={slot} />);

    expect(screen.queryByText("Solo lectura")).not.toBeInTheDocument();
    expect(screen.getByText("controles activos")).toBeInTheDocument();
  });
});

describe("pushConsoleBatch", () => {
  it("writes each sample of a batch into the curve channels of the ring", () => {
    const buffer = new WaveformRingBuffer<CurveId>({ channels: CURVE_IDS, capacity: 4 });

    pushConsoleBatch(buffer, {
      samples: [
        { tMs: 0, pressure: 5, flow: 30, volume: 0 },
        { tMs: 20, pressure: 12, flow: 28, volume: 10 },
      ],
    });
    const window = buffer.readAll();

    expect(Array.from(window.t)).toEqual([0, 20]);
    expect(Array.from(window.values.pressure)).toEqual([5, 12]);
    expect(Array.from(window.values.flow)).toEqual([30, 28]);
    expect(Array.from(window.values.volume)).toEqual([0, 10]);
  });
});

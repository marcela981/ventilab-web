/*
* Funcionalidad: July console controls tests
* Descripción: Behaviour of the July controls over one adapter store and one pending store: the placement per mode (input row, timing, rate, "Más parámetros"), the timing math (I:E, Te, slider range), the input row order and range validation, VOL CTRL / PRES CTRL and "Más modos" (pending until Confirmar), the Insp/Esp slider setting Ti from the cycle, the disabled expiratory pause, the rate slider, "Más parámetros" opening with a pending edit, Confirmar / Cancelar, Enter / Escape through the console key handler (only inside console controls, never from buttons), the Real summary (every change listed, Escape keeps the edits, "Enviar al ventilador" emits once) and the isolation of an edit (other parameters do not re-render). v0.1 (Bloque 5, C2): first version. v0.2 (Ajustes A, A1): the harness takes the console apply mode (default `auto`, as the July console); the pending / Confirmar tests run in `confirm` mode, and the automatic application is covered: no Confirmar, Cancelar nor counter, the stepper, keys and modes apply at once, sliders and the wheel 300 ms after the last change, Enter applies and Escape drops what is debouncing (and asks the source through onApplyNow / onCancel), nothing while read-only. v0.3 (Ajustes A, A2): the source send status ("Enviando", "Rechazado: <motivo>") next to each control in a polite live region, never blocking the edit. Depends on Vitest, Testing Library, the July controls and the July confirm actions. v0.4 (2026-11-10, reverts A-1 to A-4): no automatic application: the harness always has Enviar / Detener / "Deshacer último cambio"; edits (stepper, keys, sliders, wheel) stay pending until Enviar, which emits them once; the left column order, Detener disabled ("Disponible próximamente"), the console undo (previous values and mode through onConfirm) and the confirmed / unconfirmed send statuses are covered. v0.5 (2026-11-11, review R1): M1 no undo to an unknown applied mode ("—"); M5 the unavailable Detener has a visible tooltip on a focusable wrapper and an accessible description.
* Versión: 0.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Profiler, useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { julyLabel, julyPlacement } from "./config/console-placement.config";
import { getParametersForMode } from "./config/console-controls.config";
import { createPendingControlsStore } from "./console-pending-store";
import type { PendingControlsStore } from "./console-pending-store";
import { createExternalStore } from "./console-store";
import type { WritableStore } from "./console-store";
import { handleJulyKeyDown, inverseConfirmation, JulyConfirmActions, summarizeConfirmation } from "./july-confirm";
import { JulyInputRow, JulyModeToggle, JulyMoreParameters, JulyParameter, JulyRate, JulyTiming } from "./july-controls";
import { expiratoryTime, formatIeRatio, ieRatio, inspiratoryPercentRange, inspiratoryTimeFromPercent } from "./july-timing";
import type { ConsoleConfirmation, ConsoleLimits, VentilatorConsoleAdapter } from "./ventilator-console.entity";

const LIMITS: ConsoleLimits = {
  fio2: { min: 21, max: 100, step: 1, unit: "%" },
  tidalVolume: { min: 200, max: 800, step: 10, unit: "mL" },
  inspiratoryPressure: { min: 5, max: 40, step: 1, unit: "cmH2O" },
  pressureSupport: { min: 0, max: 30, step: 1, unit: "cmH2O" },
  peep: { min: 0, max: 20, step: 1, unit: "cmH2O" },
  respiratoryRate: { min: 6, max: 40, step: 1, unit: "rpm" },
  inspiratoryTime: { min: 0.3, max: 3, step: 0.05, unit: "s" },
  inspiratoryPause: { min: 0, max: 2, step: 0.1, unit: "s" },
  flowTrigger: { min: 1, max: 10, step: 0.5, unit: "L/min" },
  cycleOff: { min: 5, max: 80, step: 5, unit: "%" },
  apneaTime: { min: 10, max: 60, step: 1, unit: "s" },
};
const VALUES = { fio2: 40, tidalVolume: 450, inspiratoryPressure: 15, pressureSupport: 10, peep: 5, respiratoryRate: 15, inspiratoryTime: 1, inspiratoryPause: 0, flowTrigger: 2, cycleOff: 25, apneaTime: 20 };

function makeAdapter(overrides: Partial<VentilatorConsoleAdapter> = {}): VentilatorConsoleAdapter {
  return {
    frames: { subscribe: () => () => undefined },
    settings: { current: VALUES, applied: VALUES },
    mode: {
      current: "VCV",
      options: [
        { id: "VCV", label: "VCV" },
        { id: "PCV", label: "PCV" },
        { id: "PSV", label: "PSV" },
        { id: "CPAP", label: "CPAP" },
        { id: "SIMV", label: "SIMV" },
      ],
    },
    metrics: {},
    patient: { values: {} },
    alarms: [],
    permissions: { canControl: true },
    limits: LIMITS,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

type HarnessProps = {
  store: WritableStore<VentilatorConsoleAdapter>
  pending: PendingControlsStore
  readOnly?: boolean
  confirmSummary?: boolean
};

function Harness({ store, pending, readOnly = false, confirmSummary = false }: HarnessProps) {
  const [summary] = useState(() => createExternalStore(false));
  const [undo] = useState(() => createExternalStore<ConsoleConfirmation | null>(null));
  const zone = { store, pending, readOnly, describedBy: undefined, applicability: undefined };
  const options = { store, pending, readOnly, confirmSummary, summary, undo };

  return (
    <div onKeyDown={(event) => handleJulyKeyDown(event, options)}>
      <JulyConfirmActions {...options} readOnlyReason={undefined} reasonId="reason" />
      <JulyInputRow {...zone} />
      <JulyModeToggle {...zone} assist={<button type="button">Asesoría IA</button>} />
      <JulyTiming {...zone} />
      <JulyRate {...zone} />
      <JulyMoreParameters {...zone} />
    </div>
  );
}

function setup(overrides: Partial<VentilatorConsoleAdapter> = {}, props: Partial<HarnessProps> = {}) {
  const adapter = makeAdapter(overrides);
  const store = createExternalStore(adapter);
  const pending = createPendingControlsStore();

  render(<Harness store={store} pending={pending} {...props} />);

  return { adapter, store, pending };
}

const spin = (name: string) => screen.getByRole("spinbutton", { name });
const CONFIRM = {} as const;

afterEach(() => {
  vi.useRealTimers();
});

describe("julyPlacement", () => {
  it("places the parameters of each mode without losing any", () => {
    const vcv = julyPlacement(getParametersForMode("VCV", LIMITS));

    expect(vcv.row).toEqual(["fio2", "tidalVolume", "peep"]);
    expect(vcv).toMatchObject({ inspiratoryTime: true, inspiratoryPause: true, rate: true, more: ["flowTrigger"] });
    expect(julyPlacement(getParametersForMode("PCV", LIMITS)).row).toEqual(["fio2", "inspiratoryPressure", "peep"]);

    const psv = julyPlacement(getParametersForMode("PSV", LIMITS));

    expect(psv.row).toEqual(["fio2", "pressureSupport", "peep"]);
    expect(psv).toMatchObject({ inspiratoryTime: false, rate: false, more: ["flowTrigger", "cycleOff", "apneaTime"] });
    expect(julyPlacement(getParametersForMode("CPAP", LIMITS)).row).toEqual(["fio2", null, "peep"]);
    expect(julyPlacement(getParametersForMode("SIMV", LIMITS)).more).toEqual(["pressureSupport", "flowTrigger", "cycleOff"]);
  });

  it("labels the middle slot after the mode", () => {
    expect(julyLabel("tidalVolume", "VCV")).toBe("Volumen (VCV)");
    expect(julyLabel("tidalVolume", "SIMV")).toBe("Volumen");
    expect(julyLabel("inspiratoryPressure", "PCV")).toBe("PIP (PCV)");
    expect(julyLabel("flowTrigger", "VCV")).toBeUndefined();
  });
});

describe("July timing math", () => {
  it("derives Te and I:E from Ti and FR only", () => {
    expect(expiratoryTime(1, 15)).toBe(3);
    expect(ieRatio(1, 15)).toBe(3);
    expect(formatIeRatio(ieRatio(1.25, 16))).toBe("1 : 2,0");
    expect(ieRatio(4, 15)).toBeNull();
    expect(ieRatio(1, 0)).toBeNull();
    expect(formatIeRatio(null)).toBe("—");
  });

  it("maps the slider to Ti inside the limit", () => {
    expect(inspiratoryTimeFromPercent(25, 15)).toBe(1);
    expect(inspiratoryPercentRange(LIMITS.inspiratoryTime!, 15)).toEqual({ min: 10, max: 75 });
    expect(inspiratoryPercentRange({ min: 3, max: 4, step: 0.1, unit: "s" }, 40)).toBeNull();
  });
});

describe("July controls", () => {
  it("shows the input row in July order with the July labels and range validation", () => {
    const { pending } = setup({}, CONFIRM);
    const row = screen.getByRole("group", { name: "Parámetros principales" });
    const names = within(row).getAllByRole("spinbutton").map((element) => element.getAttribute("aria-label"));

    expect(names).toEqual(["Fracción inspirada de oxígeno", "Volumen corriente", "Presión positiva al final de la espiración"]);
    expect(within(row).getByText("Volumen (VCV)")).toBeInTheDocument();

    fireEvent.keyDown(spin("Fracción inspirada de oxígeno"), { key: "End" });
    expect(pending.getSnapshot().pendingValues).toEqual({ fio2: 100 });
  });

  it("keeps a mode change pending until Confirmar and offers the other modes in Más modos", () => {
    const { adapter, pending } = setup({}, CONFIRM);
    const modes = screen.getByRole("group", { name: "Modo ventilatorio" });

    expect(within(modes).getByRole("button", { name: "Volumen control" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(modes).getByRole("button", { name: "Presión control" }));
    expect(adapter.onConfirm).not.toHaveBeenCalled();
    expect(within(modes).getByRole("button", { name: "Presión control" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Modo pendiente: PCV")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Parámetros principales" })).getByRole("spinbutton", { name: "Presión inspiratoria" })).toBeInTheDocument();

    const more = screen.getByRole("button", { name: /Más modos/ });

    expect(more).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(more);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "PSV" }));
    expect(pending.getSnapshot().pendingMode).toBe("PSV");
    expect(screen.getByRole("button", { name: /Más modos/ })).toHaveTextContent("PSV");
    expect(screen.queryByRole("slider", { name: "Relación inspiración/espiración" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(adapter.onConfirm).toHaveBeenCalledWith({ mode: "PSV", changes: [] });
  });

  it("sets Ti from the Insp/Esp slider and shows I:E and Te", () => {
    const { pending } = setup({}, CONFIRM);

    expect(screen.getByRole("status", { name: "Relación I:E" })).toHaveTextContent("1 : 3,0");
    expect(screen.getByRole("status", { name: "Tiempo espiratorio" })).toHaveTextContent("Te 3,00 s");

    fireEvent.change(screen.getByRole("slider", { name: "Relación inspiración/espiración" }), { target: { value: "33" } });
    expect(pending.getSnapshot().pendingValues).toEqual({ inspiratoryTime: 1.3 });
    expect(screen.getByRole("status", { name: "Relación I:E" })).toHaveTextContent("1 : 2,1");
  });

  it("shows the expiratory pause as unavailable and the rate with its slider", () => {
    const { pending } = setup({}, CONFIRM);
    const pause = spin("Pausa espiratoria");

    expect(pause).toHaveAttribute("aria-disabled", "true");
    expect(pause).toHaveAccessibleDescription("No disponible en este simulador");

    fireEvent.change(screen.getByRole("slider", { name: "Frecuencia respiratoria" }), { target: { value: "18" } });
    expect(pending.getSnapshot().pendingValues).toEqual({ respiratoryRate: 18 });
    expect(spin("Frecuencia respiratoria")).toHaveAttribute("aria-valuenow", "18");
  });

  it("opens Más parámetros while one of its parameters is pending", () => {
    const { pending } = setup({}, CONFIRM);
    const toggle = screen.getByRole("button", { name: "Más parámetros" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    act(() => {
      pending.dispatch({ type: "setValue", parameter: "flowTrigger", value: 3, base: 2, limit: LIMITS.flowTrigger! });
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(spin("Sensibilidad de disparo por flujo")).toHaveAttribute("aria-valuenow", "3");
  });

  it("confirms with Enter on a value control, cancels with Escape and ignores Enter on buttons", () => {
    const { adapter } = setup({}, CONFIRM);
    const peep = spin("Presión positiva al final de la espiración");

    fireEvent.keyDown(peep, { key: "ArrowUp" });
    expect(screen.getByText("1 cambio pendiente")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("button", { name: "Volumen control" }), { key: "Enter" });
    expect(adapter.onConfirm).not.toHaveBeenCalled();

    fireEvent.keyDown(peep, { key: "Enter" });
    expect(adapter.onConfirm).toHaveBeenCalledWith({ mode: null, changes: [{ parameter: "peep", value: 6 }] });
    expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument();

    fireEvent.keyDown(peep, { key: "ArrowUp" });
    fireEvent.keyDown(screen.getByRole("slider", { name: "Frecuencia respiratoria" }), { key: "Escape" });
    expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument();
    expect(adapter.onCancel).toHaveBeenCalledTimes(1);
    expect(adapter.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("ignores Enter and Escape outside the console controls", () => {
    const { adapter, pending } = setup({}, CONFIRM);

    fireEvent.keyDown(spin("Presión positiva al final de la espiración"), { key: "ArrowUp" });
    fireEvent.keyDown(screen.getByRole("button", { name: "Asesoría IA" }), { key: "Escape" });
    expect(pending.getSnapshot().pendingValues).toEqual({ peep: 6 });
    expect(adapter.onCancel).not.toHaveBeenCalled();
  });

  it("disables everything when read-only", () => {
    setup({}, { ...CONFIRM, readOnly: true });

    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deshacer último cambio" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volumen control" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Frecuencia respiratoria" })).toBeDisabled();
    expect(spin("Fracción inspirada de oxígeno")).toHaveAttribute("aria-disabled", "true");
  });

  it("waits for a confirmed change in flight before Confirmar", () => {
    setup({ settings: { current: VALUES, applied: VALUES, inFlight: { peep: { status: "awaiting" } } } }, CONFIRM);

    fireEvent.keyDown(spin("Fracción inspirada de oxígeno"), { key: "ArrowUp" });
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deshacer último cambio" })).toBeDisabled();
  });
});

describe("July controls with explicit Enviar (Digital and Real)", () => {
  it("keeps stepper, key, slider and wheel edits pending (highlighted) until Enviar, then emits them once", () => {
    vi.useFakeTimers();
    const { adapter, pending } = setup();
    const peep = spin("Presión positiva al final de la espiración");

    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    fireEvent.change(screen.getByRole("slider", { name: "Frecuencia respiratoria" }), { target: { value: "18" } });
    fireEvent.click(peep);
    fireEvent.wheel(peep, { deltaY: -1 });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(adapter.onConfirm).not.toHaveBeenCalled();
    expect(pending.getSnapshot().pendingValues).toEqual({ peep: 7, respiratoryRate: 18 });
    expect(document.querySelector('[data-parameter="peep"]')).toHaveAttribute("data-pending", "true");
    expect(screen.getByText("2 cambios pendientes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(adapter.onConfirm).toHaveBeenCalledTimes(1);
    expect(adapter.onConfirm).toHaveBeenCalledWith({ mode: null, changes: [{ parameter: "respiratoryRate", value: 18 }, { parameter: "peep", value: 7 }] });
    expect(pending.getSnapshot().pendingValues).toEqual({});
  });

  it("orders the left column as July: Enviar, Detener, then Deshacer último cambio", () => {
    setup();
    const buttons = screen.getAllByRole("button").map((button) => button.textContent);

    expect(buttons.slice(0, 3)).toEqual(["Enviar", "Detener", "Deshacer último cambio"]);
  });

  it("renders Detener disabled with a visible, accessible \"Disponible próximamente\" until its semantics are wired", async() => {
    setup();
    const stop = screen.getByRole("button", { name: "Detener" });

    expect(stop).toBeDisabled();
    expect(stop).toHaveAccessibleDescription("Disponible próximamente");
    // v0.5 (M5): the focusable wrapper shows the tooltip (a disabled button gets no pointer or focus events).
    const wrapper = stop.parentElement as HTMLElement;

    expect(wrapper).toHaveAttribute("tabindex", "0");
    fireEvent.mouseOver(wrapper);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Disponible próximamente");
  });

  it("never undoes to an unknown applied mode (\"—\"): Undo stays disabled when nothing valid is left (M1)", () => {
    const options = [{ id: "VCV", label: "VCV" }, { id: "PCV", label: "PCV" }];

    expect(inverseConfirmation({ mode: "VCV", changes: [{ parameter: "peep", value: 6 }] }, {}, { current: "—", options })).toBeNull();
    expect(inverseConfirmation({ mode: "VCV", changes: [{ parameter: "peep", value: 6 }] }, { peep: 5 }, { current: "—", options }))
      .toEqual({ mode: null, changes: [{ parameter: "peep", value: 5 }] });
    expect(inverseConfirmation({ mode: "VCV", changes: [] }, {}, { current: "PCV", options })).toEqual({ mode: "PCV", changes: [] });

    // The first real send: nothing applied, mode unknown.
    const { adapter } = setup({ settings: { current: {}, applied: {} }, mode: { current: "—", options: makeAdapter().mode.options } });

    fireEvent.click(screen.getByRole("button", { name: "Presión control" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(adapter.onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Deshacer último cambio" })).toBeDisabled();
  });

  it("undoes the last change sent with the previously applied values and mode, through onConfirm", () => {
    const store = createExternalStore(makeAdapter());
    const pending = createPendingControlsStore();
    const adapter = store.getSnapshot();

    render(<Harness store={store} pending={pending} />);

    expect(screen.getByRole("button", { name: "Deshacer último cambio" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Presión control" }));
    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(adapter.onConfirm).toHaveBeenLastCalledWith({ mode: "PCV", changes: [{ parameter: "peep", value: 6 }] });

    // The source applied it.
    act(() => {
      store.set({ ...adapter, settings: { current: { ...VALUES, peep: 6 }, applied: { ...VALUES, peep: 6 } }, mode: { ...adapter.mode, current: "PCV" } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Deshacer último cambio" }));
    expect(adapter.onConfirm).toHaveBeenCalledTimes(2);
    expect(adapter.onConfirm).toHaveBeenLastCalledWith({ mode: "VCV", changes: [{ parameter: "peep", value: 5 }] });
  });

  it("shows the send status of a source next to the control, politely, without blocking the edit", () => {
    const { pending } = setup({ settings: { current: VALUES, applied: VALUES, sendStatus: { peep: { status: "rejected", message: "fuera del rango seguro" }, fio2: { status: "sending" }, respiratoryRate: { status: "unconfirmed" }, tidalVolume: { status: "confirmed" } } } });
    const status = (parameter: string) => document.querySelector(`[data-parameter="${parameter}"] [aria-live="polite"]`);

    expect(status("peep")).toHaveTextContent("Rechazado: fuera del rango seguro");
    expect(status("peep")).toHaveAttribute("data-send-status", "rejected");
    expect(status("fio2")).toHaveTextContent("Enviando");
    expect(status("respiratoryRate")).toHaveTextContent("Sin confirmación del equipo");
    expect(status("tidalVolume")).toHaveTextContent("Confirmado por el equipo");
    expect(status("inspiratoryTime")).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "Aumentar FiO2" }));
    expect(pending.getSnapshot().pendingValues).toEqual({ fio2: 41 });
  });
});

describe("Real confirmation summary", () => {
  it("lists every change, keeps the edits on Escape and sends once from the summary", async () => {
    const { adapter, pending } = setup({}, { ...CONFIRM, confirmSummary: true });

    fireEvent.click(screen.getByRole("button", { name: "Presión control" }));
    fireEvent.keyDown(spin("Frecuencia respiratoria"), { key: "ArrowUp" });
    fireEvent.keyDown(spin("Frecuencia respiratoria"), { key: "Enter" });

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent("Modo VCV → PCV · FR 15 → 16 rpm");
    expect(within(dialog).getByRole("button", { name: "Enviar al ventilador" })).toHaveFocus();
    expect(adapter.onConfirm).not.toHaveBeenCalled();

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(adapter.onConfirm).not.toHaveBeenCalled();
    expect(pending.getSnapshot().pendingMode).toBe("PCV");

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Enviar al ventilador" }));
    expect(adapter.onConfirm).toHaveBeenCalledTimes(1);
    expect(adapter.onConfirm).toHaveBeenCalledWith({ mode: "PCV", changes: [{ parameter: "respiratoryRate", value: 16 }] });
  });

  it("formats each line with the applied value, the new one and the unit", () => {
    const lines = summarizeConfirmation(
      { mode: null, changes: [{ parameter: "tidalVolume", value: 500 }, { parameter: "inspiratoryTime", value: 1.1 }] },
      { applied: VALUES, mode: makeAdapter().mode, limits: LIMITS },
    );

    expect(lines).toEqual(["Vt 450 → 500 mL", "Ti 1.00 → 1.10 s"]);
  });
});

describe("July edit isolation", () => {
  it("re-renders only the edited parameter", () => {
    const store = createExternalStore(makeAdapter());
    const pending = createPendingControlsStore();
    const renders: Record<string, number> = {};
    const count = (id: string) => {
      renders[id] = (renders[id] ?? 0) + 1;
    };

    render(
      <>
        <Profiler id="peep" onRender={count}>
          <JulyParameter store={store} pending={pending} parameter="peep" readOnly={false} describedBy={undefined} />
        </Profiler>
        <Profiler id="fio2" onRender={count}>
          <JulyParameter store={store} pending={pending} parameter="fio2" readOnly={false} describedBy={undefined} />
        </Profiler>
      </>,
    );
    fireEvent.keyDown(spin("Presión positiva al final de la espiración"), { key: "ArrowUp" });

    expect(renders.fio2).toBe(1);
    expect(renders.peep).toBeGreaterThan(1);
  });
});

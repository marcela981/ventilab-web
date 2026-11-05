/*
* Funcionalidad: July console controls tests
* Descripción: Behaviour of the July controls over one adapter store and one pending store: the placement per mode (input row, timing, rate, "Más parámetros"), the timing math (I:E, Te, slider range), the input row order and range validation, VOL CTRL / PRES CTRL and "Más modos" (pending until Confirmar), the Insp/Esp slider setting Ti from the cycle, the disabled expiratory pause, the rate slider, "Más parámetros" opening with a pending edit, Confirmar / Cancelar, Enter / Escape through the console key handler (only inside console controls, never from buttons), the Real summary (every change listed, Escape keeps the edits, "Enviar al ventilador" emits once) and the isolation of an edit (other parameters do not re-render). v0.1 (Bloque 5, C2): first version. v0.2 (Ajustes A, A1): the harness takes the console apply mode (default `auto`, as the July console); the pending / Confirmar tests run in `confirm` mode, and the automatic application is covered: no Confirmar, Cancelar nor counter, the stepper, keys and modes apply at once, sliders and the wheel 300 ms after the last change, Enter applies and Escape drops what is debouncing (and asks the source through onApplyNow / onCancel), nothing while read-only. Depends on Vitest, Testing Library, the July controls and the auto apply scheduler.
* Versión: 0.2
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
import { createAutoApplyScheduler } from "./july-auto-apply";
import type { ConsoleApplyMode } from "./july-auto-apply";
import { applyPendingNow, handleJulyAutoKeyDown, handleJulyKeyDown, JulyConfirmActions, summarizeConfirmation } from "./july-confirm";
import { JulyInputRow, JulyModeToggle, JulyMoreParameters, JulyParameter, JulyRate, JulyTiming } from "./july-controls";
import { expiratoryTime, formatIeRatio, ieRatio, inspiratoryPercentRange, inspiratoryTimeFromPercent } from "./july-timing";
import type { ConsoleLimits, VentilatorConsoleAdapter } from "./ventilator-console.entity";

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
  /** The July console default is `auto`. */
  applyMode?: ConsoleApplyMode
};

function Harness({ store, pending, readOnly = false, confirmSummary = false, applyMode = "auto" }: HarnessProps) {
  const [summary] = useState(() => createExternalStore(false));
  const [scheduler] = useState(() => createAutoApplyScheduler({ apply: () => applyPendingNow(store, pending) }));
  const auto = applyMode === "auto";
  const zone = { store, pending, readOnly, describedBy: undefined, applicability: undefined, applyMode, onEdit: auto ? scheduler.schedule : undefined };
  const options = { store, pending, readOnly, confirmSummary, summary };

  return (
    <div onKeyDown={(event) => (auto ? handleJulyAutoKeyDown(event, { store, pending, readOnly, scheduler }) : handleJulyKeyDown(event, options))}>
      {auto ? null : <JulyConfirmActions {...options} readOnlyReason={undefined} reasonId="reason" />}
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
const CONFIRM = { applyMode: "confirm" } as const;

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

  it("keeps a mode change pending until Confirmar and offers the other modes in Más modos (confirm mode)", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
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

  it("confirms with Enter on a value control, cancels with Escape and ignores Enter on buttons (confirm mode)", () => {
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

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volumen control" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Frecuencia respiratoria" })).toBeDisabled();
    expect(spin("Fracción inspirada de oxígeno")).toHaveAttribute("aria-disabled", "true");
  });

  it("waits for a confirmed change in flight before Confirmar", () => {
    setup({ settings: { current: VALUES, applied: VALUES, inFlight: { peep: { status: "awaiting" } } } }, CONFIRM);

    fireEvent.keyDown(spin("Fracción inspirada de oxígeno"), { key: "ArrowUp" });
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });
});

describe("July controls with automatic application (default)", () => {
  it("has no Confirmar, Cancelar nor counter and applies a stepper or key edit at once", () => {
    const { adapter, pending } = setup();

    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    expect(adapter.onConfirm).toHaveBeenCalledTimes(1);
    expect(adapter.onConfirm).toHaveBeenLastCalledWith({ mode: null, changes: [{ parameter: "peep", value: 6 }] });

    fireEvent.keyDown(spin("Fracción inspirada de oxígeno"), { key: "End" });
    expect(adapter.onConfirm).toHaveBeenLastCalledWith({ mode: null, changes: [{ parameter: "fio2", value: 100 }] });
    // Nothing waits; the edited control stays selected.
    expect(pending.getSnapshot()).toMatchObject({ pendingValues: {}, pendingMode: null, selected: "fio2" });
  });

  it("applies a mode from the toggle and from Más modos at once, without a pending mode note", () => {
    const { adapter } = setup();

    fireEvent.click(within(screen.getByRole("group", { name: "Modo ventilatorio" })).getByRole("button", { name: "Presión control" }));
    expect(adapter.onConfirm).toHaveBeenLastCalledWith({ mode: "PCV", changes: [] });
    expect(screen.queryByText(/Modo pendiente/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Más modos/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "PSV" }));
    expect(adapter.onConfirm).toHaveBeenLastCalledWith({ mode: "PSV", changes: [] });
    expect(adapter.onConfirm).toHaveBeenCalledTimes(2);
  });

  it("applies a slider 300 ms after its last change, once", () => {
    vi.useFakeTimers();
    const { adapter, pending } = setup();
    const slider = screen.getByRole("slider", { name: "Frecuencia respiratoria" });

    fireEvent.change(slider, { target: { value: "17" } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.change(slider, { target: { value: "18" } });
    expect(pending.getSnapshot().pendingValues).toEqual({ respiratoryRate: 18 });
    expect(spin("Frecuencia respiratoria")).toHaveAttribute("aria-valuenow", "18");
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(adapter.onConfirm).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(adapter.onConfirm).toHaveBeenCalledTimes(1);
    expect(adapter.onConfirm).toHaveBeenCalledWith({ mode: null, changes: [{ parameter: "respiratoryRate", value: 18 }] });
    expect(pending.getSnapshot().pendingValues).toEqual({});
  });

  it("applies what a slider left debouncing on Enter and drops it on Escape", () => {
    vi.useFakeTimers();
    const { adapter, pending } = setup();
    const slider = screen.getByRole("slider", { name: "Relación inspiración/espiración" });

    fireEvent.change(slider, { target: { value: "33" } });
    fireEvent.keyDown(slider, { key: "Enter" });
    expect(adapter.onConfirm).toHaveBeenCalledWith({ mode: null, changes: [{ parameter: "inspiratoryTime", value: 1.3 }] });

    fireEvent.change(screen.getByRole("slider", { name: "Frecuencia respiratoria" }), { target: { value: "20" } });
    fireEvent.keyDown(screen.getByRole("slider", { name: "Frecuencia respiratoria" }), { key: "Escape" });
    expect(pending.getSnapshot().pendingValues).toEqual({});
    expect(adapter.onCancel).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(adapter.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("asks the source to apply now or drop its own wait when nothing debounces here", () => {
    const onApplyNow = vi.fn();
    const { adapter } = setup({ onApplyNow });
    const peep = spin("Presión positiva al final de la espiración");

    fireEvent.keyDown(peep, { key: "Enter" });
    expect(onApplyNow).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(peep, { key: "Escape" });
    expect(adapter.onCancel).toHaveBeenCalledTimes(1);
    expect(adapter.onConfirm).not.toHaveBeenCalled();
  });

  it("applies the wheel over the selected value after the slider delay", () => {
    vi.useFakeTimers();
    const { adapter } = setup();
    const peep = spin("Presión positiva al final de la espiración");

    fireEvent.click(peep);
    fireEvent.wheel(peep, { deltaY: -1 });
    fireEvent.wheel(peep, { deltaY: -1 });
    expect(adapter.onConfirm).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(adapter.onConfirm).toHaveBeenCalledWith({ mode: null, changes: [{ parameter: "peep", value: 7 }] });
  });

  it("applies nothing when read-only", () => {
    const { adapter } = setup({}, { readOnly: true });

    fireEvent.keyDown(spin("Fracción inspirada de oxígeno"), { key: "ArrowUp" });
    fireEvent.change(screen.getByRole("slider", { name: "Frecuencia respiratoria" }), { target: { value: "20" } });
    expect(adapter.onConfirm).not.toHaveBeenCalled();
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

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
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

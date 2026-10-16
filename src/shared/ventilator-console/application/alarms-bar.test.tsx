/*
* Funcionalidad: AlarmsBar tests
* Descripción: Tests of the ventilator console alarms bar and its pure helpers: sorting by priority with a non-color indicator (icon + priority text), the 2-minute silence countdown driven by fake timers (alarms stay visible), the sound toggle off by default and beeping only after the user enables it, the session history derived from adapter updates (onset and clear) and the alarm limits panel (apply emits only changed thresholds; read-only without a callback). Depends on Vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAlarmPriority } from "./config/console-controls.config";
import { AlarmsBar } from "./alarms-bar";
import { diffAlarms, formatCountdown, sortAlarms } from "./console-alarms";
import type { ConsoleAlarm, ConsoleAlarmLimit } from "./ventilator-console.entity";

const LOW: ConsoleAlarm = { id: "a1", type: "NOTICE", priority: "low", message: "Aviso", since: 1 };
const MEDIUM: ConsoleAlarm = { id: "a2", type: "AUTO_PEEP", priority: "medium", message: "Auto-PEEP", since: 2 };
const HIGH: ConsoleAlarm = { id: "a3", type: "HIGH_PRESSURE", priority: "high", message: "Presión alta", since: 3 };

const LIMITS: readonly ConsoleAlarmLimit[] = [
  { id: "highPressure", label: "Presión alta", value: 40, min: 10, max: 60, step: 1, unit: "cmH2O" },
  { id: "highRespiratoryRate", label: "FR alta", value: 35, min: 10, max: 60, step: 1, unit: "rpm" },
];

const fakeClock = (start = 0) => {
  let now = start;

  return { clock: { now: () => now }, advance: (ms: number) => (now += ms) };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("alarm helpers", () => {
  it("sorts high > medium > low", () => {
    expect(sortAlarms([LOW, HIGH, MEDIUM]).map((alarm) => alarm.priority)).toEqual(["high", "medium", "low"]);
  });

  it("diffs onset and clear events by id", () => {
    expect(diffAlarms([LOW, MEDIUM], [MEDIUM, HIGH], 10).map((event) => `${event.alarmId}:${event.kind}`)).toEqual(["a1:clear", "a3:onset"]);
  });

  it("formats the countdown and maps engine types to a default priority", () => {
    expect(formatCountdown(120_000)).toBe("2:00");
    expect(formatCountdown(59_001)).toBe("1:00");
    expect(resolveAlarmPriority("DISCONNECTION")).toBe("high");
    expect(resolveAlarmPriority("AUTO_PEEP")).toBe("medium");
    expect(resolveAlarmPriority("SOMETHING_NEW")).toBe("medium");
  });
});

describe("AlarmsBar", () => {
  it("lists active alarms by priority with an icon and priority text, not color alone", () => {
    render(<AlarmsBar alarms={[LOW, HIGH, MEDIUM]} readOnly={false} />);
    const items = within(screen.getByRole("region", { name: "Alarmas" })).getAllByRole("listitem");

    expect(items.map((item) => item.getAttribute("data-priority"))).toEqual(["high", "medium", "low"]);
    expect(items[0]).toHaveTextContent("Prioridad alta");
    expect(items[0]).toHaveTextContent("Presión alta");
    expect(items[0]?.querySelector("svg")).not.toBeNull();
  });

  it("silences for 2 minutes with a visible countdown and keeps the alarms visible", () => {
    vi.useFakeTimers();
    const { clock, advance } = fakeClock();
    render(<AlarmsBar alarms={[HIGH]} readOnly={false} clock={clock} />);

    fireEvent.click(screen.getByRole("button", { name: "Silenciar 2 min" }));
    expect(screen.getByRole("button", { name: "Silenciado 2:00" })).toHaveAttribute("aria-pressed", "true");

    act(() => {
      advance(61_000);
      vi.advanceTimersByTime(61_000);
    });
    expect(screen.getByRole("button", { name: "Silenciado 0:59" })).toBeInTheDocument();
    expect(screen.getByText("Presión alta")).toBeInTheDocument();

    act(() => {
      advance(60_000);
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("button", { name: "Silenciar 2 min" })).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the sound off by default and beeps for new high/medium alarms only after the user enables it", () => {
    const beep = vi.fn();
    const factory = vi.fn(() => ({ beep, close: vi.fn() }));
    const { rerender } = render(<AlarmsBar alarms={[]} readOnly={false} beeperFactory={factory} />);

    expect(screen.getByRole("button", { name: "Sonido desactivado" })).toHaveAttribute("aria-pressed", "false");
    rerender(<AlarmsBar alarms={[HIGH]} readOnly={false} beeperFactory={factory} />);
    expect(factory).not.toHaveBeenCalled();
    expect(beep).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Sonido desactivado" }));
    expect(factory).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sonido activado" })).toHaveAttribute("aria-pressed", "true");

    rerender(<AlarmsBar alarms={[HIGH, LOW]} readOnly={false} beeperFactory={factory} />);
    expect(beep).not.toHaveBeenCalled();
    rerender(<AlarmsBar alarms={[HIGH, LOW, MEDIUM]} readOnly={false} beeperFactory={factory} />);
    expect(beep).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Silenciar 2 min" }));
    rerender(<AlarmsBar alarms={[]} readOnly={false} beeperFactory={factory} />);
    rerender(<AlarmsBar alarms={[HIGH]} readOnly={false} beeperFactory={factory} />);
    expect(beep).toHaveBeenCalledTimes(1);
  });

  it("keeps a session history of onsets and clears from the adapter updates", () => {
    const { clock, advance } = fakeClock(Date.UTC(2026, 9, 15, 12, 0, 0));
    const { rerender } = render(<AlarmsBar alarms={[HIGH]} readOnly={false} clock={clock} />);

    advance(5_000);
    rerender(<AlarmsBar alarms={[]} readOnly={false} clock={clock} />);
    fireEvent.click(screen.getByRole("button", { name: "Historial de alarmas (2)" }));

    const entries = within(screen.getByRole("region", { name: "Historial de alarmas" })).getAllByRole("listitem");
    expect(entries.map((entry) => entry.getAttribute("data-kind"))).toEqual(["clear", "onset"]);
    expect(entries[1]).toHaveTextContent("Inicio");
    expect(entries[1]).toHaveTextContent("Prioridad alta");
  });

  it("applies only the changed alarm limits and is read-only without a callback", () => {
    const onLimitsChange = vi.fn();
    const { rerender } = render(<AlarmsBar alarms={[]} readOnly={false} limits={LIMITS} onLimitsChange={onLimitsChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Límites" }));
    fireEvent.change(screen.getByLabelText("Presión alta"), { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar límites" }));

    expect(onLimitsChange).toHaveBeenCalledWith([{ id: "highPressure", value: 60 }]);

    rerender(<AlarmsBar alarms={[]} readOnly={false} limits={LIMITS} />);
    expect(screen.getByText("Solo consulta: la fuente no permite cambiar los límites.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aplicar límites" })).not.toBeInTheDocument();
  });

  it("hides the limits panel when the consumer passes no limits", () => {
    render(<AlarmsBar alarms={[]} readOnly={false} />);

    expect(screen.queryByRole("button", { name: "Límites" })).not.toBeInTheDocument();
    expect(screen.getByText("Sin alarmas activas")).toBeInTheDocument();
  });
});

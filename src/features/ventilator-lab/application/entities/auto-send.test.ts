/*
* Funcionalidad: Real ventilator auto-send scheduler tests
* Descripción: Unit tests of the auto-send scheduler with fake timers and a fake command port: one command 500 ms after the last change of any parameter, coalescing (latest value per parameter, one command) while a command is in flight, one command at a time (the queue waits for the settle and for a busy port), the safe-range rejection (nothing sent, the desired value dropped), a change back to the device value sends nothing, the status transitions (sending → applied / rejected with the server reason or the refusal message), Enter (applyNow) and Escape (discardQueued), and "Deshacer último cambio" (the previous values and mode go out through the same pipeline; nothing to undo after a rejection). v0.1 (Ajustes A, A2): first version. Depends on Vitest and the scheduler.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsoleConfirmation, ConsoleLimits } from "@shared/ventilator-console";
import { AUTO_SEND_COPY, AUTO_SEND_DEBOUNCE_MS, createAutoSendScheduler } from "./auto-send";
import type { AutoSendOutcome, AutoSendPort, AutoSendSubmit } from "./auto-send";

const LIMITS: ConsoleLimits = {
  tidalVolume: { min: 200, max: 800, step: 10, unit: "mL" },
  respiratoryRate: { min: 5, max: 35, step: 1, unit: "rpm" },
  peep: { min: 0, max: 15, step: 1, unit: "cmH2O" },
};

type FakePort = AutoSendPort & {
  sent: ConsoleConfirmation[]
  reported: Record<string, number>
  mode: string
  busy: boolean
  refusal: string | null
  /** Settles the last command sent. */
  finish: (outcome?: Partial<AutoSendOutcome>) => void
};

function fakePort(): FakePort {
  const outcomes = new Map<string, AutoSendOutcome | null>();
  const port: FakePort = {
    sent: [],
    reported: { tidalVolume: 450, respiratoryRate: 14, peep: 5 },
    mode: "VCV",
    busy: false,
    refusal: null,
    limits: () => LIMITS,
    baseline: () => ({ value: (parameter) => port.reported[parameter] ?? null, mode: port.mode }),
    submit(confirmation): AutoSendSubmit {
      if (port.busy || [...outcomes.values()].includes(null)) {
        return { ok: false, busy: true };
      }

      if (port.refusal !== null) {
        return { ok: false, busy: false, message: port.refusal };
      }

      const id = `cmd-${port.sent.length + 1}`;
      const values: Record<string, number> = {};

      confirmation.changes.forEach(({ parameter }) => {
        const before = port.reported[parameter];

        if (before !== undefined) {
          values[parameter] = before;
        }
      });
      port.sent.push(confirmation);
      outcomes.set(id, null);

      return { ok: true, id, previous: { values, mode: confirmation.mode === null ? null : port.mode } };
    },
    outcome: (id) => outcomes.get(id) ?? null,
    finish(outcome = {}) {
      const id = `cmd-${port.sent.length}`;
      const last = port.sent[port.sent.length - 1];
      const full = { rejected: {}, modeApplied: true, ...outcome };

      outcomes.set(id, full);

      // The device now runs what it accepted.
      last?.changes.forEach(({ parameter, value }) => {
        if (full.rejected[parameter] === undefined) {
          port.reported[parameter] = value;
        }
      });

      if (last?.mode && full.modeApplied) {
        port.mode = last.mode;
      }
    },
  };

  return port;
}

const change = (parameter: string, value: number): ConsoleConfirmation => ({ mode: null, changes: [{ parameter, value }] });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createAutoSendScheduler", () => {
  it("sends one command 500 ms after the last change of any parameter", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);

    expect(AUTO_SEND_DEBOUNCE_MS).toBe(500);
    scheduler.change(change("tidalVolume", 460));
    vi.advanceTimersByTime(400);
    scheduler.change(change("tidalVolume", 470));
    scheduler.change(change("peep", 6));
    vi.advanceTimersByTime(499);

    expect(port.sent).toEqual([]);
    expect(scheduler.getSnapshot()).toMatchObject({
      desired: { tidalVolume: 470, peep: 6 },
      status: { tidalVolume: { status: "sending" }, peep: { status: "sending" } },
      inFlight: false,
    });

    vi.advanceTimersByTime(1);

    expect(port.sent).toEqual([{ mode: null, changes: [{ parameter: "tidalVolume", value: 470 }, { parameter: "peep", value: 6 }] }]);
    expect(scheduler.getSnapshot()).toMatchObject({ desired: { tidalVolume: 470, peep: 6 }, inFlight: true });
  });

  it("coalesces the changes made while a command is in flight into one command after it settles", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);

    scheduler.change(change("tidalVolume", 500));
    vi.advanceTimersByTime(500);
    scheduler.change(change("respiratoryRate", 16));
    scheduler.change(change("respiratoryRate", 18));
    scheduler.change(change("tidalVolume", 520));
    vi.advanceTimersByTime(500);
    scheduler.sync();

    // One in flight at a time: nothing else left.
    expect(port.sent).toHaveLength(1);
    expect(scheduler.getSnapshot().desired).toEqual({ tidalVolume: 520, respiratoryRate: 18 });

    port.finish();
    scheduler.sync();

    expect(port.sent).toEqual([
      { mode: null, changes: [{ parameter: "tidalVolume", value: 500 }] },
      { mode: null, changes: [{ parameter: "respiratoryRate", value: 18 }, { parameter: "tidalVolume", value: 520 }] },
    ]);
    // The newer Vt waits in flight: its status is still the sending one.
    expect(scheduler.getSnapshot().status.tidalVolume).toEqual({ status: "sending" });
  });

  it("waits while the command machine is busy and sends once it accepts", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);

    port.busy = true;
    scheduler.change(change("peep", 7));
    vi.advanceTimersByTime(500);
    expect(port.sent).toEqual([]);

    port.busy = false;
    scheduler.sync();
    expect(port.sent).toEqual([change("peep", 7)]);
  });

  it("never sends a value outside the safe range and drops it from the display", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);

    scheduler.change(change("peep", 18));
    vi.advanceTimersByTime(1000);

    expect(port.sent).toEqual([]);
    expect(scheduler.getSnapshot()).toMatchObject({ desired: {}, status: { peep: { status: "rejected", message: AUTO_SEND_COPY.outOfRange } } });
  });

  it("sends nothing for a change back to the value the device runs", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);

    scheduler.change(change("peep", 6));
    scheduler.change(change("peep", 5));
    vi.advanceTimersByTime(1000);

    expect(port.sent).toEqual([]);
    expect(scheduler.getSnapshot()).toEqual({ desired: {}, desiredMode: null, status: {}, canUndo: false, inFlight: false });
  });

  it("goes from sending to applied, or to rejected with the server reason", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);

    scheduler.change({ mode: null, changes: [{ parameter: "tidalVolume", value: 500 }, { parameter: "peep", value: 8 }] });
    vi.advanceTimersByTime(500);
    port.finish({ rejected: { peep: "PEEP fuera del límite del equipo" }, notes: { tidalVolume: "aceptado; el equipo aún no informa el valor" } });
    scheduler.sync();

    expect(scheduler.getSnapshot()).toMatchObject({
      desired: {},
      inFlight: false,
      status: {
        tidalVolume: { status: "applied", message: "aceptado; el equipo aún no informa el valor" },
        peep: { status: "rejected", message: "PEEP fuera del límite del equipo" },
      },
    });
  });

  it("rejects the queued values when the command is refused before sending", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);

    port.refusal = "No se puede enviar el cambio";
    scheduler.change(change("respiratoryRate", 30));
    vi.advanceTimersByTime(500);

    expect(port.sent).toEqual([]);
    expect(scheduler.getSnapshot()).toMatchObject({ desired: {}, status: { respiratoryRate: { status: "rejected", message: "No se puede enviar el cambio" } } });
  });

  it("sends at once on applyNow and drops the queue on discardQueued", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);

    scheduler.change(change("peep", 6));
    scheduler.applyNow();
    expect(port.sent).toEqual([change("peep", 6)]);

    port.finish();
    scheduler.sync();
    scheduler.change(change("respiratoryRate", 20));
    scheduler.discardQueued();
    vi.advanceTimersByTime(1000);

    expect(port.sent).toHaveLength(1);
    expect(scheduler.getSnapshot().desired).toEqual({});
    expect(scheduler.getSnapshot().status.respiratoryRate).toBeUndefined();
  });

  it("undoes the last applied command through the same pipeline, mode included", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);

    expect(scheduler.undo()).toBe(false);
    scheduler.change({ mode: "SIMV", changes: [{ parameter: "tidalVolume", value: 500 }] });
    vi.advanceTimersByTime(500);
    expect(scheduler.getSnapshot()).toMatchObject({ desiredMode: "SIMV", canUndo: false });

    port.finish();
    scheduler.sync();
    expect(scheduler.getSnapshot().canUndo).toBe(true);

    expect(scheduler.undo()).toBe(true);
    expect(port.sent[1]).toEqual({ mode: "VCV", changes: [{ parameter: "tidalVolume", value: 450 }] });
    expect(scheduler.getSnapshot()).toMatchObject({ canUndo: false, desired: { tidalVolume: 450 }, desiredMode: "VCV" });
  });

  it("has nothing to undo after a rejected command", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);

    scheduler.change(change("peep", 9));
    vi.advanceTimersByTime(500);
    port.finish({ rejected: { peep: "rechazado por el equipo" }, modeApplied: false });
    scheduler.sync();

    expect(scheduler.getSnapshot().canUndo).toBe(false);
    expect(scheduler.undo()).toBe(false);
  });

  it("stops the debounce timer and notifies subscribers of every change", () => {
    const port = fakePort();
    const scheduler = createAutoSendScheduler(port);
    const listener = vi.fn();

    scheduler.subscribe(listener);
    scheduler.change(change("peep", 6));
    scheduler.stop();
    vi.advanceTimersByTime(1000);

    expect(port.sent).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

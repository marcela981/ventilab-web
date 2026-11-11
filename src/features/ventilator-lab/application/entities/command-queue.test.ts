/*
* Funcionalidad: Real ventilator command queue tests
* Descripción: Unit tests of the command queue with a fake command port: one command per Enviar, sent at once (no debounce), the changes of an Enviar made while a command is in flight coalesced (latest value per parameter) into one command once it settles, a busy port waited for, the safe-range rejection (nothing sent), a change back to the device value sends nothing, the status transitions (sending → confirmed while acknowledged → applied / confirmed with a note / unconfirmed on TIMEOUT / rejected with the reason or the refusal message) and discardQueued. v0.1 (Ajustes A, A2): first version (auto-send scheduler). v0.2 (2026-11-10, reverts A-1 to A-4): explicit send, confirmed and unconfirmed statuses; no debounce, applyNow nor undo (the console owns the undo).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it, vi } from "vitest";
import type { ConsoleConfirmation, ConsoleLimits } from "@shared/ventilator-console";
import { COMMAND_QUEUE_COPY, createCommandQueue } from "./command-queue";
import type { CommandQueueOutcome, CommandQueuePort, CommandQueueSubmit } from "./command-queue";

const LIMITS: ConsoleLimits = {
  tidalVolume: { min: 200, max: 800, step: 10, unit: "mL" },
  respiratoryRate: { min: 5, max: 35, step: 1, unit: "rpm" },
  peep: { min: 0, max: 15, step: 1, unit: "cmH2O" },
};

type FakePort = CommandQueuePort & {
  sent: ConsoleConfirmation[]
  reported: Record<string, number>
  mode: string
  busy: boolean
  refusal: string | null
  ack: boolean
  /** Settles the last command sent. */
  finish: (outcome?: Partial<CommandQueueOutcome>) => void
};

function fakePort(): FakePort {
  const outcomes = new Map<string, CommandQueueOutcome | null>();
  const port: FakePort = {
    sent: [],
    reported: { tidalVolume: 450, respiratoryRate: 14, peep: 5 },
    mode: "VCV",
    busy: false,
    refusal: null,
    ack: false,
    limits: () => LIMITS,
    baseline: () => ({ value: (parameter: string) => port.reported[parameter] ?? null, mode: port.mode }),
    submit(confirmation: ConsoleConfirmation): CommandQueueSubmit {
      if (port.busy || [...outcomes.values()].includes(null)) {
        return { ok: false, busy: true };
      }

      if (port.refusal !== null) {
        return { ok: false, busy: false, message: port.refusal };
      }

      const id = `cmd-${port.sent.length + 1}`;

      port.sent.push(confirmation);
      outcomes.set(id, null);

      return { ok: true, id };
    },
    outcome: (id: string) => outcomes.get(id) ?? null,
    acknowledged: () => port.ack,
    finish(outcome = {}) {
      const id = `cmd-${port.sent.length}`;
      const last = port.sent[port.sent.length - 1];
      const full: CommandQueueOutcome = { rejected: {}, modeApplied: true, ...outcome };

      outcomes.set(id, full);
      last?.changes.forEach(({ parameter, value }) => {
        if (full.rejected[parameter] === undefined) {
          port.reported[parameter] = value;
        }
      });
    },
  };

  return port;
}

const change = (parameter: string, value: number): ConsoleConfirmation => ({ mode: null, changes: [{ parameter, value }] });

describe("createCommandQueue", () => {
  it("sends ONE command at once per Enviar, with every changed parameter", () => {
    const port = fakePort();
    const queue = createCommandQueue(port);

    queue.send({ mode: null, changes: [{ parameter: "tidalVolume", value: 470 }, { parameter: "peep", value: 6 }] });

    expect(port.sent).toEqual([{ mode: null, changes: [{ parameter: "tidalVolume", value: 470 }, { parameter: "peep", value: 6 }] }]);
    expect(queue.getSnapshot()).toMatchObject({
      desired: { tidalVolume: 470, peep: 6 },
      status: { tidalVolume: { status: "sending" }, peep: { status: "sending" } },
      inFlight: true,
    });
  });

  it("coalesces the Enviar made while a command is in flight into one command after it settles", () => {
    const port = fakePort();
    const queue = createCommandQueue(port);

    queue.send(change("tidalVolume", 500));
    queue.send(change("respiratoryRate", 16));
    queue.send({ mode: null, changes: [{ parameter: "respiratoryRate", value: 18 }, { parameter: "tidalVolume", value: 520 }] });
    queue.sync();

    expect(port.sent).toHaveLength(1);
    expect(queue.getSnapshot().desired).toEqual({ tidalVolume: 520, respiratoryRate: 18 });

    port.finish();
    queue.sync();

    expect(port.sent).toEqual([
      change("tidalVolume", 500),
      { mode: null, changes: [{ parameter: "respiratoryRate", value: 18 }, { parameter: "tidalVolume", value: 520 }] },
    ]);
    expect(queue.getSnapshot().status.tidalVolume).toEqual({ status: "sending" });
  });

  it("waits while the command machine is busy and sends once it accepts", () => {
    const port = fakePort();
    const queue = createCommandQueue(port);

    port.busy = true;
    queue.send(change("peep", 7));
    expect(port.sent).toEqual([]);

    port.busy = false;
    queue.sync();
    expect(port.sent).toEqual([change("peep", 7)]);
  });

  it("never sends a value outside the safe range", () => {
    const port = fakePort();
    const queue = createCommandQueue(port);

    queue.send(change("peep", 18));

    expect(port.sent).toEqual([]);
    expect(queue.getSnapshot()).toMatchObject({ desired: {}, status: { peep: { status: "rejected", message: COMMAND_QUEUE_COPY.outOfRange } } });
  });

  it("sends nothing for a change back to the value the device runs", () => {
    const port = fakePort();
    const queue = createCommandQueue(port);

    queue.send(change("peep", 5));

    expect(port.sent).toEqual([]);
    expect(queue.getSnapshot()).toEqual({ desired: {}, desiredMode: null, status: {}, inFlight: false });
  });

  it("shows confirmed once the device acknowledges, then applied, confirmed with a note, unconfirmed or rejected", () => {
    const port = fakePort();
    const queue = createCommandQueue(port);

    queue.send({ mode: null, changes: [{ parameter: "tidalVolume", value: 500 }, { parameter: "peep", value: 8 }, { parameter: "respiratoryRate", value: 20 }] });
    port.ack = true;
    queue.sync();
    expect(queue.getSnapshot().status.tidalVolume).toEqual({ status: "confirmed" });

    port.finish({
      rejected: { peep: "PEEP fuera del límite del equipo" },
      unconfirmed: { respiratoryRate: "el equipo no confirmó el cambio a tiempo" },
      notes: { tidalVolume: "aceptado; el equipo aún no informa el valor" },
    });
    queue.sync();

    expect(queue.getSnapshot()).toMatchObject({
      desired: {},
      inFlight: false,
      status: {
        tidalVolume: { status: "confirmed", message: "aceptado; el equipo aún no informa el valor" },
        peep: { status: "rejected", message: "PEEP fuera del límite del equipo" },
        respiratoryRate: { status: "unconfirmed", message: "el equipo no confirmó el cambio a tiempo" },
      },
    });

    queue.send(change("peep", 6));
    port.finish();
    queue.sync();
    expect(queue.getSnapshot().status.peep).toEqual({ status: "applied" });
  });

  it("rejects the values when the command is refused before sending", () => {
    const port = fakePort();
    const queue = createCommandQueue(port);

    port.refusal = "No se puede enviar el cambio";
    queue.send(change("respiratoryRate", 30));

    expect(port.sent).toEqual([]);
    expect(queue.getSnapshot()).toMatchObject({ desired: {}, status: { respiratoryRate: { status: "rejected", message: "No se puede enviar el cambio" } } });
  });

  it("drops what waits on discardQueued and notifies subscribers", () => {
    const port = fakePort();
    const queue = createCommandQueue(port);
    const listener = vi.fn();

    queue.subscribe(listener);
    queue.send(change("peep", 6));
    queue.send(change("respiratoryRate", 20));
    queue.discardQueued();
    port.finish();
    queue.sync();

    expect(port.sent).toEqual([change("peep", 6)]);
    expect(queue.getSnapshot().desired).toEqual({});
    expect(queue.getSnapshot().status.respiratoryRate).toBeUndefined();
    expect(listener).toHaveBeenCalled();
  });
});

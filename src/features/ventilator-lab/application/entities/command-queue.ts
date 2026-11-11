/*
* Funcionalidad: Real ventilator command queue
* Descripción: Pure queue of the commands of the real July console (formerly the auto-send scheduler, auto-send.ts). Every Enviar of the console (`send`, the confirmed diff; "Deshacer último cambio" goes through the same path) becomes ONE command through the port at once, or, while another command is in flight or the port is busy (`submit` answers `busy` while the command machine cannot send: an unreported change, an uncertain send, a 429 wait), waits in a queue of the latest value per parameter (and the latest mode) and goes out as one command once the previous one settles (the port says when: `outcome` stops being null). A value outside the safe range (the client limits of buildCommandLimits: engine limits bounded by the lab safety settings) is never queued: it is marked "Rechazado: fuera del rango seguro" and the control shows the applied value again. Per parameter the status is `sending` (queued or in flight), `confirmed` (the device acknowledged it and has not reported it yet), `applied`, `unconfirmed` (no acknowledgement from the device, e.g. TIMEOUT: whether it was applied is unknown, never an error of the user) or `rejected` (out of range, the mapper refused it or the device or server rejected it, with the reason). The snapshot (`desired` values and mode to display, statuses) is published to subscribers. No React, no HTTP: the port wraps the command hook. v0.1 (Ajustes A, A2): first version (auto-send with a 500 ms debounce and its own undo). v0.2 (2026-11-10, reverts A-1 to A-4): explicit send: no debounce timer, no applyNow / stop (Enter and Escape belong to the console), no undo (the console owns "Deshacer último cambio" in Digital and Real alike); `confirmed` and `unconfirmed` statuses. Depends on the console store and contract types.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createExternalStore } from "@shared/ventilator-console";
import type { ConsoleConfirmation, ConsoleLimits, ConsoleSendStatus, ExternalStore } from "@shared/ventilator-console";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const COMMAND_QUEUE_COPY = {
  outOfRange: "fuera del rango seguro",
} as const;

/** What the device runs now (console units), to tell a real change from a value already there. */
export type CommandQueueBaseline = { value: (parameter: string) => number | null, mode: string | null };

export type CommandQueueSubmit =
  | { ok: true, id: string }
  /** The command machine cannot send now (one in flight, a block, a 429 wait): the queue waits. */
  | { ok: false, busy: true }
  /** Refused without sending (mapping, carried values): the queued values are rejected with `message`. */
  | { ok: false, busy: false, message: string };

/** How a command ended, per parameter: rejected, unconfirmed (no acknowledgement) or acknowledged and not reported yet. */
export type CommandQueueOutcome = {
  rejected: Readonly<Record<string, string>>
  unconfirmed?: Readonly<Record<string, string>>
  /** Acknowledged by the device, not reported yet (with the note to show). */
  notes?: Readonly<Record<string, string>>
  modeApplied: boolean
};

export type CommandQueuePort = {
  limits: () => ConsoleLimits
  baseline: () => CommandQueueBaseline
  submit: (confirmation: ConsoleConfirmation) => CommandQueueSubmit
  /** null while the command `id` is still in flight. */
  outcome: (id: string) => CommandQueueOutcome | null
  /** The command `id`, still in flight, was acknowledged by the device (ACKED / APPLIED, waiting for its report). */
  acknowledged: (id: string) => boolean
};

export type CommandQueueSnapshot = {
  /** Values queued or in flight (shown instead of the reported ones until they settle). */
  desired: Readonly<Record<string, number>>
  desiredMode: string | null
  status: Readonly<Record<string, ConsoleSendStatus>>
  inFlight: boolean
};

export type CommandQueue = ExternalStore<CommandQueueSnapshot> & {
  /** Enviar: one command with these changes now, or as soon as the previous one settles (latest value per parameter). */
  send: (confirmation: ConsoleConfirmation) => void
  /** Drops what is queued and not sent yet (control lost); a command in flight goes on. */
  discardQueued: () => void
  /** The command machine moved: marks an acknowledged command, settles the one in flight and sends what waits. */
  sync: () => void
};

const EMPTY_COMMAND_QUEUE_SNAPSHOT: CommandQueueSnapshot = { desired: {}, desiredMode: null, status: {}, inFlight: false };

type Flight = { id: string, values: Readonly<Record<string, number>>, mode: string | null };

const sameMode = (a: string | null, b: string | null): boolean => (a?.trim().toUpperCase() ?? null) === (b?.trim().toUpperCase() ?? null);

const has = (record: Readonly<Record<string, unknown>>, key: string): boolean => Object.prototype.hasOwnProperty.call(record, key);

function withinLimit(value: number, limits: ConsoleLimits, parameter: string): boolean {
  const limit = limits[parameter];

  return limit !== undefined && Number.isFinite(value) && value >= limit.min && value <= limit.max;
}

/** The status a settled parameter shows: rejected, unconfirmed, acknowledged (not reported yet) or applied. */
function settledStatus(outcome: CommandQueueOutcome, parameter: string): ConsoleSendStatus {
  const rejected = outcome.rejected[parameter];
  const unconfirmed = outcome.unconfirmed?.[parameter];
  const note = outcome.notes?.[parameter];

  if (rejected !== undefined) {
    return { status: "rejected", message: rejected };
  }

  if (unconfirmed !== undefined) {
    return { status: "unconfirmed", message: unconfirmed };
  }

  return note === undefined ? { status: "applied" } : { status: "confirmed", message: note };
}

export function createCommandQueue(port: CommandQueuePort): CommandQueue {
  const store = createExternalStore<CommandQueueSnapshot>(EMPTY_COMMAND_QUEUE_SNAPSHOT);
  let queued: Record<string, number> = {};
  let queuedMode: string | null = null;
  let flight: Flight | null = null;
  let status: Record<string, ConsoleSendStatus> = {};

  const publish = (): void => {
    store.set({ desired: { ...flight?.values, ...queued }, desiredMode: queuedMode ?? flight?.mode ?? null, status, inFlight: flight !== null });
  };

  const hasQueue = (): boolean => Object.keys(queued).length > 0 || queuedMode !== null;

  const trySend = (): void => {
    if (flight !== null || !hasQueue()) {
      return;
    }

    const values = queued;
    const mode = queuedMode;
    const result = port.submit({ mode, changes: Object.entries(values).map(([parameter, value]) => ({ parameter, value })) });

    if (result.ok) {
      flight = { id: result.id, values, mode };
    } else if (result.busy) {
      return;
    } else {
      status = { ...status };
      Object.keys(values).forEach((parameter) => {
        status[parameter] = { status: "rejected", message: result.message };
      });
    }

    queued = {};
    queuedMode = null;
  };

  const settle = (current: Flight, outcome: CommandQueueOutcome): void => {
    status = { ...status };
    Object.keys(current.values).forEach((parameter) => {
      // A newer value of this parameter waits in the queue: its status is the queued one.
      if (!has(queued, parameter)) {
        status[parameter] = settledStatus(outcome, parameter);
      }
    });
    flight = null;
  };

  const markAcknowledged = (current: Flight): void => {
    const pending = Object.keys(current.values).filter((parameter) => !has(queued, parameter) && status[parameter]?.status === "sending");

    if (pending.length > 0) {
      status = { ...status };
      pending.forEach((parameter) => {
        status[parameter] = { status: "confirmed" };
      });
    }
  };

  const send = (confirmation: ConsoleConfirmation): void => {
    const limits = port.limits();
    const baseline = port.baseline();
    const nextQueued = { ...queued };

    status = { ...status };
    confirmation.changes.forEach(({ parameter, value }) => {
      if (!withinLimit(value, limits, parameter)) {
        // A7: never sent; the control falls back to the applied (or in flight) value.
        delete nextQueued[parameter];
        status[parameter] = { status: "rejected", message: COMMAND_QUEUE_COPY.outOfRange };

        return;
      }

      const inFlight = flight !== null && has(flight.values, parameter);
      const settledValue = inFlight ? flight?.values[parameter] : baseline.value(parameter);

      if (value === settledValue) {
        // Back to what the device runs (or will run): nothing to send for it.
        delete nextQueued[parameter];

        if (!inFlight) {
          delete status[parameter];
        }

        return;
      }

      nextQueued[parameter] = value;
      status[parameter] = { status: "sending" };
    });

    if (confirmation.mode !== null) {
      queuedMode = sameMode(confirmation.mode, flight?.mode ?? baseline.mode) ? null : confirmation.mode;
    }

    queued = nextQueued;
    trySend();
    publish();
  };

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    send,
    discardQueued() {
      if (!hasQueue()) {
        return;
      }

      status = { ...status };
      Object.keys(queued).forEach((parameter) => {
        if (flight === null || !has(flight.values, parameter)) {
          delete status[parameter];
        }
      });
      queued = {};
      queuedMode = null;
      publish();
    },
    sync() {
      const current = flight;

      if (current !== null) {
        const outcome = port.outcome(current.id);

        if (outcome !== null) {
          settle(current, outcome);
        } else if (port.acknowledged(current.id)) {
          markAcknowledged(current);
        }
      }

      trySend();
      publish();
    },
  };
}

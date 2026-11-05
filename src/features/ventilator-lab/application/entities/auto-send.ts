/*
* Funcionalidad: Real ventilator auto-send scheduler
* Descripción: Pure scheduler of the automatic commands of the real July console (DISENO_AJUSTES_A §3.2, A-2, A-3, A-7). Every console change enters a queue of the latest value per parameter (and the latest mode); AUTO_SEND_DEBOUNCE_MS after the last change of any parameter the queue goes out as ONE command through the port. A value outside the safe range (the client limits of buildCommandLimits: engine limits bounded by the lab safety settings) is never queued: it is marked "Rechazado: fuera del rango seguro" and the control shows the applied value again. One command in flight at a time: changes made meanwhile coalesce in the queue and go out as one command once the previous one settles (the port says when: `outcome` stops being null) and the port accepts a new one (`submit` answers `busy` while the command machine cannot send: an unreported change, an uncertain send, a 429 wait). Per parameter the status is `sending` (queued or in flight), `applied` (the device accepted it; with a note when it does not report it yet) or `rejected` (out of range, the mapper refused it or the device or server rejected it, with the reason). "Deshacer último cambio" re-sends the values the device ran before the last applied command (and its previous mode) through the same queue, validation and command. The snapshot (`desired` values and mode to display, statuses, `canUndo`) is published to subscribers. No React, no HTTP: the port wraps the command hook. v0.1 (Ajustes A, A2): first version. Depends on the console store and contract types.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createExternalStore } from "@shared/ventilator-console";
import type { ConsoleConfirmation, ConsoleLimits, ConsoleSendStatus, ExternalStore } from "@shared/ventilator-console";

/** Wait after the last change of any parameter before the queued changes go out as one command (A-2). */
export const AUTO_SEND_DEBOUNCE_MS = 500;

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const AUTO_SEND_COPY = {
  outOfRange: "fuera del rango seguro",
  undo: "Deshacer último cambio",
  undoHint: "Vuelve a enviar los valores que el equipo tenía antes del último cambio aplicado",
} as const;

/** What the device runs now (console units), to tell a real change from a value already there. */
export type AutoSendBaseline = { value: (parameter: string) => number | null, mode: string | null };

/** The values (and mode) the device ran before a command; what "Deshacer último cambio" sends back. */
export type AutoSendRestore = { values: Readonly<Record<string, number>>, mode: string | null };

export type AutoSendSubmit =
  | { ok: true, id: string, previous: AutoSendRestore }
  /** The command machine cannot send now (one in flight, a block, a 429 wait): the queue waits. */
  | { ok: false, busy: true }
  /** Refused without sending (mapping, carried values): the queued values are rejected with `message`. */
  | { ok: false, busy: false, message: string };

/** How a command ended: the parameters it rejected (with the reason), notes of the applied ones, the mode. */
export type AutoSendOutcome = {
  rejected: Readonly<Record<string, string>>
  notes?: Readonly<Record<string, string>>
  modeApplied: boolean
};

export type AutoSendPort = {
  limits: () => ConsoleLimits
  baseline: () => AutoSendBaseline
  submit: (confirmation: ConsoleConfirmation) => AutoSendSubmit
  /** null while the command `id` is still in flight. */
  outcome: (id: string) => AutoSendOutcome | null
};

export type AutoSendSnapshot = {
  /** Values queued or in flight (shown instead of the reported ones until they settle). */
  desired: Readonly<Record<string, number>>
  desiredMode: string | null
  status: Readonly<Record<string, ConsoleSendStatus>>
  canUndo: boolean
  inFlight: boolean
};

export type AutoSendScheduler = ExternalStore<AutoSendSnapshot> & {
  /** A console change (latest value per parameter wins); restarts the debounce. */
  change: (confirmation: ConsoleConfirmation) => void
  /** Sends what is queued now (Enter), or as soon as the port accepts it. */
  applyNow: () => void
  /** Drops what is queued and not sent yet (Escape, control lost); a command in flight goes on. */
  discardQueued: () => void
  /** The command machine moved: settles the command in flight and sends what waits. */
  sync: () => void
  /** Re-sends the values before the last applied command; false when there is nothing to undo. */
  undo: () => boolean
  /** Drops the debounce timer (unmount); the scheduler stays usable. */
  stop: () => void
};

export const EMPTY_AUTO_SEND_SNAPSHOT: AutoSendSnapshot = { desired: {}, desiredMode: null, status: {}, canUndo: false, inFlight: false };

type Flight = { id: string, values: Readonly<Record<string, number>>, mode: string | null, previous: AutoSendRestore };

const sameMode = (a: string | null, b: string | null): boolean => (a?.trim().toUpperCase() ?? null) === (b?.trim().toUpperCase() ?? null);

function withinLimit(value: number, limits: ConsoleLimits, parameter: string): boolean {
  const limit = limits[parameter];

  return limit !== undefined && Number.isFinite(value) && value >= limit.min && value <= limit.max;
}

export function createAutoSendScheduler(port: AutoSendPort, { delayMs = AUTO_SEND_DEBOUNCE_MS }: { delayMs?: number } = {}): AutoSendScheduler {
  const store = createExternalStore<AutoSendSnapshot>(EMPTY_AUTO_SEND_SNAPSHOT);
  let queued: Record<string, number> = {};
  let queuedMode: string | null = null;
  let flight: Flight | null = null;
  let status: Record<string, ConsoleSendStatus> = {};
  let restore: AutoSendRestore | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const publish = (): void => {
    store.set({
      desired: { ...flight?.values, ...queued },
      desiredMode: queuedMode ?? flight?.mode ?? null,
      status,
      canUndo: restore !== null,
      inFlight: flight !== null,
    });
  };

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const hasQueue = (): boolean => Object.keys(queued).length > 0 || queuedMode !== null;

  const trySend = (): void => {
    if (flight !== null || timer !== null || !hasQueue()) {
      return;
    }

    const values = queued;
    const mode = queuedMode;
    const result = port.submit({ mode, changes: Object.entries(values).map(([parameter, value]) => ({ parameter, value })) });

    if (result.ok) {
      flight = { id: result.id, values, mode, previous: result.previous };
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
    publish();
  };

  const settle = (current: Flight, outcome: AutoSendOutcome): void => {
    const values: Record<string, number> = {};

    status = { ...status };
    Object.keys(current.values).forEach((parameter) => {
      // A newer value of this parameter waits in the queue: its status is the queued one.
      if (Object.prototype.hasOwnProperty.call(queued, parameter)) {
        return;
      }

      const rejected = outcome.rejected[parameter];
      const note = outcome.notes?.[parameter];

      if (rejected !== undefined) {
        status[parameter] = { status: "rejected", message: rejected };

        return;
      }

      status[parameter] = note === undefined ? { status: "applied" } : { status: "applied", message: note };

      const before = current.previous.values[parameter];

      if (before !== undefined) {
        values[parameter] = before;
      }
    });

    const mode = current.mode !== null && outcome.modeApplied ? current.previous.mode : null;

    if (Object.keys(values).length > 0 || mode !== null) {
      restore = { values, mode };
    }

    flight = null;
  };

  const change = (confirmation: ConsoleConfirmation): void => {
    const limits = port.limits();
    const baseline = port.baseline();
    const nextQueued = { ...queued };

    status = { ...status };
    confirmation.changes.forEach(({ parameter, value }) => {
      if (!withinLimit(value, limits, parameter)) {
        // A7: never sent; the control falls back to the applied (or in flight) value.
        delete nextQueued[parameter];
        status[parameter] = { status: "rejected", message: AUTO_SEND_COPY.outOfRange };

        return;
      }

      const inFlight = flight !== null && Object.prototype.hasOwnProperty.call(flight.values, parameter);
      const settledValue = inFlight ? flight?.values[parameter] : baseline.value(parameter);

      if (value === settledValue) {
        // Back to what the device runs (or will run): nothing to send for it.
        delete nextQueued[parameter];

        if (inFlight) {
          status[parameter] = { status: "sending" };
        } else {
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
    clearTimer();

    if (hasQueue()) {
      timer = setTimeout(() => {
        timer = null;
        trySend();
      }, delayMs);
    }

    publish();
  };

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    change,
    applyNow() {
      clearTimer();
      trySend();
    },
    discardQueued() {
      clearTimer();

      if (!hasQueue()) {
        return;
      }

      status = { ...status };
      Object.keys(queued).forEach((parameter) => {
        if (flight !== null && Object.prototype.hasOwnProperty.call(flight.values, parameter)) {
          return;
        }

        delete status[parameter];
      });
      queued = {};
      queuedMode = null;
      publish();
    },
    sync() {
      const current = flight;
      const outcome = current === null ? null : port.outcome(current.id);

      if (current !== null && outcome !== null) {
        settle(current, outcome);
        publish();
      }

      trySend();
    },
    undo() {
      if (restore === null) {
        return false;
      }

      const target = restore;

      restore = null;
      change({ mode: target.mode, changes: Object.entries(target.values).map(([parameter, value]) => ({ parameter, value })) });
      clearTimer();
      trySend();
      publish();

      return true;
    },
    stop: clearTimer,
  };
}

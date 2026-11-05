/*
* Funcionalidad: useAutoSend
* Descripción: The auto-send queue of the real July console (DISENO_AJUSTES_A §3.2) over the commands of the reservation (useVentilatorCommands): one auto-send scheduler per reservation whose port is the same send path as before (submit → POST /api/ventilator/commands, the command state machine and its statuses), the client safe limits (buildCommandLimits) and the device report. The scheduler moves whenever the command machine does (the command in flight changes or sending becomes possible again), drops what is still queued when the caller loses the control, and stops its timer on unmount. Returns the snapshot (desired values and mode to display, per-parameter send status, whether there is something to undo) and the console callbacks (change, Enter, Escape, undo). Depends on React, the auto-send scheduler and the commands hook types. v0.1 (Ajustes A, A2): first version.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ConsoleConfirmation } from "@shared/ventilator-console";
import { createAutoSendScheduler } from "../entities/auto-send";
import type { AutoSendPort, AutoSendScheduler, AutoSendSnapshot, AutoSendSubmit } from "../entities/auto-send";
import type { MappedCommand } from "../entities/command-mapper";
import type { VentilatorCommands } from "./use-ventilator-commands";

export type UseAutoSendOptions = {
  reservationId: string
  commands: VentilatorCommands
  /** The caller operates the device and it is live; false drops what is still queued. */
  canSend: boolean
};

export type AutoSend = AutoSendSnapshot & {
  onConfirm: (confirmation: ConsoleConfirmation) => void
  /** Enter: send what is queued now. */
  onApplyNow: () => void
  /** Escape: drop what is queued and not sent yet. */
  onCancel: () => void
  /** "Deshacer último cambio". */
  undo: () => void
};

type CommandsPort = AutoSendPort & {
  /** The latest commands of the hook (called after every render), so the port never reads a stale result. */
  update: (commands: VentilatorCommands) => void
};

function createCommandsPort(initial: VentilatorCommands): CommandsPort {
  const sentCommands = new Map<string, MappedCommand>();
  const commandsRef = { current: initial };

  return {
    update(commands) {
      commandsRef.current = commands;
    },
    limits: () => commandsRef.current.limits,
    baseline: () => ({ value: (parameter) => commandsRef.current.reportedValueOf(parameter), mode: commandsRef.current.reportedMode() }),
    submit(confirmation): AutoSendSubmit {
      const current = commandsRef.current;
      const mode = current.reportedMode();
      const result = current.submit(confirmation);

      if (!result.sent) {
        return result.busy ? { ok: false, busy: true } : { ok: false, busy: false, message: result.message };
      }

      const values: Record<string, number> = {};

      result.command.targets.forEach((target) => {
        if (typeof target.base === "number") {
          values[target.parameter] = target.base;
        }
      });
      sentCommands.set(result.localId, result.command);

      return { ok: true, id: result.localId, previous: { values, mode: result.command.modeChanged ? mode : null } };
    },
    outcome(id) {
      const command = sentCommands.get(id);
      // Unknown to this port (never happens): settle it as nothing applied rather than wait forever.
      const outcome = command === undefined ? { rejected: {}, modeApplied: false } : commandsRef.current.outcomeOf(id, command);

      if (outcome !== null) {
        sentCommands.delete(id);
      }

      return outcome;
    },
  };
}

type Entry = { reservationId: string, port: CommandsPort, scheduler: AutoSendScheduler };

function createEntry(reservationId: string, commands: VentilatorCommands): Entry {
  const port = createCommandsPort(commands);

  return { reservationId, port, scheduler: createAutoSendScheduler(port) };
}

export function useAutoSend({ reservationId, commands, canSend }: UseAutoSendOptions): AutoSend {
  // One queue per reservation (a new one replaces the entry during render); the port reads the latest commands.
  const [entry, setEntry] = useState<Entry>(() => createEntry(reservationId, commands));
  let current = entry;

  if (entry.reservationId !== reservationId) {
    current = createEntry(reservationId, commands);
    setEntry(current);
  }

  const { port, scheduler } = current;

  useLayoutEffect(() => {
    port.update(commands);
  });

  const snapshot = useSyncExternalStore(scheduler.subscribe, scheduler.getSnapshot, scheduler.getSnapshot);
  const { activeLocalId, canSubmitNow } = commands;

  // The command machine moved: settle the command in flight and send what waits.
  useEffect(() => {
    scheduler.sync();
  }, [scheduler, activeLocalId, canSubmitNow]);

  useEffect(() => {
    if (!canSend) {
      scheduler.discardQueued();
    }
  }, [scheduler, canSend]);

  useEffect(() => () => scheduler.stop(), [scheduler]);

  return useMemo(() => ({
    ...snapshot,
    onConfirm: scheduler.change,
    onApplyNow: scheduler.applyNow,
    onCancel: scheduler.discardQueued,
    undo: () => {
      scheduler.undo();
    },
  }), [snapshot, scheduler]);
}

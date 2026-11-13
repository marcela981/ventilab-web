/*
* Funcionalidad: useCommandQueue
* Descripción: The command queue of the real July console (formerly useAutoSend) over the commands of the reservation (useVentilatorCommands): one queue per reservation whose port is the same send path as before (submit → POST /api/ventilator/commands, the command state machine and its statuses), the client safe limits (buildCommandLimits) and the device report. The queue moves whenever the command machine does (the command in flight changes, the device acknowledges it or sending becomes possible again) and drops what is still queued when the caller loses the control. Returns the snapshot (desired values and mode to display, per-parameter send status) and `send`, the console Enviar (also "Deshacer último cambio"). Depends on React, the command queue and the commands hook types. v0.1 (Ajustes A, A2): first version (useAutoSend: debounce, Enter, Escape, undo). v0.2 (2026-11-10, reverts A-1 to A-4): explicit send; no debounce timer, Enter / Escape callbacks nor undo of its own.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ConsoleConfirmation } from "@shared/ventilator-console";
import { createCommandQueue } from "../entities/command-queue";
import type { CommandQueue, CommandQueuePort, CommandQueueSnapshot, CommandQueueSubmit } from "../entities/command-queue";
import type { MappedCommand } from "../entities/command-mapper";
import type { VentilatorCommands } from "./use-ventilator-commands";

export type UseCommandQueueOptions = {
  reservationId: string
  commands: VentilatorCommands
  /** The caller operates the device and it is live; false drops what is still queued. */
  canSend: boolean
};

export type CommandQueueState = CommandQueueSnapshot & {
  /** Enviar (and "Deshacer último cambio"): one command now or once the previous one settles. */
  send: (confirmation: ConsoleConfirmation) => void
};

type CommandsPort = CommandQueuePort & {
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
    submit(confirmation): CommandQueueSubmit {
      const result = commandsRef.current.submit(confirmation);

      if (!result.sent) {
        return result.busy ? { ok: false, busy: true } : { ok: false, busy: false, message: result.message };
      }

      sentCommands.set(result.localId, result.command);

      return { ok: true, id: result.localId };
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
    acknowledged: (id) => commandsRef.current.activeLocalId === id && commandsRef.current.activePhase === "confirmed",
  };
}

type Entry = { reservationId: string, port: CommandsPort, queue: CommandQueue };

function createEntry(reservationId: string, commands: VentilatorCommands): Entry {
  const port = createCommandsPort(commands);

  return { reservationId, port, queue: createCommandQueue(port) };
}

export function useCommandQueue({ reservationId, commands, canSend }: UseCommandQueueOptions): CommandQueueState {
  // One queue per reservation (a new one replaces the entry during render); the port reads the latest commands.
  const [entry, setEntry] = useState<Entry>(() => createEntry(reservationId, commands));
  let current = entry;

  if (entry.reservationId !== reservationId) {
    current = createEntry(reservationId, commands);
    setEntry(current);
  }

  const { port, queue } = current;

  useLayoutEffect(() => {
    port.update(commands);
  });

  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const { activeLocalId, activePhase, canSubmitNow } = commands;

  // The command machine moved: mark an acknowledged command, settle the one in flight and send what waits.
  useEffect(() => {
    queue.sync();
  }, [queue, activeLocalId, activePhase, canSubmitNow]);

  useEffect(() => {
    if (!canSend) {
      queue.discardQueued();
    }
  }, [queue, canSend]);

  return useMemo(() => ({ ...snapshot, send: queue.send }), [snapshot, queue]);
}

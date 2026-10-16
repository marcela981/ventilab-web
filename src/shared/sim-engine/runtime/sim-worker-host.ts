/*
* Funcionalidad: Simulation worker host
* Descripción: Worker-side command handler, kept apart from sim.worker.ts so it can be tested without a real Worker.
*   It receives protocol commands, owns one simulation loop, ticks it on a timer at about 30 Hz while the loop is
*   active and posts batches (only when they carry data or a status change), plus ready and error messages. The
*   message port, the timer functions and the clock are injected. Depends on protocol.ts, sim-loop.ts and the engine.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ENGINE_VERSION } from "../engine/engine-version";
import { isSimCommand, SIM_BATCH_RATE_HZ, type SimCommand, type SimWorkerMessage } from "./protocol";
import { createSimLoop, type SimBatch, type SimClock, type SimLoop, type SimLoopStatus } from "./sim-loop";

export interface SimWorkerHostDeps {
  readonly post: (message: SimWorkerMessage) => void;
  readonly setInterval: (handler: () => void, ms: number) => unknown;
  readonly clearInterval: (handle: unknown) => void;
  readonly clock?: SimClock;
}

export interface SimWorkerHost {
  handle(message: unknown): void;
}

function carriesData(batch: SimBatch, previousStatus: SimLoopStatus): boolean {
  return (
    batch.samples.length > 0 ||
    batch.metrics !== null ||
    batch.appliedEvents.length > 0 ||
    batch.rejectedEvents.length > 0 ||
    batch.status !== previousStatus
  );
}

export function createSimWorkerHost(deps: SimWorkerHostDeps): SimWorkerHost {
  let loop: SimLoop | null = null;
  let timer: unknown = null;
  let lastPostedStatus: SimLoopStatus = "idle";

  function flush(): void {
    if (loop === null) {
      return;
    }

    const batch = loop.tick();

    if (carriesData(batch, lastPostedStatus)) {
      lastPostedStatus = batch.status;
      deps.post({ type: "batch", batch });
    }
  }

  function stopTimer(): void {
    if (timer !== null) {
      deps.clearInterval(timer);
      timer = null;
    }
  }

  function startTimer(): void {
    if (timer === null) {
      timer = deps.setInterval(flush, Math.round(1000 / SIM_BATCH_RATE_HZ));
    }
  }

  function requireLoop(command: SimCommand): SimLoop {
    if (loop === null) {
      throw new Error(`The simulation must be initialised before "${command.type}"`);
    }

    return loop;
  }

  function run(command: SimCommand): void {
    switch (command.type) {
      case "init":
        stopTimer();
        loop = createSimLoop(command.engineCase, command.seed, {
          ...command.options,
          ...(deps.clock ? { clock: deps.clock } : {}),
        });
        lastPostedStatus = "idle";
        deps.post({ type: "ready", engineVersion: ENGINE_VERSION });
        break;
      case "start":
        requireLoop(command).start();
        startTimer();
        break;
      case "pause":
        requireLoop(command).pause();
        flush();
        break;
      case "resume":
        requireLoop(command).resume();
        break;
      case "setMultiplier":
        requireLoop(command).setMultiplier(command.multiplier);
        break;
      case "applyEvent":
        requireLoop(command).queueEvent(command.event);
        break;
      case "stop":
        requireLoop(command).stop();
        flush();
        stopTimer();
        break;
    }
  }

  return {
    handle(message: unknown) {
      if (!isSimCommand(message)) {
        deps.post({ type: "error", message: "Malformed simulation command" });

        return;
      }

      try {
        run(message);
      } catch (error) {
        deps.post({
          type: "error",
          message: error instanceof Error ? error.message : String(error),
          command: message.type,
        });
      }
    },
  };
}

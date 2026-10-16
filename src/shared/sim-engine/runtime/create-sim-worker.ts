/*
* Funcionalidad: Simulation worker factory and client
* Descripción: Main-thread side of the simulation worker. createSimWorker() builds the Web Worker with
*   new Worker(new URL("./sim.worker.ts", import.meta.url)) (bundled natively by webpack 5) and returns a small typed
*   client: send protocol commands, subscribe to ready/batch/error messages and terminate. It is SSR-safe: it returns
*   null when there is no window or Worker, so it must be called inside an effect in the browser.
*   createSimWorkerClient() wraps any Worker-like object, which lets tests inject a fake worker. Depends on protocol.ts.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isSimWorkerMessage, type SimCommand, type SimWorkerMessage } from "./protocol";

/** The subset of the Worker API the client needs. */
export interface WorkerLike {
  postMessage(message: SimCommand): void;
  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
  terminate(): void;
}

export type SimWorkerListener = (message: SimWorkerMessage) => void;

export interface SimWorkerClient {
  send(command: SimCommand): void;
  /** Registers a listener and returns its unsubscribe function. */
  subscribe(listener: SimWorkerListener): () => void;
  terminate(): void;
}

export function createSimWorkerClient(worker: WorkerLike): SimWorkerClient {
  const listeners = new Set<SimWorkerListener>();
  let terminated = false;

  const emit = (message: SimWorkerMessage): void => {
    listeners.forEach((listener) => listener(message));
  };

  worker.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (isSimWorkerMessage(event.data)) {
      emit(event.data);
    } else {
      emit({ type: "error", message: "Malformed message from the simulation worker" });
    }
  });
  worker.addEventListener("error", (event: ErrorEvent) => {
    emit({ type: "error", message: event.message || "The simulation worker failed" });
  });

  return {
    send(command: SimCommand) {
      if (!terminated) {
        worker.postMessage(command);
      }
    },
    subscribe(listener: SimWorkerListener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    terminate() {
      if (!terminated) {
        terminated = true;
        listeners.clear();
        worker.terminate();
      }
    },
  };
}

/** Creates the simulation worker in the browser; returns null during SSR or without Worker support. */
export function createSimWorker(): SimWorkerClient | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }

  const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { name: "ventylab-sim" });

  return createSimWorkerClient(worker);
}

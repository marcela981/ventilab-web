/*
* Funcionalidad: Simulation Web Worker entry
* Descripción: Thin Web Worker entry that wires the worker global scope (postMessage, message events, timers and
*   performance.now) to the simulation worker host. All logic lives in sim-worker-host.ts and sim-loop.ts. Loaded
*   from the main thread with new Worker(new URL("./sim.worker.ts", import.meta.url)).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/// <reference lib="webworker" />

import type { SimWorkerMessage } from "./protocol";
import { createSimWorkerHost } from "./sim-worker-host";

const scope = self as unknown as DedicatedWorkerGlobalScope;

const host = createSimWorkerHost({
  post: (message: SimWorkerMessage) => scope.postMessage(message),
  setInterval: (handler: () => void, ms: number) => scope.setInterval(handler, ms),
  clearInterval: (handle: unknown) => scope.clearInterval(handle as number),
  clock: { now: () => scope.performance.now() },
});

scope.addEventListener("message", (event: MessageEvent<unknown>) => host.handle(event.data));

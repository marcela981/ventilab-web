/*
* Funcionalidad: Worker replay client
* Descripción: Main-thread helper that runs the engine replay in the simulation Web Worker: it sends one `replay`
*   request with its own request id and resolves with the `replayResult` of that id (or rejects on an error carrying
*   that id, or on a worker failure without one). It unsubscribes once settled and ignores the messages of other
*   requests. The physics never runs on the main thread. Depends on protocol.ts and create-sim-worker.ts.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReplayResult } from "../engine/engine.types";
import type { SimWorkerClient } from "./create-sim-worker";
import type { SimReplayRequest, SimWorkerMessage } from "./protocol";

let requestCounter = 0;

function nextRequestId(): string {
  requestCounter += 1;

  return `replay-${requestCounter}`;
}

export function requestWorkerReplay(
  client: SimWorkerClient,
  request: SimReplayRequest,
  requestId: string = nextRequestId(),
): Promise<ReplayResult> {
  return new Promise<ReplayResult>((resolve, reject) => {
    const unsubscribe = client.subscribe((message: SimWorkerMessage) => {
      if (message.type === "replayResult" && message.requestId === requestId) {
        unsubscribe();
        resolve(message.result);
      } else if (message.type === "error" && (message.requestId === requestId || message.requestId === undefined)) {
        unsubscribe();
        reject(new Error(message.message));
      }
    });

    client.send({ type: "replay", requestId, request });
  });
}

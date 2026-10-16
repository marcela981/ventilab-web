/*
* Funcionalidad: Worker replay client
* Descripción: Main-thread helper that runs the engine replay in the simulation Web Worker: it sends one `replay`
*   request with its own request id and resolves with the `replayResult` of that id. It rejects only on an error that
*   belongs to this request (same request id, or a replay command error without an id), on the optional timeout
*   (`timeoutMs`) and on the optional abort signal; errors of other requests or commands are ignored. It unsubscribes
*   and clears its timer once settled. A DEDICATED worker is expected (one per replay request, terminated by the
*   caller afterwards): a worker crash carries no request id, so on a shared worker it is caught by the timeout, not
*   by the error. The physics never runs on the main thread. Depends on protocol.ts and create-sim-worker.ts.
*   v1.1: timeout, abort signal and request-scoped error matching.
* Versión: 1.1
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

/** Rejection reason of a replay that ran out of time or was aborted (`name` tells them apart). */
export class WorkerReplayError extends Error {
  constructor(message: string, name: "WorkerReplayTimeout" | "WorkerReplayAborted" | "WorkerReplayFailed") {
    super(message);
    this.name = name;
  }
}

export type WorkerReplayOptions = {
  requestId?: string | undefined
  /** Rejects with a `WorkerReplayTimeout` error after this many ms (no timeout when absent or not positive). */
  timeoutMs?: number | undefined
  /** Rejects with a `WorkerReplayAborted` error and unsubscribes when aborted. */
  signal?: AbortSignal | undefined
};

function belongsToRequest(message: Extract<SimWorkerMessage, { type: "error" }>, requestId: string): boolean {
  if (message.requestId !== undefined) {
    return message.requestId === requestId;
  }

  return message.command === "replay";
}

export function requestWorkerReplay(
  client: SimWorkerClient,
  request: SimReplayRequest,
  options: WorkerReplayOptions | string = {},
): Promise<ReplayResult> {
  const { requestId = nextRequestId(), timeoutMs, signal } = typeof options === "string" ? { requestId: options } : options;

  return new Promise<ReplayResult>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new WorkerReplayError("The replay request was aborted", "WorkerReplayAborted"));

      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: () => void = () => undefined;

    const cleanup = (): void => {
      unsubscribe();

      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }

      signal?.removeEventListener("abort", onAbort);
    };

    function onAbort(): void {
      cleanup();
      reject(new WorkerReplayError("The replay request was aborted", "WorkerReplayAborted"));
    }

    unsubscribe = client.subscribe((message: SimWorkerMessage) => {
      if (message.type === "replayResult" && message.requestId === requestId) {
        cleanup();
        resolve(message.result);
      } else if (message.type === "error" && belongsToRequest(message, requestId)) {
        cleanup();
        reject(new WorkerReplayError(message.message, "WorkerReplayFailed"));
      }
    });

    signal?.addEventListener("abort", onAbort);

    if (timeoutMs !== undefined && timeoutMs > 0 && Number.isFinite(timeoutMs)) {
      timer = setTimeout(() => {
        timer = null;
        cleanup();
        reject(new WorkerReplayError(`The replay did not answer within ${timeoutMs} ms`, "WorkerReplayTimeout"));
      }, timeoutMs);
    }

    client.send({ type: "replay", requestId, request });
  });
}

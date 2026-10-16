/*
* Funcionalidad: Simulation worker client tests
* Descripción: Verifies the main-thread client with a fake Worker: commands are posted, listeners receive valid
*   messages, malformed messages and worker errors become error messages, unsubscribe and terminate work, and the
*   factory returns null where Worker is unavailable (jsdom, SSR). Depends on vitest and the sim-engine runtime.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it, vi } from "vitest";
import { createSimWorker, createSimWorkerClient, type WorkerLike } from "./create-sim-worker";
import type { SimCommand } from "./protocol";

function createFakeWorker() {
  const handlers: Record<string, ((event: never) => void)[]> = {};
  const posted: SimCommand[] = [];
  const worker = {
    postMessage: (message: SimCommand) => posted.push(message),
    addEventListener: (type: string, listener: (event: never) => void) => {
      (handlers[type] ??= []).push(listener);
    },
    terminate: vi.fn(),
  } as unknown as WorkerLike & { terminate: ReturnType<typeof vi.fn> };
  const fire = (type: string, event: unknown) => handlers[type]?.forEach((handler) => handler(event as never));

  return { worker, posted, fire };
}

describe("createSimWorkerClient", () => {
  it("posts commands and delivers valid messages to subscribers", () => {
    const { worker, posted, fire } = createFakeWorker();
    const client = createSimWorkerClient(worker);
    const listener = vi.fn();
    const unsubscribe = client.subscribe(listener);

    client.send({ type: "start" });
    fire("message", { data: { type: "ready", engineVersion: "1.0.0" } });

    expect(posted).toEqual([{ type: "start" }]);
    expect(listener).toHaveBeenCalledWith({ type: "ready", engineVersion: "1.0.0" });

    unsubscribe();
    fire("message", { data: { type: "ready", engineVersion: "1.0.0" } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("turns malformed messages and worker errors into error messages", () => {
    const { worker, fire } = createFakeWorker();
    const client = createSimWorkerClient(worker);
    const listener = vi.fn();

    client.subscribe(listener);
    fire("message", { data: { type: "nonsense" } });
    fire("error", { message: "script failed" });

    expect(listener).toHaveBeenNthCalledWith(1, { type: "error", message: "Malformed message from the simulation worker" });
    expect(listener).toHaveBeenNthCalledWith(2, { type: "error", message: "script failed" });
  });

  it("stops sending and terminates the worker once", () => {
    const { worker, posted } = createFakeWorker();
    const client = createSimWorkerClient(worker);

    client.terminate();
    client.terminate();
    client.send({ type: "stop" });

    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(posted).toEqual([]);
  });
});

describe("createSimWorker", () => {
  it("returns null where Worker is unavailable", () => {
    expect(typeof Worker).toBe("undefined");
    expect(createSimWorker()).toBeNull();
  });
});

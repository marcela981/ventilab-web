/*
* Funcionalidad: useLocalReplay
* Descripción: Runs the engine replay of a recorded session (case, seed, events, untilMs, session multiplier) in a
*   simulation Web Worker, never on the main thread, and exposes idle / running / ready / error / unsupported. The
*   worker is created inside an effect (never during SSR), receives one replay request and is terminated as soon as
*   the result arrives or the request changes; a result for a previous request is ignored. The worker factory is
*   injectable for tests (jsdom has no Worker). Depends on React and the sim-engine public API.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef, useState } from "react";
import { createSimWorker, requestWorkerReplay } from "@shared/sim-engine";
import type { ReplayResult, SimReplayRequest, SimWorkerClient } from "@shared/sim-engine";

export type LocalReplayState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ready", result: ReplayResult }
  | { status: "error", message: string }
  | { status: "unsupported" };

export type LocalReplayDeps = {
  createWorker?: (() => SimWorkerClient | null) | undefined
};

type Settled = { request: SimReplayRequest, state: LocalReplayState };

export function useLocalReplay(request: SimReplayRequest | null, deps: LocalReplayDeps = {}): LocalReplayState {
  const [settled, setSettled] = useState<Settled | null>(null);
  const depsRef = useRef(deps);

  useEffect(() => {
    depsRef.current = deps;
  });

  useEffect(() => {
    if (request === null) {
      return undefined;
    }

    let active = true;
    const client = (depsRef.current.createWorker ?? createSimWorker)();
    const settle = (state: LocalReplayState): void => {
      if (active) {
        setSettled({ request, state });
      }
    };

    if (client === null) {
      void Promise.resolve().then(() => settle({ status: "unsupported" }));

      return () => {
        active = false;
      };
    }

    requestWorkerReplay(client, request)
      .then((result) => settle({ status: "ready", result }))
      .catch((error: unknown) => settle({ status: "error", message: error instanceof Error ? error.message : String(error) }))
      .finally(() => client.terminate());

    return () => {
      active = false;
      client.terminate();
    };
  }, [request]);

  if (request === null) {
    return { status: "idle" };
  }

  return settled && settled.request === request ? settled.state : { status: "running" };
}

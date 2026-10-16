/*
* Funcionalidad: useLocalReplay
* Descripción: Runs the engine replay of a recorded session (case, seed, events, untilMs, session multiplier) in a
*   dedicated simulation Web Worker, never on the main thread, and exposes idle / running / ready / error /
*   unsupported plus `retry`. The worker is created inside an effect (never during SSR), receives one replay request
*   and is terminated as soon as the result arrives or the request changes; a result for a previous request is
*   ignored. The request is aborted on unmount or request change and times out after LOCAL_REPLAY_TIMEOUT_MS (a
*   retryable error: `retry` runs it again in a new worker). The worker factory and the timeout are injectable for
*   tests (jsdom has no Worker). Depends on React, the sim-engine public API and the result config.
*   v1.1: abort on unmount, timeout and retry.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSimWorker, requestWorkerReplay } from "@shared/sim-engine";
import type { ReplayResult, SimReplayRequest, SimWorkerClient } from "@shared/sim-engine";
import { LOCAL_REPLAY_TIMEOUT_MS } from "../config/sim-result.config";

export type LocalReplayStatus =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ready", result: ReplayResult }
  | { status: "error", message: string, timedOut: boolean }
  | { status: "unsupported" };

export type LocalReplayState = LocalReplayStatus & {
  /** Runs the replay again in a new worker (after an error or a timeout). */
  retry: () => void
};

export type LocalReplayDeps = {
  createWorker?: (() => SimWorkerClient | null) | undefined
  /** Overrides LOCAL_REPLAY_TIMEOUT_MS (tests). */
  replayTimeoutMs?: number | undefined
};

type Settled = { request: SimReplayRequest, attempt: number, state: LocalReplayStatus };

export function useLocalReplay(request: SimReplayRequest | null, deps: LocalReplayDeps = {}): LocalReplayState {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);
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
    const settle = (state: LocalReplayStatus): void => {
      if (active) {
        setSettled({ request, attempt, state });
      }
    };

    if (client === null) {
      void Promise.resolve().then(() => settle({ status: "unsupported" }));

      return () => {
        active = false;
      };
    }

    const controller = new AbortController();

    requestWorkerReplay(client, request, {
      timeoutMs: depsRef.current.replayTimeoutMs ?? LOCAL_REPLAY_TIMEOUT_MS,
      signal: controller.signal,
    })
      .then((result) => settle({ status: "ready", result }))
      .catch((error: unknown) => settle({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        timedOut: error instanceof Error && error.name === "WorkerReplayTimeout",
      }))
      .finally(() => client.terminate());

    return () => {
      active = false;
      controller.abort();
      client.terminate();
    };
  }, [request, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // Memoised so consumers can key their own memos on the returned object.
  return useMemo<LocalReplayState>(() => {
    if (request === null) {
      return { status: "idle", retry };
    }

    const state = settled && settled.request === request && settled.attempt === attempt ? settled.state : { status: "running" as const };

    return { ...state, retry };
  }, [attempt, request, retry, settled]);
}

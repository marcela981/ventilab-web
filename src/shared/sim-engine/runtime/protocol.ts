/*
* Funcionalidad: Simulation worker message protocol
* Descripción: Typed messages exchanged between the main thread and the simulation Web Worker. Commands go from the
*   main thread to the worker (init, start, pause, resume, setMultiplier, applyEvent, stop); the worker answers with
*   ready, batch and error messages. Includes runtime type guards so each side can reject malformed messages. Every
*   message is plain structured-cloneable data. Depends on the engine types and the simulation loop types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { EngineCase, EngineOptions, TimeMultiplier } from "../engine/engine.types";
import type { SimBatch, SimEventInput } from "./sim-loop";

/** Approximate rate at which the worker posts batches. */
export const SIM_BATCH_RATE_HZ = 30;

export interface SimInitOptions {
  readonly engineOptions?: EngineOptions;
  readonly multiplier?: TimeMultiplier;
  readonly fixedStepMs?: number;
  readonly maxCatchUpMsPerTick?: number;
  readonly metricsEveryMs?: number;
}

export type SimCommand =
  | { readonly type: "init"; readonly engineCase: EngineCase; readonly seed: number; readonly options?: SimInitOptions }
  | { readonly type: "start" }
  | { readonly type: "pause" }
  | { readonly type: "resume" }
  | { readonly type: "setMultiplier"; readonly multiplier: TimeMultiplier }
  | { readonly type: "applyEvent"; readonly event: SimEventInput }
  | { readonly type: "stop" };

export type SimWorkerMessage =
  | { readonly type: "ready"; readonly engineVersion: string }
  | { readonly type: "batch"; readonly batch: SimBatch }
  | { readonly type: "error"; readonly message: string; readonly command?: SimCommand["type"] };

const TIME_MULTIPLIERS: readonly number[] = [1, 2, 4];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEventInput(value: unknown): value is SimEventInput {
  if (!isRecord(value) || (value.simTimeMs !== undefined && typeof value.simTimeMs !== "number")) {
    return false;
  }

  return value.type === "RECONNECT" || (value.type === "PARAM_CHANGE" && isRecord(value.changes));
}

export function isSimCommand(value: unknown): value is SimCommand {
  if (!isRecord(value)) {
    return false;
  }

  switch (value.type) {
    case "init":
      return isRecord(value.engineCase) && typeof value.seed === "number";
    case "start":
    case "pause":
    case "resume":
    case "stop":
      return true;
    case "setMultiplier":
      return typeof value.multiplier === "number" && TIME_MULTIPLIERS.includes(value.multiplier);
    case "applyEvent":
      return isEventInput(value.event);
    default:
      return false;
  }
}

export function isSimWorkerMessage(value: unknown): value is SimWorkerMessage {
  if (!isRecord(value)) {
    return false;
  }

  switch (value.type) {
    case "ready":
      return typeof value.engineVersion === "string";
    case "batch":
      return isRecord(value.batch) && typeof value.batch.simTimeMs === "number" && Array.isArray(value.batch.samples);
    case "error":
      return typeof value.message === "string";
    default:
      return false;
  }
}

/*
* Funcionalidad: Simulation worker message protocol
* Descripción: Typed messages exchanged between the main thread and the simulation Web Worker. Commands go from the
*   main thread to the worker (init, start, pause, resume, setMultiplier, applyEvent, stop); the worker answers with
*   ready, batch and error messages. Includes runtime type guards so each side can reject malformed messages. Every
*   message is plain structured-cloneable data. v1.1: event times must be finite and non-negative, and init requires a
*   finite seed, an allowed multiplier and finite numeric options. Depends on the engine types and the simulation
*   loop types. v1.2 (T6): init may carry `initialEvents` (each with a finite non-negative simTimeMs) and a finite
*   non-negative `startAtSimTimeMs` to resume a session. v1.3: an event may carry a client `id` (non-empty string of
*   at most 64 characters, as the backend allows); batches report its confirmation with the effective time. v1.4:
*   init may carry a finite non-negative `initialBacklogMs` (wall-clock resume).
* Versión: 1.4
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
  /** Stored session events to replay while catching up to startAtSimTimeMs (resume). */
  readonly initialEvents?: readonly SimEventInput[];
  readonly startAtSimTimeMs?: number;
  /** Simulated milliseconds owed by the wall clock at init, caught up after start (wall-clock resume). */
  readonly initialBacklogMs?: number;
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalFinite(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

function isOptionalMultiplier(value: unknown): boolean {
  return value === undefined || (typeof value === "number" && TIME_MULTIPLIERS.includes(value));
}

function isEngineOptions(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOptionalFinite(value.sampleRateHz) &&
    isOptionalFinite(value.waveformCapacity) &&
    isOptionalMultiplier(value.timeMultiplier) &&
    (value.noise === undefined || typeof value.noise === "boolean")
  );
}

function isInitOptions(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return (
    isRecord(value) &&
    (value.engineOptions === undefined || isEngineOptions(value.engineOptions)) &&
    isOptionalMultiplier(value.multiplier) &&
    isOptionalFinite(value.fixedStepMs) &&
    isOptionalFinite(value.maxCatchUpMsPerTick) &&
    isOptionalFinite(value.metricsEveryMs) &&
    (value.startAtSimTimeMs === undefined || isNonNegativeFinite(value.startAtSimTimeMs)) &&
    (value.initialBacklogMs === undefined || isNonNegativeFinite(value.initialBacklogMs)) &&
    (value.initialEvents === undefined ||
      (Array.isArray(value.initialEvents) &&
        value.initialEvents.every((event: unknown) => isEventInput(event) && isRecord(event) && isNonNegativeFinite(event.simTimeMs))))
  );
}

function isNonNegativeFinite(value: unknown): boolean {
  return isFiniteNumber(value) && value >= 0;
}

/** Longest client event id the backend accepts. */
const MAX_EVENT_ID_LENGTH = 64;

function isEventId(value: unknown): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_EVENT_ID_LENGTH;
}

function isEventInput(value: unknown): value is SimEventInput {
  if (!isRecord(value) || (value.simTimeMs !== undefined && !isNonNegativeFinite(value.simTimeMs))) {
    return false;
  }

  if (value.id !== undefined && !isEventId(value.id)) {
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
      return isRecord(value.engineCase) && isFiniteNumber(value.seed) && isInitOptions(value.options);
    case "start":
    case "pause":
    case "resume":
    case "stop":
      return true;
    case "setMultiplier":
      return value.multiplier !== undefined && isOptionalMultiplier(value.multiplier);
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

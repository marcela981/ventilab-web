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
*   init may carry a finite non-negative `initialBacklogMs` (wall-clock resume). v1.5 (T8 replay): init may carry a
*   positive `playbackRate` (at most MAX_PLAYBACK_RATE) and a non-negative `endAtSimTimeMs`; `setPlaybackRate` changes
*   the local playback speed; `replay` asks the worker to run the engine replay (case, seed, events, untilMs, replay
*   options) off the main thread and is answered by `replayResult` with the same request id (an error carries it too).
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { EngineCase, EngineEvent, EngineOptions, ReplayOptions, ReplayResult, TimeMultiplier } from "../engine/engine.types";
import type { SimBatch, SimEventInput } from "./sim-loop";

/** Approximate rate at which the worker posts batches. */
export const SIM_BATCH_RATE_HZ = 30;
/** Highest local playback speed a replay may request. */
export const MAX_PLAYBACK_RATE = 16;

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
  /** Local playback speed of a replay (simulated ms per wall ms on top of the multiplier). */
  readonly playbackRate?: number;
  /** Replay end: the loop pauses there. */
  readonly endAtSimTimeMs?: number;
}

/** Engine replay run in the worker: the same arguments as the engine `replay`. */
export interface SimReplayRequest {
  readonly engineCase: EngineCase;
  readonly seed: number;
  readonly events: readonly EngineEvent[];
  readonly untilMs: number;
  readonly options?: ReplayOptions;
}

export type SimCommand =
  | { readonly type: "init"; readonly engineCase: EngineCase; readonly seed: number; readonly options?: SimInitOptions }
  | { readonly type: "start" }
  | { readonly type: "pause" }
  | { readonly type: "resume" }
  | { readonly type: "setMultiplier"; readonly multiplier: TimeMultiplier }
  | { readonly type: "applyEvent"; readonly event: SimEventInput }
  | { readonly type: "setPlaybackRate"; readonly rate: number }
  | { readonly type: "replay"; readonly requestId: string; readonly request: SimReplayRequest }
  | { readonly type: "stop" };

export type SimWorkerMessage =
  | { readonly type: "ready"; readonly engineVersion: string }
  | { readonly type: "batch"; readonly batch: SimBatch }
  | { readonly type: "replayResult"; readonly requestId: string; readonly result: ReplayResult }
  | {
      readonly type: "error";
      readonly message: string;
      readonly command?: SimCommand["type"];
      /** Set when the failed command was a replay request. */
      readonly requestId?: string;
    };

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
    (value.playbackRate === undefined || isPlaybackRate(value.playbackRate)) &&
    (value.endAtSimTimeMs === undefined || isNonNegativeFinite(value.endAtSimTimeMs)) &&
    (value.initialEvents === undefined ||
      (Array.isArray(value.initialEvents) &&
        value.initialEvents.every((event: unknown) => isEventInput(event) && isRecord(event) && isNonNegativeFinite(event.simTimeMs))))
  );
}

function isNonNegativeFinite(value: unknown): boolean {
  return isFiniteNumber(value) && value >= 0;
}

function isPlaybackRate(value: unknown): boolean {
  return isFiniteNumber(value) && value > 0 && value <= MAX_PLAYBACK_RATE;
}

function isEngineEvent(value: unknown): boolean {
  if (!isRecord(value) || !isNonNegativeFinite(value.simTimeMs)) {
    return false;
  }

  return value.type === "RECONNECT" || (value.type === "PARAM_CHANGE" && isRecord(value.changes));
}

function isReplayRequest(value: unknown): boolean {
  return (
    isRecord(value) &&
    isRecord(value.engineCase) &&
    isFiniteNumber(value.seed) &&
    isNonNegativeFinite(value.untilMs) &&
    Array.isArray(value.events) &&
    value.events.every(isEngineEvent) &&
    (value.options === undefined ||
      (isEngineOptions(value.options) &&
        isRecord(value.options) &&
        (value.options.metricsIntervalMs === undefined || isPositiveFinite(value.options.metricsIntervalMs))))
  );
}

function isPositiveFinite(value: unknown): boolean {
  return isFiniteNumber(value) && value > 0;
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
    case "setPlaybackRate":
      return isPlaybackRate(value.rate);
    case "replay":
      return isEventId(value.requestId) && isReplayRequest(value.request);
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
    case "replayResult":
      return (
        typeof value.requestId === "string" &&
        isRecord(value.result) &&
        isRecord(value.result.final) &&
        Array.isArray(value.result.metricsTimeline)
      );
    case "error":
      return typeof value.message === "string";
    default:
      return false;
  }
}

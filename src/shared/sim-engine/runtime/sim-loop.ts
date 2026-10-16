/*
* Funcionalidad: Fixed-step simulation loop
* Descripción: Pure (no DOM, no Worker) driver of the vendored physiological engine. Simulated time follows
*   simTime = wallElapsed × multiplier through an accumulator that is consumed in fixed steps, so time is neither
*   lost nor invented. After a long gap (for example a background tab) the backlog is caught up in bounded chunks per
*   tick and the remainder carries to the next tick. Queued engine events (PARAM_CHANGE, RECONNECT) are applied at
*   their exact simulated time, as the engine replay does. Each tick returns a batch with the drained waveform
*   samples, metrics (about once per simulated second or after an event) and the current alarms. The clock is
*   injectable for tests. v1.1: the engine is stepped only while running, so a backlog owed before a pause is kept
*   (not drained) and caught up after resume; the backlog has no cap by design; an event with a non-finite simTimeMs
*   is rejected. v1.2 (T6 session resume): `initialEvents` + `startAtSimTimeMs` replay a session's stored events up
*   to a start time at creation, so a reloaded console catches up deterministically (same result as the engine
*   replay); the catch-up waveform and the already-stored events are not re-streamed, and an initial event later
*   than the start time stays scheduled. v1.3: an event may carry a client `id`; every applied event with an id is
*   confirmed in the next batch as {id, effectiveSimTimeMs} with the simulated time the engine really applied it, so
*   the caller records that exact time (local run == server replay); a rejected event keeps its id and is never
*   confirmed, and the stored events replayed at resume are not confirmed again. Depends on
*   src/shared/sim-engine/engine. v1.4: `initialBacklogMs` seeds the accumulator (wall-clock resume after a reload):
*   it is owed until start and then caught up in the usual bounded chunks, streamed like any other catch-up.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { applyEvent, createSimulation, getMetrics, getWaveformBuffer, step } from "../engine/simulation";
import type {
  Alarm,
  EngineCase,
  EngineEvent,
  EngineMetrics,
  EngineOptions,
  EngineState,
  TimeMultiplier,
  VentilatorSettings,
  WaveformSample,
} from "../engine/engine.types";

/** Default fixed step of the loop, in simulated milliseconds. */
export const DEFAULT_FIXED_STEP_MS = 10;
/** Default bound of simulated milliseconds advanced by a single tick. */
export const DEFAULT_MAX_CATCH_UP_MS_PER_TICK = 2000;
/** Default simulated interval between metrics snapshots. */
export const DEFAULT_METRICS_EVERY_MS = 1000;

export interface SimClock {
  /** Monotonic wall-clock time in milliseconds. */
  now(): number;
}

export type SimLoopStatus = "idle" | "running" | "paused" | "stopped";

/**
 * An engine event as the UI requests it: without simTimeMs it is applied at the current simulated time. The optional
 * client id is echoed back in the batch confirmation (or the rejection) of the event.
 */
export type SimEventInput =
  | {
      readonly type: "PARAM_CHANGE";
      readonly changes: Partial<VentilatorSettings>;
      readonly simTimeMs?: number;
      readonly id?: string;
    }
  | { readonly type: "RECONNECT"; readonly simTimeMs?: number; readonly id?: string };

export interface RejectedSimEvent {
  readonly event: SimEventInput;
  readonly message: string;
}

/** An event with a client id that the engine applied, with the simulated time it really took effect. */
export interface SimEventConfirmation {
  readonly id: string;
  readonly effectiveSimTimeMs: number;
}

export interface SimBatch {
  readonly simTimeMs: number;
  readonly status: SimLoopStatus;
  /** Simulated milliseconds still owed by the wall clock (backlog left for the next ticks). */
  readonly backlogMs: number;
  readonly samples: readonly WaveformSample[];
  readonly droppedSamples: number;
  /** Fresh metrics when a snapshot was due in this tick, otherwise null. */
  readonly metrics: EngineMetrics | null;
  /** Alarms from the most recent metrics snapshot. */
  readonly alarms: readonly Alarm[];
  /** Events applied in this tick, stamped with the simulated time they took effect. */
  readonly appliedEvents: readonly EngineEvent[];
  /** Applied events that carried a client id, with their effective simulated time. */
  readonly confirmedEvents: readonly SimEventConfirmation[];
  readonly rejectedEvents: readonly RejectedSimEvent[];
}

export interface SimLoopOptions {
  readonly engineOptions?: EngineOptions;
  readonly multiplier?: TimeMultiplier;
  readonly clock?: SimClock;
  readonly fixedStepMs?: number;
  readonly maxCatchUpMsPerTick?: number;
  readonly metricsEveryMs?: number;
  /** Events already recorded for the session (resume): applied at their simTimeMs while catching up. */
  readonly initialEvents?: readonly SimEventInput[];
  /** Simulated time the loop starts from (resume); the engine is stepped there at creation. Default 0. */
  readonly startAtSimTimeMs?: number;
  /**
   * Simulated milliseconds already owed at creation (wall-clock resume): caught up after start through the normal
   * bounded backlog, so the catch-up is stepped and streamed, never invented. Default 0.
   */
  readonly initialBacklogMs?: number;
}

export interface SimLoop {
  readonly status: SimLoopStatus;
  readonly simTimeMs: number;
  readonly multiplier: TimeMultiplier;
  start(): void;
  pause(): void;
  resume(): void;
  setMultiplier(multiplier: TimeMultiplier): void;
  /** Queues an event; it is applied now, or when the simulation reaches its simTimeMs. */
  queueEvent(event: SimEventInput): void;
  /** Advances the simulation for the wall time elapsed since the last tick and drains a batch. */
  tick(): SimBatch;
  stop(): void;
}

const defaultClock: SimClock = { now: () => performance.now() };

interface ScheduledEvent {
  readonly input: SimEventInput;
  readonly simTimeMs: number;
  readonly order: number;
}

function toEngineEvent(input: SimEventInput, simTimeMs: number): EngineEvent {
  return input.type === "PARAM_CHANGE"
    ? { type: "PARAM_CHANGE", simTimeMs, changes: input.changes }
    : { type: "RECONNECT", simTimeMs };
}

function positiveOr(value: number | undefined, fallback: number, name: string): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }

  return value;
}

export function createSimLoop(engineCase: EngineCase, seed: number, options: SimLoopOptions = {}): SimLoop {
  const clock = options.clock ?? defaultClock;
  const fixedStepMs = positiveOr(options.fixedStepMs, DEFAULT_FIXED_STEP_MS, "fixedStepMs");

  // The engine advances in whole internal steps of 1 ms, so the loop step must be whole too.
  if (!Number.isInteger(fixedStepMs)) {
    throw new RangeError("fixedStepMs must be a whole number of milliseconds");
  }

  const maxCatchUpMs = positiveOr(options.maxCatchUpMsPerTick, DEFAULT_MAX_CATCH_UP_MS_PER_TICK, "maxCatchUpMsPerTick");
  const metricsEveryMs = positiveOr(options.metricsEveryMs, DEFAULT_METRICS_EVERY_MS, "metricsEveryMs");
  const startAtSimTimeMs = options.startAtSimTimeMs ?? 0;

  if (!Number.isFinite(startAtSimTimeMs) || startAtSimTimeMs < 0) {
    throw new RangeError("startAtSimTimeMs must be a finite non-negative number");
  }

  const initialBacklogMs = options.initialBacklogMs ?? 0;

  if (!Number.isFinite(initialBacklogMs) || initialBacklogMs < 0) {
    throw new RangeError("initialBacklogMs must be a finite non-negative number");
  }

  // At least one fixed step per tick, so a misconfigured bound can never stall the loop.
  const maxStepsPerTick = Math.max(1, Math.floor(maxCatchUpMs / fixedStepMs));
  const state: EngineState = createSimulation(engineCase, seed, options.engineOptions ?? {});

  let status: SimLoopStatus = "idle";
  let multiplier: TimeMultiplier = options.multiplier ?? 1;
  let lastWallMs = 0;
  let accumulatorMs = initialBacklogMs;
  let nextMetricsAtMs = 0;
  let eventOrder = 0;
  let scheduled: ScheduledEvent[] = [];
  let latestAlarms: readonly Alarm[] = [];
  let applied: EngineEvent[] = [];
  let confirmed: SimEventConfirmation[] = [];
  let rejected: RejectedSimEvent[] = [];
  let metricsDue = true;

  /** Moves the wall time elapsed since the last observation into the accumulator. */
  function accrueWallTime(): void {
    if (status !== "running") {
      return;
    }

    const now = clock.now();

    accumulatorMs += Math.max(0, now - lastWallMs) * multiplier;
    lastWallMs = now;
  }

  function applyNow(input: SimEventInput): void {
    const event = toEngineEvent(input, state.simTimeMs);

    try {
      applyEvent(state, event);
      applied.push(event);
      metricsDue = true;

      if (input.id !== undefined) {
        confirmed.push({ id: input.id, effectiveSimTimeMs: event.simTimeMs });
      }
    } catch (error) {
      rejected.push({ event: input, message: error instanceof Error ? error.message : String(error) });
    }
  }

  /** Steps the engine to targetMs, applying every scheduled event at its exact simulated time. */
  function advanceTo(targetMs: number): void {
    let next = scheduled[0];

    while (next !== undefined && next.simTimeMs <= targetMs) {
      if (next.simTimeMs > state.simTimeMs) {
        step(state, next.simTimeMs - state.simTimeMs);
      }

      scheduled = scheduled.slice(1);
      applyNow(next.input);
      next = scheduled[0];
    }

    if (targetMs > state.simTimeMs) {
      step(state, targetMs - state.simTimeMs);
    }
  }

  function drain(): SimBatch {
    const { samples, droppedSamples } = getWaveformBuffer(state);
    let metrics: EngineMetrics | null = null;

    if (metricsDue || state.simTimeMs >= nextMetricsAtMs) {
      metrics = getMetrics(state);
      latestAlarms = metrics.alarms;
      metricsDue = false;

      while (nextMetricsAtMs <= state.simTimeMs) {
        nextMetricsAtMs += metricsEveryMs;
      }
    }

    const batch: SimBatch = {
      simTimeMs: state.simTimeMs,
      status,
      backlogMs: accumulatorMs,
      samples,
      droppedSamples,
      metrics,
      alarms: latestAlarms,
      appliedEvents: applied,
      confirmedEvents: confirmed,
      rejectedEvents: rejected,
    };

    applied = [];
    confirmed = [];
    rejected = [];

    return batch;
  }

  const loop: SimLoop = {
    get status() {
      return status;
    },
    get simTimeMs() {
      return state.simTimeMs;
    },
    get multiplier() {
      return multiplier;
    },
    start() {
      if (status !== "idle") {
        return;
      }

      status = "running";
      lastWallMs = clock.now();
    },
    pause() {
      if (status !== "running") {
        return;
      }

      // Wall time up to the pause still counts; nothing accrues afterwards.
      accrueWallTime();
      status = "paused";
    },
    resume() {
      if (status !== "paused") {
        return;
      }

      status = "running";
      lastWallMs = clock.now();
    },
    setMultiplier(next: TimeMultiplier) {
      // Time elapsed so far is converted at the previous multiplier.
      accrueWallTime();
      multiplier = next;
    },
    queueEvent(input: SimEventInput) {
      if (status === "stopped") {
        rejected.push({ event: input, message: "The simulation is stopped" });

        return;
      }

      if (input.simTimeMs !== undefined && !Number.isFinite(input.simTimeMs)) {
        rejected.push({ event: input, message: "simTimeMs must be a finite number" });

        return;
      }

      if (input.simTimeMs === undefined || input.simTimeMs <= state.simTimeMs) {
        applyNow(input);

        return;
      }

      eventOrder += 1;
      // Rounded up to the engine's 1 ms internal step, so it is applied exactly at a step boundary.
      scheduled = [...scheduled, { input, simTimeMs: Math.ceil(input.simTimeMs), order: eventOrder }].sort(
        (a, b) => a.simTimeMs - b.simTimeMs || a.order - b.order,
      );
    },
    tick() {
      accrueWallTime();

      // Only a running loop steps: a backlog owed before a pause is kept and caught up after resume.
      if (status === "running") {
        const steps = Math.min(Math.floor(accumulatorMs / fixedStepMs), maxStepsPerTick);

        if (steps > 0) {
          advanceTo(state.simTimeMs + steps * fixedStepMs);
          accumulatorMs -= steps * fixedStepMs;
        }
      }

      return drain();
    },
    stop() {
      accrueWallTime();
      status = "stopped";
    },
  };

  if (options.initialEvents !== undefined || startAtSimTimeMs > 0) {
    // Resume: events at or before the start time are applied during the catch-up, later ones stay scheduled.
    (options.initialEvents ?? []).forEach((event) => loop.queueEvent(event));
    advanceTo(startAtSimTimeMs);
    // The catch-up output is not streamed: the waveform is discarded and the stored events are not re-reported.
    getWaveformBuffer(state);
    applied = [];
    confirmed = [];
    metricsDue = true;
  }

  return loop;
}

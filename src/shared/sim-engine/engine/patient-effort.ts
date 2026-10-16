/*
* Funcionalidad: Esfuerzo del paciente del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/patient-effort.ts. Presión muscular inspiratoria Pmus(t) con amplitud, frecuencia propia y fracción inspiratoria parametrizables; ruido fisiológico leve por ciclo a partir del generador con semilla
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import { max, min, PI, sin } from "./engine-math";
import type { EffortState, PatientEffortProfile } from "./engine.types";
import { nextRandom, type PrngDraw } from "./prng";

const AMPLITUDE_NOISE_FRACTION: number = 0.1;
const PERIOD_NOISE_FRACTION: number = 0.05;

export function createEffortState(profile: PatientEffortProfile): EffortState {
  return {
    cycleIndex: -1,
    cycleStartMs: 0,
    periodMs: Number.POSITIVE_INFINITY,
    inspiratoryMs: 0,
    amplitudeCmH2O: 0,
    baseAmplitudeCmH2O: max(0, profile.amplitudeCmH2O),
    baseRateBpm: max(0, profile.rateBpm),
    inspiratoryFraction: min(0.9, max(0.05, profile.inspiratoryFraction)),
  };
}

export function isEffortActive(effort: EffortState): boolean {
  return effort.baseAmplitudeCmH2O > 0 && effort.baseRateBpm > 0;
}

export function advanceEffortCycle(effort: EffortState, nowMs: number, noise: boolean, prngState: number): number {
  let currentPrngState: number = prngState;

  if (effort.cycleIndex < 0 && isEffortActive(effort)) {
    currentPrngState = startEffortCycle(effort, nowMs, noise, currentPrngState);
  }

  while (nowMs >= effort.cycleStartMs + effort.periodMs) {
    currentPrngState = startEffortCycle(effort, effort.cycleStartMs + effort.periodMs, noise, currentPrngState);
  }

  return currentPrngState;
}

export function updateEffortProfile(
  effort: EffortState,
  amplitudeCmH2O: number | undefined,
  rateBpm: number | undefined,
  nowMs: number,
): void {
  const wasActive: boolean = isEffortActive(effort);

  if (amplitudeCmH2O !== undefined) {
    effort.baseAmplitudeCmH2O = max(0, amplitudeCmH2O);
  }

  if (rateBpm !== undefined) {
    effort.baseRateBpm = max(0, rateBpm);
  }

  if (!isEffortActive(effort)) {
    effort.periodMs = Number.POSITIVE_INFINITY;
    effort.amplitudeCmH2O = 0;

    return;
  }

  if (!wasActive) {
    effort.cycleStartMs = nowMs;
    effort.periodMs = 0;
  }
}

// Half-sine inspiratory muscle pressure Pmus(t) = A·sin(π·t/Ti_mus) during neural inspiration, zero during expiration (profile used by lung simulators such as the ASL 5000; Chatburn, Respir Care 2004)
export function muscularPressure(effort: EffortState, timeMs: number): number {
  if (effort.amplitudeCmH2O <= 0 || effort.cycleIndex < 0) {
    return 0;
  }

  const elapsedMs: number = timeMs - effort.cycleStartMs;

  if (elapsedMs < 0 || elapsedMs >= effort.inspiratoryMs) {
    return 0;
  }

  return effort.amplitudeCmH2O * sin((PI * elapsedMs) / effort.inspiratoryMs);
}

function startEffortCycle(effort: EffortState, startMs: number, noise: boolean, prngState: number): number {
  let currentPrngState: number = prngState;
  let amplitudeFactor: number = 1;
  let periodFactor: number = 1;

  if (noise) {
    const amplitudeDraw: PrngDraw = nextRandom(currentPrngState);
    const periodDraw: PrngDraw = nextRandom(amplitudeDraw.state);

    amplitudeFactor = 1 + AMPLITUDE_NOISE_FRACTION * (2 * amplitudeDraw.value - 1);
    periodFactor = 1 + PERIOD_NOISE_FRACTION * (2 * periodDraw.value - 1);
    currentPrngState = periodDraw.state;
  }

  effort.cycleIndex += 1;
  effort.cycleStartMs = startMs;

  if (!isEffortActive(effort)) {
    effort.periodMs = Number.POSITIVE_INFINITY;
    effort.amplitudeCmH2O = 0;

    return currentPrngState;
  }

  effort.periodMs = (60000 / effort.baseRateBpm) * periodFactor;
  effort.inspiratoryMs = effort.periodMs * effort.inspiratoryFraction;
  effort.amplitudeCmH2O = effort.baseAmplitudeCmH2O * amplitudeFactor;

  return currentPrngState;
}

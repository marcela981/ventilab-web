/*
* Funcionalidad: Generador pseudoaleatorio con semilla
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/prng.ts. Implementación mulberry32 sin estado global; el estado del generador viaja dentro del estado de la simulación para que la repetición sea exacta
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import { imul, trunc } from "./engine-math";

export interface PrngDraw {
  readonly value: number;
  readonly state: number;
}

const MULBERRY32_INCREMENT: number = 0x6d2b79f5;
const UINT32_RANGE: number = 4294967296;

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    return 0;
  }

  return trunc(seed) >>> 0;
}

export function nextRandom(state: number): PrngDraw {
  const nextState: number = (state + MULBERRY32_INCREMENT) >>> 0;
  let mixed: number = imul(nextState ^ (nextState >>> 15), nextState | 1);

  mixed ^= mixed + imul(mixed ^ (mixed >>> 7), mixed | 61);

  const value: number = ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;

  return { value, state: nextState };
}

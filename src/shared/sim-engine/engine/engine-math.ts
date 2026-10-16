/*
* Funcionalidad: Funciones matemáticas del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/engine-math.ts. Referencias locales a las funciones de Math usadas en el bucle de integración; leer el objeto global en cada paso es costoso en contextos aislados (vm de Jest, workers), por eso el motor las toma de este módulo
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
export const exp: (value: number) => number = Math.exp;
export const sin: (value: number) => number = Math.sin;
export const log10: (value: number) => number = Math.log10;
export const round: (value: number) => number = Math.round;
export const trunc: (value: number) => number = Math.trunc;
export const imul: (a: number, b: number) => number = Math.imul;
export const max: (...values: number[]) => number = Math.max;
export const min: (...values: number[]) => number = Math.min;
export const PI: number = Math.PI;

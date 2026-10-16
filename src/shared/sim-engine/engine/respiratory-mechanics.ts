/*
* Funcionalidad: Mecánica respiratoria del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/respiratory-mechanics.ts. Modelo unicompartimental: ecuación de movimiento, solución exacta bajo presión constante y patrones de flujo en ventilación por volumen
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import { exp, max } from "./engine-math";
import type { FlowPattern } from "./engine.types";

export function elasticPressure(volumeAboveFrcMl: number, complianceMlPerCmH2O: number): number {
  return volumeAboveFrcMl / complianceMlPerCmH2O;
}

// Equation of motion of the single-compartment respiratory system: Paw = V/C + R·Flow − Pmus (Bates, Lung Mechanics, 2009); V is measured above FRC, so PEEP_total = V_endExp/C
export function airwayPressureFromFlow(
  volumeAboveFrcMl: number,
  flowLps: number,
  muscularPressureCmH2O: number,
  resistanceCmH2OPerLps: number,
  complianceMlPerCmH2O: number,
): number {
  return volumeAboveFrcMl / complianceMlPerCmH2O + resistanceCmH2OPerLps * flowLps - muscularPressureCmH2O;
}

// Exact solution of the equation of motion at constant Paw and Pmus: V(t) = Veq + (V0 − Veq)·e^(−t/τ), Veq = C·(Paw + Pmus), τ = R·C (Bates, Lung Mechanics, 2009); R·C in cmH2O·s/L · mL/cmH2O yields ms
export function advanceVolumeUnderPressure(
  volumeAboveFrcMl: number,
  airwayPressureCmH2O: number,
  muscularPressureCmH2O: number,
  resistanceCmH2OPerLps: number,
  complianceMlPerCmH2O: number,
  dtMs: number,
): number {
  const timeConstantMs: number = resistanceCmH2OPerLps * complianceMlPerCmH2O;
  const equilibriumMl: number = complianceMlPerCmH2O * (airwayPressureCmH2O + muscularPressureCmH2O);

  return equilibriumMl + (volumeAboveFrcMl - equilibriumMl) * exp(-dtMs / timeConstantMs);
}

// Volume-controlled flow: square Flow = Vt/Ti; decelerating ramp Flow(t) = 2·Vt/Ti·(1 − t/Ti) (Chatburn, Fundamentals of Mechanical Ventilation, 2003); mL/ms equals L/s
export function volumeControlFlowLps(
  pattern: FlowPattern,
  tidalVolumeMl: number,
  inspiratoryTimeMs: number,
  elapsedMs: number,
): number {
  const meanFlowLps: number = tidalVolumeMl / inspiratoryTimeMs;

  if (pattern === "SQUARE") {
    return meanFlowLps;
  }

  return max(0, 2 * meanFlowLps * (1 - elapsedMs / inspiratoryTimeMs));
}

/*
* Funcionalidad: Hemodinámica del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/hemodynamics.ts. Presión arterial media reducida cuando la presión media de la vía aérea supera el umbral del caso (efecto de la presión intratorácica sobre el retorno venoso)
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import { max } from "./engine-math";
import type { HemodynamicProfile } from "./engine.types";

const MIN_MEAN_ARTERIAL_PRESSURE_MMHG: number = 40;

// Linear simplification of the fall in venous return with intrathoracic pressure: MAP = MAP0 − k·max(0, mPaw − threshold) (Pinsky, Intensive Care Med 1997)
export function meanArterialPressure(profile: HemodynamicProfile, meanAirwayPressureCmH2O: number): number {
  const excessCmH2O: number = max(0, meanAirwayPressureCmH2O - profile.meanAirwayPressureThresholdCmH2O);

  return max(MIN_MEAN_ARTERIAL_PRESSURE_MMHG, profile.baselineMapMmHg - profile.mapDropPerCmH2O * excessCmH2O);
}

/*
* Funcionalidad: Límites de los parámetros del ventilador
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/common/domain/ventilator/ventilator-limits.ts. Fuente única de los rangos permitidos de cada parámetro del ventilador (motor fisiológico, comando físico y futuras features del ventilador real) y de las reglas cruzadas de presión, flujo y tiempo espiratorio
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
export interface VentilatorParameterLimit {
  readonly min: number;
  readonly max: number;
  readonly unit: string;
}

export type VentilatorParameterKey =
  | "tidalVolumeMl"
  | "respiratoryRateBpm"
  | "peepCmH2O"
  | "fio2"
  | "inspiratoryTimeS"
  | "inspiratoryPauseS"
  | "inspiratoryPressureCmH2O"
  | "pressureSupportCmH2O"
  | "flowTriggerLpm"
  | "pressureTriggerCmH2O"
  | "cycleOffPercent"
  | "apneaTimeS"
  | "pressureLimitCmH2O"
  | "flowRateLpm";

export const VENTILATOR_PARAMETER_LIMITS: Readonly<Record<VentilatorParameterKey, VentilatorParameterLimit>> = {
  tidalVolumeMl: { min: 200, max: 800, unit: "mL" },
  respiratoryRateBpm: { min: 5, max: 40, unit: "breaths/min" },
  peepCmH2O: { min: 0, max: 20, unit: "cmH2O" },
  fio2: { min: 0.21, max: 1.0, unit: "fraction" },
  inspiratoryTimeS: { min: 0.5, max: 3.0, unit: "s" },
  inspiratoryPauseS: { min: 0, max: 2.0, unit: "s" },
  inspiratoryPressureCmH2O: { min: 5, max: 40, unit: "cmH2O above PEEP" },
  pressureSupportCmH2O: { min: 0, max: 30, unit: "cmH2O above PEEP" },
  flowTriggerLpm: { min: 0.5, max: 10, unit: "L/min" },
  pressureTriggerCmH2O: { min: 0.5, max: 10, unit: "cmH2O" },
  cycleOffPercent: { min: 5, max: 80, unit: "% of peak inspiratory flow" },
  apneaTimeS: { min: 10, max: 60, unit: "s" },
  pressureLimitCmH2O: { min: 10, max: 50, unit: "cmH2O" },
  flowRateLpm: { min: 20, max: 100, unit: "L/min" },
};

export const MAX_AIRWAY_PRESSURE_SETTING_CMH2O: number = 50;
export const MAX_PEAK_INSPIRATORY_FLOW_LPM: number = 100;
export const MIN_EXPIRATORY_TIME_S: number = 0.3;

export function isWithinVentilatorLimit(key: VentilatorParameterKey, value: number): boolean {
  const limit: VentilatorParameterLimit = VENTILATOR_PARAMETER_LIMITS[key];

  return Number.isFinite(value) && value >= limit.min && value <= limit.max;
}

/*
* Funcionalidad: Límites del ventilador del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/ventilator-limits.ts. Rangos permitidos de cada ajuste del ventilador derivados de la fuente única común (src/common/domain/ventilator), ajustes por defecto y validación de un conjunto completo de ajustes, incluidas las reglas cruzadas de presión, flujo y tiempo espiratorio
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import { MAX_AIRWAY_PRESSURE_SETTING_CMH2O, MAX_PEAK_INSPIRATORY_FLOW_LPM, MIN_EXPIRATORY_TIME_S, VENTILATOR_PARAMETER_LIMITS, type VentilatorParameterLimit } from "./common/ventilator-limits";

import { EngineValidationError } from "./engine.errors";
import type { EngineVentilationMode, FlowPattern, MandatoryBreathType, TriggerType, VentilatorSettings } from "./engine.types";

export { MAX_AIRWAY_PRESSURE_SETTING_CMH2O, MAX_PEAK_INSPIRATORY_FLOW_LPM, MIN_EXPIRATORY_TIME_S };

export type VentilatorLimit = VentilatorParameterLimit;

export type NumericSettingKey =
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
  | "apneaTimeS";

export const VENTILATOR_LIMITS: Readonly<Record<NumericSettingKey, VentilatorLimit>> = {
  tidalVolumeMl: VENTILATOR_PARAMETER_LIMITS.tidalVolumeMl,
  respiratoryRateBpm: VENTILATOR_PARAMETER_LIMITS.respiratoryRateBpm,
  peepCmH2O: VENTILATOR_PARAMETER_LIMITS.peepCmH2O,
  fio2: VENTILATOR_PARAMETER_LIMITS.fio2,
  inspiratoryTimeS: VENTILATOR_PARAMETER_LIMITS.inspiratoryTimeS,
  inspiratoryPauseS: VENTILATOR_PARAMETER_LIMITS.inspiratoryPauseS,
  inspiratoryPressureCmH2O: VENTILATOR_PARAMETER_LIMITS.inspiratoryPressureCmH2O,
  pressureSupportCmH2O: VENTILATOR_PARAMETER_LIMITS.pressureSupportCmH2O,
  flowTriggerLpm: VENTILATOR_PARAMETER_LIMITS.flowTriggerLpm,
  pressureTriggerCmH2O: VENTILATOR_PARAMETER_LIMITS.pressureTriggerCmH2O,
  cycleOffPercent: VENTILATOR_PARAMETER_LIMITS.cycleOffPercent,
  apneaTimeS: VENTILATOR_PARAMETER_LIMITS.apneaTimeS,
};

export const VENTILATION_MODES: readonly EngineVentilationMode[] = ["VCV", "PCV", "PSV", "CPAP", "SIMV"];
export const FLOW_PATTERNS: readonly FlowPattern[] = ["SQUARE", "DECELERATING"];
export const TRIGGER_TYPES: readonly TriggerType[] = ["FLOW", "PRESSURE"];
export const MANDATORY_BREATH_TYPES: readonly MandatoryBreathType[] = ["VCV", "PCV"];

export const DEFAULT_VENTILATOR_SETTINGS: Readonly<VentilatorSettings> = {
  mode: "VCV",
  tidalVolumeMl: 450,
  respiratoryRateBpm: 14,
  peepCmH2O: 5,
  fio2: 0.4,
  inspiratoryTimeS: 1.0,
  flowPattern: "SQUARE",
  inspiratoryPauseS: 0,
  inspiratoryPressureCmH2O: 15,
  pressureSupportCmH2O: 10,
  triggerType: "FLOW",
  flowTriggerLpm: 2,
  pressureTriggerCmH2O: 2,
  cycleOffPercent: 25,
  apneaTimeS: 20,
  simvMandatoryType: "VCV",
};

const NUMERIC_SETTING_KEYS: readonly NumericSettingKey[] = Object.keys(VENTILATOR_LIMITS) as NumericSettingKey[];

export function resolveVentilatorSettings(partial: Partial<VentilatorSettings>): VentilatorSettings {
  return { ...DEFAULT_VENTILATOR_SETTINGS, ...partial };
}

export function validateVentilatorSettings(settings: VentilatorSettings): void {
  assertMember<EngineVentilationMode>("mode", settings.mode, VENTILATION_MODES);
  assertMember<FlowPattern>("flowPattern", settings.flowPattern, FLOW_PATTERNS);
  assertMember<TriggerType>("triggerType", settings.triggerType, TRIGGER_TYPES);
  assertMember<MandatoryBreathType>("simvMandatoryType", settings.simvMandatoryType, MANDATORY_BREATH_TYPES);

  for (const key of NUMERIC_SETTING_KEYS) {
    assertWithinLimit(key, settings[key]);
  }

  const inspiratoryPeakPressure: number = settings.peepCmH2O + settings.inspiratoryPressureCmH2O;

  if (inspiratoryPeakPressure > MAX_AIRWAY_PRESSURE_SETTING_CMH2O) {
    throw new EngineValidationError(
      "OUT_OF_RANGE",
      "inspiratoryPressureCmH2O",
      `PEEP plus inspiratory pressure must not exceed ${MAX_AIRWAY_PRESSURE_SETTING_CMH2O} cmH2O`,
    );
  }

  const supportPeakPressure: number = settings.peepCmH2O + settings.pressureSupportCmH2O;

  if (supportPeakPressure > MAX_AIRWAY_PRESSURE_SETTING_CMH2O) {
    throw new EngineValidationError(
      "OUT_OF_RANGE",
      "pressureSupportCmH2O",
      `PEEP plus pressure support must not exceed ${MAX_AIRWAY_PRESSURE_SETTING_CMH2O} cmH2O`,
    );
  }

  const patternFactor: number = settings.flowPattern === "DECELERATING" ? 2 : 1;
  const peakFlowLpm: number = ((patternFactor * settings.tidalVolumeMl) / (settings.inspiratoryTimeS * 1000)) * 60;

  if (peakFlowLpm > MAX_PEAK_INSPIRATORY_FLOW_LPM) {
    throw new EngineValidationError(
      "OUT_OF_RANGE",
      "inspiratoryTimeS",
      `Peak inspiratory flow ${peakFlowLpm.toFixed(1)} L/min exceeds ${MAX_PEAK_INSPIRATORY_FLOW_LPM} L/min`,
    );
  }

  const periodS: number = 60 / settings.respiratoryRateBpm;
  const expiratoryTimeS: number = periodS - settings.inspiratoryTimeS - settings.inspiratoryPauseS;

  if (expiratoryTimeS < MIN_EXPIRATORY_TIME_S) {
    throw new EngineValidationError(
      "INVALID_TIMING",
      "inspiratoryTimeS",
      `Expiratory time ${expiratoryTimeS.toFixed(2)} s is below ${MIN_EXPIRATORY_TIME_S} s`,
    );
  }
}

function assertWithinLimit(key: NumericSettingKey, value: number): void {
  const limit: VentilatorLimit = VENTILATOR_LIMITS[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new EngineValidationError("INVALID_VALUE", key, `${key} must be a finite number`);
  }

  if (value < limit.min || value > limit.max) {
    throw new EngineValidationError(
      "OUT_OF_RANGE",
      key,
      `${key} must be between ${limit.min} and ${limit.max} ${limit.unit}`,
    );
  }
}

function assertMember<T extends string>(field: string, value: T, allowed: readonly T[]): void {
  if (!allowed.includes(value)) {
    throw new EngineValidationError("INVALID_VALUE", field, `${field} must be one of ${allowed.join(", ")}`);
  }
}

/*
* Funcionalidad: Alarmas del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/alarms.ts. Umbrales por defecto y derivación de alarmas (presión alta, volumen corriente bajo o alto, apnea, frecuencia alta, auto-PEEP significativa, desconexión) a partir de las métricas del último ciclo
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import type { Alarm, AlarmThresholds, CycleMetrics } from "./engine.types";

export const DEFAULT_ALARM_THRESHOLDS: AlarmThresholds = {
  highPressureCmH2O: 40,
  lowTidalVolumeMlPerKgPbw: 4,
  highTidalVolumeMlPerKgPbw: 10,
  highRespiratoryRateBpm: 35,
  autoPeepCmH2O: 5,
};

export interface AlarmInput {
  readonly lastCycle: CycleMetrics | null;
  readonly thresholds: AlarmThresholds;
  readonly predictedBodyWeightKg: number;
  readonly msSinceLastBreath: number;
  readonly apneaTimeMs: number;
  readonly disconnected: boolean;
}

export function resolveAlarmThresholds(overrides: Partial<AlarmThresholds> | undefined): AlarmThresholds {
  return { ...DEFAULT_ALARM_THRESHOLDS, ...(overrides ?? {}) };
}

export function evaluateAlarms(input: AlarmInput): Alarm[] {
  const alarms: Alarm[] = [];
  const { lastCycle, thresholds } = input;

  if (input.disconnected) {
    alarms.push({ code: "DISCONNECTION", severity: "HIGH", value: 1, threshold: 1 });
  }

  if (input.msSinceLastBreath >= input.apneaTimeMs) {
    alarms.push({ code: "APNEA", severity: "HIGH", value: input.msSinceLastBreath / 1000, threshold: input.apneaTimeMs / 1000 });
  }

  if (lastCycle === null) {
    return alarms;
  }

  if (lastCycle.peakPressureCmH2O >= thresholds.highPressureCmH2O) {
    alarms.push({
      code: "HIGH_PRESSURE",
      severity: "HIGH",
      value: lastCycle.peakPressureCmH2O,
      threshold: thresholds.highPressureCmH2O,
    });
  }

  const lowTidalVolumeMl: number = thresholds.lowTidalVolumeMlPerKgPbw * input.predictedBodyWeightKg;
  const highTidalVolumeMl: number = thresholds.highTidalVolumeMlPerKgPbw * input.predictedBodyWeightKg;

  if (lastCycle.exhaledTidalVolumeMl < lowTidalVolumeMl) {
    alarms.push({
      code: "LOW_TIDAL_VOLUME",
      severity: "HIGH",
      value: lastCycle.exhaledTidalVolumeMl,
      threshold: lowTidalVolumeMl,
    });
  }

  if (lastCycle.exhaledTidalVolumeMl > highTidalVolumeMl) {
    alarms.push({
      code: "HIGH_TIDAL_VOLUME",
      severity: "MEDIUM",
      value: lastCycle.exhaledTidalVolumeMl,
      threshold: highTidalVolumeMl,
    });
  }

  if (lastCycle.totalRespiratoryRateBpm > thresholds.highRespiratoryRateBpm) {
    alarms.push({
      code: "HIGH_RESPIRATORY_RATE",
      severity: "MEDIUM",
      value: lastCycle.totalRespiratoryRateBpm,
      threshold: thresholds.highRespiratoryRateBpm,
    });
  }

  if (lastCycle.autoPeepCmH2O >= thresholds.autoPeepCmH2O) {
    alarms.push({
      code: "AUTO_PEEP",
      severity: "MEDIUM",
      value: lastCycle.autoPeepCmH2O,
      threshold: thresholds.autoPeepCmH2O,
    });
  }

  return alarms;
}

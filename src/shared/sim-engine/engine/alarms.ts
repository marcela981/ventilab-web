/*
* Funcionalidad: Alarmas del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/alarms.ts. Umbrales por defecto y derivación de alarmas (presión alta, volumen corriente bajo o alto, apnea, frecuencia alta, auto-PEEP significativa, desconexión) a partir de las métricas del último ciclo y, con evolución del paciente (motor 2.0.0), alarmas del paciente (SpO2 baja, PAM baja, taquicardia, bradicardia, paro cardíaco)
* Versión: 2.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import type { Alarm, AlarmThresholds, CycleMetrics, PatientStatus } from "./engine.types";

export const DEFAULT_ALARM_THRESHOLDS: AlarmThresholds = {
  highPressureCmH2O: 40,
  lowTidalVolumeMlPerKgPbw: 4,
  highTidalVolumeMlPerKgPbw: 10,
  highRespiratoryRateBpm: 35,
  autoPeepCmH2O: 5,
  // Patient alarms (only with an evolution block). SpO2 90 % and MAP 65 mmHg follow ARDS Network (2000) and Evans et al.
  // (2021); heart-rate limits 120 / 50 bpm are conventional monitor defaults (educational choice, pending expert review).
  lowSpo2Percent: 90,
  lowMapMmHg: 65,
  tachycardiaBpm: 120,
  bradycardiaBpm: 50,
};

export interface PatientAlarmInput {
  readonly status: PatientStatus;
  readonly spo2Percent: number;
  readonly meanArterialPressureMmHg: number;
  readonly heartRateBpm: number;
}

export interface AlarmInput {
  readonly lastCycle: CycleMetrics | null;
  readonly thresholds: AlarmThresholds;
  readonly predictedBodyWeightKg: number;
  readonly msSinceLastBreath: number;
  readonly apneaTimeMs: number;
  readonly disconnected: boolean;
  readonly patient?: PatientAlarmInput | null;
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

  if (input.patient !== undefined && input.patient !== null) {
    alarms.push(...evaluatePatientAlarms(input.patient, thresholds));
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

function evaluatePatientAlarms(patient: PatientAlarmInput, thresholds: AlarmThresholds): Alarm[] {
  if (patient.status === "ARREST" || patient.status === "DECEASED") {
    return [{ code: "CARDIAC_ARREST", severity: "HIGH", value: 0, threshold: 0 }];
  }

  const alarms: Alarm[] = [];

  if (patient.spo2Percent < thresholds.lowSpo2Percent) {
    alarms.push({ code: "LOW_SPO2", severity: "HIGH", value: patient.spo2Percent, threshold: thresholds.lowSpo2Percent });
  }

  if (patient.meanArterialPressureMmHg < thresholds.lowMapMmHg) {
    alarms.push({
      code: "LOW_MAP",
      severity: "HIGH",
      value: patient.meanArterialPressureMmHg,
      threshold: thresholds.lowMapMmHg,
    });
  }

  if (patient.heartRateBpm > thresholds.tachycardiaBpm) {
    alarms.push({ code: "TACHYCARDIA", severity: "MEDIUM", value: patient.heartRateBpm, threshold: thresholds.tachycardiaBpm });
  }

  if (patient.heartRateBpm < thresholds.bradycardiaBpm) {
    alarms.push({ code: "BRADYCARDIA", severity: "HIGH", value: patient.heartRateBpm, threshold: thresholds.bradycardiaBpm });
  }

  return alarms;
}

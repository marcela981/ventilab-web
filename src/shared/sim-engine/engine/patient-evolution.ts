/*
* Funcionalidad: Evolución del paciente en el motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/patient-evolution.ts. Modelo determinista de evolución en el tiempo del paciente (motor 2.0.0): detecta agresiones fisiológicas (hipoxemia, acidosis, riesgo de lesión por el ventilador, atrapamiento, hipotensión), hace evolucionar la gravedad en ambos sentidos, calcula la frecuencia cardíaca, el efecto de la gravedad, la acidosis y la hipoxemia sobre la presión arterial media y el estado del paciente (estable, inestable, crítico, paro, fallecido). Las tasas, ganancias y tiempos son convenciones de simulación educativa pendientes de validación experta
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import { exp, max, min } from "./engine-math";
import type { CycleMetrics, EngineTargets, EvolutionProfile, EvolutionThresholds, PatientInsult, PatientSnapshot, PatientState, PatientStatus } from "./engine.types";

// Insult thresholds. Sources: SpO2 88 % and Pplat 30 cmH2O (ARDS Network, NEJM 2000); driving pressure 15 cmH2O
// (Amato et al., NEJM 2015); permissive hypercapnia down to pH 7.20 (Hickling et al., Intensive Care Med 1990);
// MAP 65 mmHg (Evans et al., Surviving Sepsis Campaign 2021); auto-PEEP 5 cmH2O (same default as the alarm).
// Critical thresholds (SpO2 75 %, pH 7.00, MAP 50 mmHg) have no validated cut-off for arrest (Mort, J Clin Anesth 2004):
// they are an educational simulation convention.
export const DEFAULT_EVOLUTION_THRESHOLDS: EvolutionThresholds = {
  hypoxemiaSpo2Percent: 88,
  acidosisPh: 7.2,
  plateauMaxCmH2O: 30,
  drivingPressureMaxCmH2O: 15,
  autoPeepMaxCmH2O: 5,
  hypotensionMapMmHg: 65,
  criticalSpo2Percent: 75,
  criticalPh: 7.0,
  criticalMapMmHg: 50,
};

// Modelling assumptions (no single published value): overdistension above the plateau limit raises shunt and dead
// space proportionally (qualitative effect: Gattinoni et al., NEJM 2006; Luecke & Pelosi, Crit Care 2005).
export const OVERDISTENSION_SHUNT_PER_CMH2O: number = 0.015;
export const OVERDISTENSION_DEAD_SPACE_ML_PER_CMH2O: number = 12;

// Modelling assumptions for the haemodynamic response (direction sourced: Pinsky, Ann Am Thorac Soc 2018;
// Kraut & Madias, Nat Rev Nephrol 2010; Curley et al., Crit Care 2010).
const SEVERITY_MAP_DROP_MMHG: number = 15;
const ACIDOSIS_MAP_DROP_PER_PH: number = 60;
const ACIDOSIS_MAP_DROP_BELOW_PH: number = 7.2;
const HYPOXEMIA_MAP_DROP_PER_PERCENT: number = 0.5;
const HYPOXEMIA_MAP_DROP_BELOW_SPO2: number = 80;
const MIN_MAP_ALIVE_MMHG: number = 30;
const ARREST_MAP_MMHG: number = 10;
const ARREST_MAP_TIME_CONSTANT_MIN: number = 0.2;

const HR_HYPOXEMIA_GAIN_PER_PERCENT: number = 0.8;
const HR_HYPOXEMIA_BELOW_SPO2: number = 92;
const HR_HYPERCAPNIA_GAIN_PER_MMHG: number = 0.3;
const HR_HYPERCAPNIA_ABOVE_PACO2: number = 45;
const HR_BAROREFLEX_GAIN_PER_MMHG: number = 0.8;
const HR_BAROREFLEX_BELOW_MAP: number = 70;
const HR_MAX_BPM: number = 160;
const HR_CRITICAL_FLOOR_BPM: number = 35;
const HR_TIME_CONSTANT_MIN: number = 0.3;

export interface PatientEvolutionInput {
  readonly spo2Percent: number;
  readonly ph: number;
  readonly paco2MmHg: number;
  readonly lastCycle: CycleMetrics | null;
}

export function resolveEvolutionThresholds(profile: EvolutionProfile, targets: EngineTargets): EvolutionThresholds {
  return {
    ...DEFAULT_EVOLUTION_THRESHOLDS,
    autoPeepMaxCmH2O: targets.autoPeepMaxCmH2O ?? DEFAULT_EVOLUTION_THRESHOLDS.autoPeepMaxCmH2O,
    ...(profile.thresholds ?? {}),
  };
}

export function createPatientState(profile: EvolutionProfile): PatientState {
  return {
    status: "STABLE",
    severity: clampSeverity(profile.initialSeverity, profile.minSeverity),
    heartRateBpm: profile.baselineHeartRateBpm,
    insults: [],
    criticalExposureMin: 0,
    arrestElapsedMin: 0,
    firstCriticalAtMs: null,
    arrestAtMs: null,
    deceasedAtMs: null,
  };
}

export function isDeceased(patient: PatientState | null): boolean {
  return patient !== null && patient.status === "DECEASED";
}

export function isInArrest(patient: PatientState | null): boolean {
  return patient !== null && (patient.status === "ARREST" || patient.status === "DECEASED");
}

// Extra shunt fraction and dead space caused by overdistension (plateau above the protective limit).
export function overdistensionShunt(lastCycle: CycleMetrics | null, thresholds: EvolutionThresholds): number {
  return OVERDISTENSION_SHUNT_PER_CMH2O * plateauExcess(lastCycle, thresholds);
}

export function overdistensionDeadSpaceMl(lastCycle: CycleMetrics | null, thresholds: EvolutionThresholds): number {
  return OVERDISTENSION_DEAD_SPACE_ML_PER_CMH2O * plateauExcess(lastCycle, thresholds);
}

export function detectInsults(
  input: PatientEvolutionInput,
  meanArterialPressureMmHg: number,
  thresholds: EvolutionThresholds,
): PatientInsult[] {
  const insults: PatientInsult[] = [];
  const cycle: CycleMetrics | null = input.lastCycle;

  if (input.spo2Percent < thresholds.hypoxemiaSpo2Percent) {
    insults.push("HYPOXEMIA");
  }

  if (input.ph < thresholds.acidosisPh) {
    insults.push("ACIDOSIS");
  }

  if (
    cycle !== null &&
    (cycle.plateauPressureCmH2O > thresholds.plateauMaxCmH2O ||
      cycle.drivingPressureCmH2O > thresholds.drivingPressureMaxCmH2O)
  ) {
    insults.push("LUNG_INJURY_RISK");
  }

  if (cycle !== null && cycle.autoPeepCmH2O > thresholds.autoPeepMaxCmH2O) {
    insults.push("AIR_TRAPPING");
  }

  if (meanArterialPressureMmHg < thresholds.hypotensionMapMmHg) {
    insults.push("HYPOTENSION");
  }

  return insults;
}

// MAP after the ventilatory (mPaw) effect: lowered by severity, severe acidosis and severe hypoxemia; decays to the
// arrest value during cardiac arrest.
export function adjustMeanArterialPressure(
  patient: PatientState,
  ventilatoryMapMmHg: number,
  previousMapMmHg: number,
  input: PatientEvolutionInput,
  patientElapsedMin: number,
): number {
  if (isInArrest(patient)) {
    return firstOrder(previousMapMmHg, ARREST_MAP_MMHG, patientElapsedMin, ARREST_MAP_TIME_CONSTANT_MIN);
  }

  const acidosisDrop: number = ACIDOSIS_MAP_DROP_PER_PH * max(0, ACIDOSIS_MAP_DROP_BELOW_PH - input.ph);
  const hypoxemiaDrop: number = HYPOXEMIA_MAP_DROP_PER_PERCENT * max(0, HYPOXEMIA_MAP_DROP_BELOW_SPO2 - input.spo2Percent);
  const value: number = ventilatoryMapMmHg - SEVERITY_MAP_DROP_MMHG * patient.severity - acidosisDrop - hypoxemiaDrop;

  return max(MIN_MAP_ALIVE_MMHG, value);
}

// Advances severity, heart rate and status by `patientElapsedMin` (sim time × multiplier, like the deterioration).
export function advancePatient(
  patient: PatientState,
  profile: EvolutionProfile,
  thresholds: EvolutionThresholds,
  input: PatientEvolutionInput,
  meanArterialPressureMmHg: number,
  patientElapsedMin: number,
  nowMs: number,
): void {
  if (patient.status === "DECEASED") {
    return;
  }

  if (patient.status === "ARREST") {
    patient.heartRateBpm = 0;
    patient.arrestElapsedMin += patientElapsedMin;

    if (patient.arrestElapsedMin >= profile.deathAfterArrestMin) {
      patient.status = "DECEASED";
      patient.deceasedAtMs = nowMs;
    }

    return;
  }

  const insults: PatientInsult[] = detectInsults(input, meanArterialPressureMmHg, thresholds);
  const severityRatePerMin: number =
    insults.length > 0
      ? profile.progressionRatePerMin + (insults.includes("LUNG_INJURY_RISK") ? profile.viliRatePerMin : 0)
      : -profile.recoveryRatePerMin;

  patient.insults = insults;
  patient.severity = clampSeverity(patient.severity + severityRatePerMin * patientElapsedMin, profile.minSeverity);

  const critical: boolean =
    input.spo2Percent < thresholds.criticalSpo2Percent ||
    input.ph < thresholds.criticalPh ||
    meanArterialPressureMmHg < thresholds.criticalMapMmHg;

  patient.criticalExposureMin = critical
    ? patient.criticalExposureMin + patientElapsedMin
    : max(0, patient.criticalExposureMin - patientElapsedMin);

  if (critical && patient.firstCriticalAtMs === null) {
    patient.firstCriticalAtMs = nowMs;
  }

  if (patient.criticalExposureMin >= profile.arrestAfterCriticalMin) {
    patient.status = "ARREST";
    patient.arrestAtMs = nowMs;
    patient.heartRateBpm = 0;

    return;
  }

  patient.status = statusFor(critical, insults);
  patient.heartRateBpm = firstOrder(
    patient.heartRateBpm,
    targetHeartRate(patient, profile, input, meanArterialPressureMmHg),
    patientElapsedMin,
    HR_TIME_CONSTANT_MIN,
  );
}

export function patientSnapshot(patient: PatientState): PatientSnapshot {
  return {
    status: patient.status,
    severity: patient.severity,
    heartRateBpm: patient.heartRateBpm,
    insults: [...patient.insults],
    criticalExposureMin: patient.criticalExposureMin,
    firstCriticalAtMs: patient.firstCriticalAtMs,
    arrestAtMs: patient.arrestAtMs,
    deceasedAtMs: patient.deceasedAtMs,
  };
}

function targetHeartRate(
  patient: PatientState,
  profile: EvolutionProfile,
  input: PatientEvolutionInput,
  meanArterialPressureMmHg: number,
): number {
  const tachycardic: number = min(
    HR_MAX_BPM,
    profile.baselineHeartRateBpm +
      HR_HYPOXEMIA_GAIN_PER_PERCENT * max(0, HR_HYPOXEMIA_BELOW_SPO2 - input.spo2Percent) +
      HR_HYPERCAPNIA_GAIN_PER_MMHG * max(0, input.paco2MmHg - HR_HYPERCAPNIA_ABOVE_PACO2) +
      HR_BAROREFLEX_GAIN_PER_MMHG * max(0, HR_BAROREFLEX_BELOW_MAP - meanArterialPressureMmHg),
  );

  if (patient.status !== "CRITICAL") {
    return tachycardic;
  }

  // Pre-arrest bradycardia: falls from the tachycardic value toward the floor as the critical exposure approaches arrest.
  const progress: number = min(1, patient.criticalExposureMin / profile.arrestAfterCriticalMin);

  return tachycardic - (tachycardic - HR_CRITICAL_FLOOR_BPM) * progress;
}

function statusFor(critical: boolean, insults: readonly PatientInsult[]): PatientStatus {
  if (critical) {
    return "CRITICAL";
  }

  return insults.length > 0 ? "UNSTABLE" : "STABLE";
}

function plateauExcess(lastCycle: CycleMetrics | null, thresholds: EvolutionThresholds): number {
  return lastCycle === null ? 0 : max(0, lastCycle.plateauPressureCmH2O - thresholds.plateauMaxCmH2O);
}

function clampSeverity(value: number, minSeverity: number): number {
  return min(1, max(minSeverity, value));
}

function firstOrder(current: number, target: number, elapsedMin: number, timeConstantMin: number): number {
  if (elapsedMin <= 0) {
    return current;
  }

  return target + (current - target) * exp(-elapsedMin / timeConstantMin);
}

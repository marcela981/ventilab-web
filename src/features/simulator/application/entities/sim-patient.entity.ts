/*
* Funcionalidad: Own simulated patient entity
* Descripción: The own patient of a FREE session (Bloque 1, DISENO_BLOQUE1 §2.1 option c): the form the student sent
*   (name, age, sex, weight, height, condition, difficulty, diagnosis, allergies, history and initial vitals), as the
*   session state, replay and history return it (`patient`, null without one) and as the start request carried it. The
*   server keeps the resolved engine overrides; the client only shows this profile. `parseSessionPatient` checks an
*   untrusted value (sessionStorage record); the Spanish labels follow the July form (FLUJOS_JULIO a.3). No
*   dependencies besides the simulator config.
*   v0.2 (W8, Bloque 1): the patient preset of a published clinical case (`CasePatientPreset`, "Cargar caso" of the
*   Simular Paciente form): what the case detail says about its patient, every unknown value null.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { DIFFICULTY_LABELS } from "../config/simulator.config";
import type { CaseDifficulty } from "../config/simulator.config";

export const PATIENT_CONDITION_LABELS = {
  HEALTHY: "Sano / Control",
  ARDS_MILD: "SDRA Leve (PaO₂/FiO₂ 200–300)",
  ARDS_MODERATE: "SDRA Moderado (PaO₂/FiO₂ 100–200)",
  ARDS_SEVERE: "SDRA Severo (PaO₂/FiO₂ < 100)",
  COPD_MILD: "EPOC Leve",
  COPD_MODERATE: "EPOC Moderado",
  COPD_SEVERE: "EPOC Severo",
  ASTHMA_MILD: "Asma Leve",
  ASTHMA_MODERATE: "Asma Moderada",
  ASTHMA_SEVERE: "Asma Severa",
  PNEUMONIA: "Neumonía",
  PULMONARY_EDEMA: "Edema Pulmonar Agudo",
  PNEUMOTHORAX: "Neumotórax",
  OBESITY_HYPOVENTILATION: "Síndrome de Hipoventilación",
  NEUROMUSCULAR: "Enfermedad Neuromuscular",
  POST_SURGICAL: "Postquirúrgico",
} as const;

export type PatientCondition = keyof typeof PATIENT_CONDITION_LABELS;

export const PATIENT_SEX_LABELS = { MALE: "Masculino", FEMALE: "Femenino" } as const;

export type PatientSex = keyof typeof PATIENT_SEX_LABELS;

export const BREATHING_PATTERN_LABELS = {
  normal: "Normal",
  tachypneic: "Taquipneico",
  bradypneic: "Bradipneico",
  irregular: "Irregular",
  paradoxical: "Paradójico",
} as const;

export type BreathingPattern = keyof typeof BREATHING_PATTERN_LABELS;

export type SessionPatientVitals = {
  respiratoryRateBpm: number
  spo2Percent: number
  heartRateBpm: number | null
  temperatureC: number | null
  systolicMmHg: number | null
  diastolicMmHg: number | null
  glasgow: number | null
  breathingPattern: BreathingPattern | null
};

export type SessionPatient = {
  displayName: string | null
  ageYears: number
  sex: PatientSex
  weightKg: number
  heightCm: number
  condition: PatientCondition
  difficulty: CaseDifficulty
  diagnosis: string | null
  allergies: readonly string[]
  history: readonly string[]
  vitals: SessionPatientVitals
};

/** Bedside vitals of a clinical case; a case may lack any of them. */
export type CasePresetVitals = { [K in keyof SessionPatientVitals]: SessionPatientVitals[K] | null };

/** The patient of a published clinical case, as its detail returns it (GET /api/clinical-cases/{id}). */
export type CasePatientPreset = {
  caseId: string
  title: string
  /** Case pathology (catalog value, e.g. NEUMONIA). */
  pathology: string
  difficulty: CaseDifficulty | null
  ageYears: number
  sex: PatientSex | null
  weightKg: number
  heightCm: number | null
  diagnosis: string | null
  allergies: readonly string[]
  history: readonly string[]
  vitals: CasePresetVitals
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function numberOrNull(value: unknown): number | null {
  return isNumber(value) ? value : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function texts(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function hasKey<T extends object>(table: T, value: unknown): value is keyof T {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(table, value);
}

/** The own patient of an untrusted value (a DTO or a stored record); null when it is missing or malformed. */
export function parseSessionPatient(value: unknown): SessionPatient | null {
  if (!isRecord(value) || !isRecord(value.vitals)) {
    return null;
  }

  const { vitals } = value;

  if (
    !isNumber(value.ageYears) ||
    !hasKey(PATIENT_SEX_LABELS, value.sex) ||
    !isNumber(value.weightKg) ||
    !isNumber(value.heightCm) ||
    !hasKey(PATIENT_CONDITION_LABELS, value.condition) ||
    !hasKey(DIFFICULTY_LABELS, value.difficulty) ||
    !isNumber(vitals.respiratoryRateBpm) ||
    !isNumber(vitals.spo2Percent)
  ) {
    return null;
  }

  return {
    displayName: textOrNull(value.displayName),
    ageYears: value.ageYears,
    sex: value.sex,
    weightKg: value.weightKg,
    heightCm: value.heightCm,
    condition: value.condition,
    difficulty: value.difficulty,
    diagnosis: textOrNull(value.diagnosis),
    allergies: texts(value.allergies),
    history: texts(value.history),
    vitals: {
      respiratoryRateBpm: vitals.respiratoryRateBpm,
      spo2Percent: vitals.spo2Percent,
      heartRateBpm: numberOrNull(vitals.heartRateBpm),
      temperatureC: numberOrNull(vitals.temperatureC),
      systolicMmHg: numberOrNull(vitals.systolicMmHg),
      diastolicMmHg: numberOrNull(vitals.diastolicMmHg),
      glasgow: numberOrNull(vitals.glasgow),
      breathingPattern: hasKey(BREATHING_PATTERN_LABELS, vitals.breathingPattern) ? vitals.breathingPattern : null,
    },
  };
}

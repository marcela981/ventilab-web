/*
* Funcionalidad: Random patient
* Descripción: "Aleatorio" of the Simular Paciente form (W8, Bloque 1; FLUJOS_JULIO a.4): fills the whole form with a
*   plausible adult patient and the July notice "Datos simulados aleatorios cargados.". July returned one fixed sample
*   patient (getSimulatedPatientData); here every value is drawn inside the form ranges (sex, age 18–85, height by
*   sex, weight from a BMI of 19–34, any July condition and difficulty, vitals of a sick but plausible adult with the
*   diastolic below the systolic). The random source is injectable, so tests are deterministic. Pure, no dependencies
*   besides the simulator patient labels and the form entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import {
  BREATHING_PATTERN_LABELS,
  CASE_DIFFICULTIES,
  PATIENT_CONDITION_LABELS,
} from "@features/simulator/patient.entry";
import type { BreathingPattern, PatientCondition, PatientSex } from "@features/simulator/patient.entry";
import type { PatientFormValues } from "./patient-form.entity";

/** A source of numbers in [0, 1), like Math.random. */
export type RandomSource = () => number;

// TODO(i18n): move to a simulator namespace in src/i18n.
export const RANDOM_PATIENT_NOTICE = "Datos simulados aleatorios cargados.";

const NAMES: Readonly<Record<PatientSex, readonly string[]>> = {
  FEMALE: ["María José", "Ana Lucía", "Carmen", "Luisa Fernanda", "Valentina"],
  MALE: ["Juan Carlos", "Andrés", "Luis Alberto", "Jorge", "Santiago"],
};

const HEIGHT_RANGE_CM: Readonly<Record<PatientSex, { min: number, max: number }>> = {
  FEMALE: { min: 150, max: 175 },
  MALE: { min: 160, max: 190 },
};

const CONDITIONS = Object.keys(PATIENT_CONDITION_LABELS) as PatientCondition[];
const PATTERNS = Object.keys(BREATHING_PATTERN_LABELS) as BreathingPattern[];
const SEXES: readonly PatientSex[] = ["FEMALE", "MALE"];

function between(random: RandomSource, min: number, max: number): number {
  return min + random() * (max - min);
}

function integerBetween(random: RandomSource, min: number, max: number): number {
  return Math.min(max, Math.floor(between(random, min, max + 1)));
}

function pick<T>(random: RandomSource, options: readonly T[]): T {
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))] as T;
}

function oneDecimal(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function randomPatientValues(random: RandomSource = Math.random): PatientFormValues {
  const sex = pick(random, SEXES);
  const heightRange = HEIGHT_RANGE_CM[sex];
  const heightCm = integerBetween(random, heightRange.min, heightRange.max);
  const bmi = between(random, 19, 34);
  const weightKg = Math.round(bmi * (heightCm / 100) ** 2 * 2) / 2;
  const systolic = integerBetween(random, 95, 160);
  const diastolic = integerBetween(random, 55, Math.min(95, systolic - 30));

  return {
    name: pick(random, NAMES[sex]),
    age: String(integerBetween(random, 18, 85)),
    sex,
    weight: String(weightKg),
    height: String(heightCm),
    condition: pick(random, CONDITIONS),
    difficulty: pick(random, CASE_DIFFICULTIES),
    diagnosis: "",
    allergies: "",
    history: "",
    heartRate: String(integerBetween(random, 60, 130)),
    respiratoryRate: String(integerBetween(random, 12, 32)),
    spo2: String(integerBetween(random, 85, 99)),
    temperature: oneDecimal(between(random, 36, 39.5)),
    systolic: String(systolic),
    diastolic: String(diastolic),
    glasgow: String(integerBetween(random, 13, 15)),
    breathingPattern: pick(random, PATTERNS),
  };
}

/*
* Funcionalidad: Patient metrics
* Descripción: Display-only values of the Simular Paciente form (W8, Bloque 1; FLUJOS_JULIO a.3), with the July
*   formulas: predicted body weight (PCI, ARDSNet: male 50 + 0.91 × (height − 152.4), female 45.5 + 0.91 × (height −
*   152.4), kg to one decimal), body mass index (weight / height², kg/m² to one decimal, with the July label) and the
*   predicted tidal volume 6–8 mL/kg PCI (rounded mL). The server owns the engine mapping (DISENO_BLOQUE1 §2.1); these
*   values are only shown. Pure functions, no dependencies besides the patient sex type.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { PatientSex } from "@features/simulator/patient.entry";

const PBW_HEIGHT_OFFSET_CM = 152.4;
const PBW_SLOPE_KG_PER_CM = 0.91;
const PBW_BASE_KG: Readonly<Record<PatientSex, number>> = { MALE: 50, FEMALE: 45.5 };

/** Protective tidal volume range per kg of predicted body weight (July: "6 – 8 ml/kg PCI"). */
export const TIDAL_VOLUME_ML_PER_KG = { min: 6, max: 8 } as const;

export type TidalVolumeRange = { minMl: number, maxMl: number };

export type PatientMetrics = {
  /** PCI (kg); null without a sex or a positive height. */
  idealBodyWeightKg: number | null
  /** IMC (kg/m²); null without a positive weight and height. */
  bmi: number | null
  /** VT predicho (mL); null without a PCI. */
  tidalVolume: TidalVolumeRange | null
};

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function isPositive(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

/** ARDSNet predicted body weight, unrounded (kg). */
export function predictedBodyWeightKg(sex: PatientSex, heightCm: number): number {
  return PBW_BASE_KG[sex] + PBW_SLOPE_KG_PER_CM * (heightCm - PBW_HEIGHT_OFFSET_CM);
}

export function bodyMassIndex(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;

  return weightKg / (heightM * heightM);
}

export function predictedTidalVolume(idealBodyWeightKg: number): TidalVolumeRange {
  return {
    minMl: Math.round(idealBodyWeightKg * TIDAL_VOLUME_ML_PER_KG.min),
    maxMl: Math.round(idealBodyWeightKg * TIDAL_VOLUME_ML_PER_KG.max),
  };
}

export function computePatientMetrics(sex: PatientSex | null, heightCm: number | null, weightKg: number | null): PatientMetrics {
  const pbw = sex !== null && isPositive(heightCm) ? predictedBodyWeightKg(sex, heightCm) : null;
  // A PCI at or below zero (heights far under the form range) has no meaningful tidal volume.
  const validPbw = pbw !== null && pbw > 0 ? pbw : null;

  return {
    idealBodyWeightKg: validPbw === null ? null : roundTo(validPbw, 1),
    bmi: isPositive(weightKg) && isPositive(heightCm) ? roundTo(bodyMassIndex(weightKg, heightCm), 1) : null,
    tidalVolume: validPbw === null ? null : predictedTidalVolume(validPbw),
  };
}

// TODO(i18n): move to a simulator namespace in src/i18n.
/** July BMI label (PatientForm.tsx `bmiLabel`). */
export function bmiLabel(bmi: number): string {
  if (bmi < 18.5) {
    return "Bajo peso";
  }

  if (bmi < 25) {
    return "Normal";
  }

  if (bmi < 30) {
    return "Sobrepeso";
  }

  return "Obesidad";
}

/*
* Funcionalidad: Patient form mapper
* Descripción: Pure mappings of the Simular Paciente form (W8, Bloque 1; DISENO_BLOQUE1 §2.1 and Anexo A): the form
*   values → SimulatedPatientDTO of POST /api/simulation/sessions (numbers parsed from the typed text, optional values
*   left empty are omitted instead of sent as empty strings, the name trimmed, allergies and history split into items,
*   the difficulty passed through as a label) and the patient preset of a published case → form values ("Cargar
*   caso"), with the case pathology mapped best-effort to a July condition (the moderate grade when the pathology has
*   grades, as July's loadClinicalCase did; no condition when the pathology has no July equivalent, so the student
*   picks one). The server owns the engine mapping; the client only sends the form. Depends on the simulator patient
*   entry types and the form entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { CasePatientPreset, PatientCondition, SimulatedPatientDTO } from "@features/simulator/patient.entry";
import { DEFAULT_PATIENT_DIFFICULTY, EMPTY_PATIENT_FORM, parseFormNumber, splitFormList } from "./entities/patient-form.entity";
import type { PatientFormValues } from "./entities/patient-form.entity";

type SimulatedVitalsDTO = SimulatedPatientDTO["vitals"];

/** Case pathology (catalog value) → July condition; pathologies missing here leave the condition to the student. */
const CONDITION_BY_PATHOLOGY: Readonly<Record<string, PatientCondition>> = {
  NORMAL: "HEALTHY",
  SDRA: "ARDS_MODERATE",
  SINDROME_DE_DISTRES_RESPIRATORIO: "ARDS_MODERATE",
  EPOC: "COPD_MODERATE",
  ASMA: "ASTHMA_MODERATE",
  NEUMONIA: "PNEUMONIA",
  EDEMA_PULMONAR: "PULMONARY_EDEMA",
  OBESIDAD: "OBESITY_HYPOVENTILATION",
  POSTOPERATORIO: "POST_SURGICAL",
};

export function conditionForPathology(pathology: string): PatientCondition | "" {
  return Object.prototype.hasOwnProperty.call(CONDITION_BY_PATHOLOGY, pathology) ? CONDITION_BY_PATHOLOGY[pathology] ?? "" : "";
}

function optionalNumber<K extends string>(key: K, text: string): Partial<Record<K, number>> {
  const value = parseFormNumber(text);

  return value === null ? {} : ({ [key]: value } as Record<K, number>);
}

function optionalText<K extends string>(key: K, text: string): Partial<Record<K, string>> {
  const value = text.trim();

  return value.length === 0 ? {} : ({ [key]: value } as Record<K, string>);
}

function optionalList<K extends string>(key: K, text: string): Partial<Record<K, string[]>> {
  const items = splitFormList(text);

  return items.length === 0 ? {} : ({ [key]: items } as Record<K, string[]>);
}

/**
 * The start request patient of a validated form; null when a required value is missing or not a number (the form
 * validation reports why). Optional values left empty are omitted.
 */
export function toSimulatedPatient(values: PatientFormValues): SimulatedPatientDTO | null {
  const ageYears = parseFormNumber(values.age);
  const weightKg = parseFormNumber(values.weight);
  const heightCm = parseFormNumber(values.height);
  const respiratoryRateBpm = parseFormNumber(values.respiratoryRate);
  const spo2Percent = parseFormNumber(values.spo2);

  if (
    ageYears === null || weightKg === null || heightCm === null || respiratoryRateBpm === null || spo2Percent === null ||
    values.sex === "" || values.condition === ""
  ) {
    return null;
  }

  const vitals: SimulatedVitalsDTO = {
    respiratoryRateBpm,
    spo2Percent,
    ...optionalNumber("heartRateBpm", values.heartRate),
    ...optionalNumber("temperatureC", values.temperature),
    ...optionalNumber("systolicMmHg", values.systolic),
    ...optionalNumber("diastolicMmHg", values.diastolic),
    ...optionalNumber("glasgow", values.glasgow),
    ...(values.breathingPattern === "" ? {} : { breathingPattern: values.breathingPattern }),
  };

  return {
    ...optionalText("displayName", values.name),
    ageYears,
    sex: values.sex,
    weightKg,
    heightCm,
    condition: values.condition,
    difficulty: values.difficulty,
    ...optionalText("diagnosis", values.diagnosis),
    ...optionalList("allergies", values.allergies),
    ...optionalList("history", values.history),
    vitals,
  };
}

function numberText(value: number | null): string {
  return value === null ? "" : String(value);
}

/** Form values of a published case ("Cargar caso"); what the case does not say stays empty. */
export function presetToFormValues(preset: CasePatientPreset): PatientFormValues {
  const { vitals } = preset;

  return {
    ...EMPTY_PATIENT_FORM,
    age: numberText(preset.ageYears),
    sex: preset.sex ?? "",
    weight: numberText(preset.weightKg),
    height: numberText(preset.heightCm),
    condition: conditionForPathology(preset.pathology),
    difficulty: preset.difficulty ?? DEFAULT_PATIENT_DIFFICULTY,
    diagnosis: preset.diagnosis ?? "",
    allergies: preset.allergies.join(", "),
    // One item per line: a history item may carry commas of its own.
    history: preset.history.join("\n"),
    heartRate: numberText(vitals.heartRateBpm),
    respiratoryRate: numberText(vitals.respiratoryRateBpm),
    spo2: numberText(vitals.spo2Percent),
    temperature: numberText(vitals.temperatureC),
    systolic: numberText(vitals.systolicMmHg),
    diastolic: numberText(vitals.diastolicMmHg),
    glasgow: numberText(vitals.glasgow),
    breathingPattern: vitals.breathingPattern ?? "",
  };
}

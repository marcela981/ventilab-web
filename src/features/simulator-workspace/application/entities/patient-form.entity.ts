/*
* Funcionalidad: Patient form entity
* Descripción: State of the two-step Simular Paciente form (W8, Bloque 1; FLUJOS_JULIO a.3): the raw values as typed
*   (numbers kept as text until they are sent), the July steps "Paciente y Condición" → "Estado Actual y Resumen", the
*   loaded base case and the notice of the last load, plus its pure reducer and validation. The ranges are the backend
*   SimulatedPatientDTO validators (age 18–100 integer, weight 30–250 kg, height 140–215 cm, RR 5–50, SpO₂ 50–100,
*   HR 30–200, T 34–42 °C, SBP 50–250, DBP 20–150, Glasgow 3–15 integer, name ≤ 100, diagnosis ≤ 500, lists ≤ 20 items
*   of ≤ 200 characters); the required fields are the July ones plus RR and SpO₂, which the server requires. Validation
*   messages are in Spanish (July wording when it had one). Pure, no dependencies besides the simulator patient types.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { BreathingPattern, CaseDifficulty, PatientCondition, PatientSex } from "@features/simulator/patient.entry";

export type PatientFormValues = {
  name: string
  age: string
  sex: PatientSex | ""
  weight: string
  height: string
  condition: PatientCondition | ""
  difficulty: CaseDifficulty
  diagnosis: string
  /** Comma, semicolon or line separated. */
  allergies: string
  /** Comma, semicolon or line separated. */
  history: string
  heartRate: string
  respiratoryRate: string
  spo2: string
  temperature: string
  systolic: string
  diastolic: string
  glasgow: string
  breathingPattern: BreathingPattern | ""
};

export type PatientFormField = keyof PatientFormValues;

export type PatientFormErrors = Partial<Record<PatientFormField, string>>;

export type PatientFormStep = 0 | 1;

export const PATIENT_FORM_STEP_COUNT = 2;

/** July default difficulty (usePatientForm.ts). */
export const DEFAULT_PATIENT_DIFFICULTY: CaseDifficulty = "INTERMEDIATE";

export const EMPTY_PATIENT_FORM: PatientFormValues = {
  name: "",
  age: "",
  sex: "",
  weight: "",
  height: "",
  condition: "",
  difficulty: DEFAULT_PATIENT_DIFFICULTY,
  diagnosis: "",
  allergies: "",
  history: "",
  heartRate: "",
  respiratoryRate: "",
  spo2: "",
  temperature: "",
  systolic: "",
  diastolic: "",
  glasgow: "",
  breathingPattern: "",
};

export type NumericPatientField = "age" | "weight" | "height" | "heartRate" | "respiratoryRate" | "spo2" | "temperature" | "systolic" | "diastolic" | "glasgow";

export type NumericFieldLimit = { min: number, max: number, unit: string, integer?: boolean, step?: number };

/** Backend SimulatedPatientDTO ranges (class-validator decorators of the start request). */
export const PATIENT_NUMERIC_LIMITS: Readonly<Record<NumericPatientField, NumericFieldLimit>> = {
  age: { min: 18, max: 100, unit: "años", integer: true },
  weight: { min: 30, max: 250, unit: "kg", step: 0.5 },
  height: { min: 140, max: 215, unit: "cm" },
  heartRate: { min: 30, max: 200, unit: "lpm" },
  respiratoryRate: { min: 5, max: 50, unit: "rpm" },
  spo2: { min: 50, max: 100, unit: "%" },
  temperature: { min: 34, max: 42, unit: "°C", step: 0.1 },
  systolic: { min: 50, max: 250, unit: "mmHg" },
  diastolic: { min: 20, max: 150, unit: "mmHg" },
  glasgow: { min: 3, max: 15, unit: "", integer: true },
};

export const PATIENT_TEXT_LIMITS = { name: 100, diagnosis: 500, listItems: 20, listItemLength: 200 } as const;

// TODO(i18n): move to a simulator namespace in src/i18n.
export const PATIENT_FORM_MESSAGES = {
  requiredFeminine: "Requerida",
  requiredMasculine: "Requerido",
  notANumber: "Ingresa un número válido",
  integer: "Debe ser un número entero",
  range: (limit: NumericFieldLimit) => `Debe estar entre ${limit.min} y ${limit.max}${limit.unit ? ` ${limit.unit}` : ""}`,
  maxLength: (max: number) => `Máximo ${max} caracteres`,
  listItems: (max: number) => `Máximo ${max} elementos`,
  listItemLength: (max: number) => `Cada elemento admite máximo ${max} caracteres`,
  diastolicAboveSystolic: "Debe ser menor que la sistólica",
} as const;

/** Required fields and their July message ("Requerida" / "Requerido"). */
const REQUIRED_MESSAGES: Partial<Record<PatientFormField, string>> = {
  age: PATIENT_FORM_MESSAGES.requiredFeminine,
  sex: PATIENT_FORM_MESSAGES.requiredMasculine,
  weight: PATIENT_FORM_MESSAGES.requiredMasculine,
  height: PATIENT_FORM_MESSAGES.requiredFeminine,
  condition: PATIENT_FORM_MESSAGES.requiredFeminine,
  respiratoryRate: PATIENT_FORM_MESSAGES.requiredFeminine,
  spo2: PATIENT_FORM_MESSAGES.requiredFeminine,
};

export const PATIENT_STEP_FIELDS: Readonly<Record<PatientFormStep, readonly PatientFormField[]>> = {
  0: ["name", "age", "sex", "weight", "height", "condition", "difficulty", "diagnosis", "allergies", "history"],
  1: ["heartRate", "respiratoryRate", "spo2", "temperature", "systolic", "diastolic", "glasgow", "breathingPattern"],
};

/** A typed number ("38,5" accepted as 38.5); null when empty or not a finite number. */
export function parseFormNumber(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");

  if (trimmed.length === 0) {
    return null;
  }

  const value = Number(trimmed);

  return Number.isFinite(value) ? value : null;
}

/** Items of a free-text list: split on commas, semicolons and line breaks, trimmed, empty ones dropped. */
export function splitFormList(text: string): string[] {
  return text.split(/[\n,;]/).map((item) => item.trim()).filter((item) => item.length > 0);
}

function isNumericField(field: PatientFormField): field is NumericPatientField {
  return Object.prototype.hasOwnProperty.call(PATIENT_NUMERIC_LIMITS, field);
}

function numericError(field: NumericPatientField, text: string): string | null {
  if (text.trim().length === 0) {
    return null;
  }

  const value = parseFormNumber(text);
  const limit = PATIENT_NUMERIC_LIMITS[field];

  if (value === null) {
    return PATIENT_FORM_MESSAGES.notANumber;
  }

  if (limit.integer && !Number.isInteger(value)) {
    return PATIENT_FORM_MESSAGES.integer;
  }

  return value < limit.min || value > limit.max ? PATIENT_FORM_MESSAGES.range(limit) : null;
}

function listError(text: string): string | null {
  const items = splitFormList(text);

  if (items.length > PATIENT_TEXT_LIMITS.listItems) {
    return PATIENT_FORM_MESSAGES.listItems(PATIENT_TEXT_LIMITS.listItems);
  }

  return items.some((item) => item.length > PATIENT_TEXT_LIMITS.listItemLength)
    ? PATIENT_FORM_MESSAGES.listItemLength(PATIENT_TEXT_LIMITS.listItemLength)
    : null;
}

function fieldError(values: PatientFormValues, field: PatientFormField): string | null {
  const value = values[field];
  const required = REQUIRED_MESSAGES[field];

  if (required !== undefined && value.trim().length === 0) {
    return required;
  }

  if (isNumericField(field)) {
    return numericError(field, value);
  }

  switch (field) {
    case "name":
      return value.trim().length > PATIENT_TEXT_LIMITS.name ? PATIENT_FORM_MESSAGES.maxLength(PATIENT_TEXT_LIMITS.name) : null;
    case "diagnosis":
      return value.trim().length > PATIENT_TEXT_LIMITS.diagnosis ? PATIENT_FORM_MESSAGES.maxLength(PATIENT_TEXT_LIMITS.diagnosis) : null;
    case "allergies":
    case "history":
      return listError(value);
    default:
      return null;
  }
}

/** Errors of the fields of one step (Spanish messages); empty when the step is valid. */
export function validatePatientStep(values: PatientFormValues, step: PatientFormStep): PatientFormErrors {
  const errors: PatientFormErrors = {};

  for (const field of PATIENT_STEP_FIELDS[step]) {
    const error = fieldError(values, field);

    if (error !== null) {
      errors[field] = error;
    }
  }

  if (step === 1 && errors.systolic === undefined && errors.diastolic === undefined) {
    const systolic = parseFormNumber(values.systolic);
    const diastolic = parseFormNumber(values.diastolic);

    if (systolic !== null && diastolic !== null && diastolic >= systolic) {
      errors.diastolic = PATIENT_FORM_MESSAGES.diastolicAboveSystolic;
    }
  }

  return errors;
}

export function hasFormErrors(errors: PatientFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** The base case loaded with "Cargar caso": the session starts on it. */
export type LoadedCase = { id: string, title: string };

export type PatientFormState = {
  values: PatientFormValues
  step: PatientFormStep
  errors: PatientFormErrors
  loadedCase: LoadedCase | null
  /** Notice of the last load ("Historia clínica … cargada."); null otherwise. */
  notice: string | null
};

export const INITIAL_PATIENT_FORM_STATE: PatientFormState = {
  values: EMPTY_PATIENT_FORM,
  step: 0,
  errors: {},
  loadedCase: null,
  notice: null,
};

export type PatientFormAction =
  | { type: "change", patch: Partial<PatientFormValues> }
  | { type: "next" }
  | { type: "back" }
  | { type: "reset" }
  | { type: "load", values: PatientFormValues, loadedCase: LoadedCase | null, notice: string }
  | { type: "invalid", errors: PatientFormErrors, step: PatientFormStep }
  | { type: "dismissNotice" };

function withoutErrors(errors: PatientFormErrors, fields: readonly PatientFormField[]): PatientFormErrors {
  if (!fields.some((field) => errors[field] !== undefined)) {
    return errors;
  }

  const next = { ...errors };

  fields.forEach((field) => {
    delete next[field];
  });

  return next;
}

export function patientFormReducer(state: PatientFormState, action: PatientFormAction): PatientFormState {
  switch (action.type) {
    case "change": {
      const fields = Object.keys(action.patch) as PatientFormField[];

      return { ...state, values: { ...state.values, ...action.patch }, errors: withoutErrors(state.errors, fields) };
    }
    case "next": {
      const errors = validatePatientStep(state.values, 0);

      return hasFormErrors(errors) ? { ...state, errors } : { ...state, step: 1, errors: {} };
    }
    case "back":
      return { ...state, step: 0 };
    case "reset":
      return INITIAL_PATIENT_FORM_STATE;
    case "load":
      return { values: action.values, step: 0, errors: {}, loadedCase: action.loadedCase, notice: action.notice };
    case "invalid":
      return { ...state, errors: action.errors, step: action.step };
    case "dismissNotice":
      return { ...state, notice: null };
  }
}

/** Validates both steps before sending; the first step with an error is where the form goes back to. */
export function validatePatientForm(values: PatientFormValues): { errors: PatientFormErrors, step: PatientFormStep } | null {
  const first = validatePatientStep(values, 0);

  if (hasFormErrors(first)) {
    return { errors: first, step: 0 };
  }

  const second = validatePatientStep(values, 1);

  return hasFormErrors(second) ? { errors: second, step: 1 } : null;
}

/*
* Funcionalidad: Patient form entity tests
* Descripción: Validation and reducer of the Simular Paciente form: the July required fields plus RR and SpO₂, the
*   backend ranges (height 140–215, integer age and Glasgow), list limits, diastolic below systolic, Spanish messages;
*   Siguiente only advances with a valid step 1; a change clears only its field's error; a load goes back to step 1
*   with its case and notice; Limpiar restores the empty form; and the random patient always passes validation.
*   Depends on Vitest, the form entity and the random patient.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  EMPTY_PATIENT_FORM,
  INITIAL_PATIENT_FORM_STATE,
  parseFormNumber,
  patientFormReducer,
  splitFormList,
  validatePatientForm,
  validatePatientStep,
} from "./patient-form.entity";
import type { PatientFormValues } from "./patient-form.entity";
import { randomPatientValues } from "./random-patient.entity";

const VALID_PATIENT_FORM: PatientFormValues = {
  ...EMPTY_PATIENT_FORM,
  name: "Juan",
  age: "60",
  sex: "MALE",
  weight: "70",
  height: "175",
  condition: "PNEUMONIA",
  respiratoryRate: "24",
  spo2: "84",
};

describe("patient form validation", () => {
  it("requires the July fields of step 1 with their Spanish messages", () => {
    expect(validatePatientStep(EMPTY_PATIENT_FORM, 0)).toEqual({
      age: "Requerida",
      sex: "Requerido",
      weight: "Requerido",
      height: "Requerida",
      condition: "Requerida",
    });
  });

  it("requires RR and SpO₂ in step 2 (the server sets the initial rate and PaO₂ from them)", () => {
    expect(validatePatientStep(EMPTY_PATIENT_FORM, 1)).toEqual({ respiratoryRate: "Requerida", spo2: "Requerida" });
  });

  it("applies the backend ranges", () => {
    const errors = validatePatientStep({ ...VALID_PATIENT_FORM, age: "60.5", height: "139", weight: "251", name: "x".repeat(101) }, 0);

    expect(errors).toEqual({
      age: "Debe ser un número entero",
      height: "Debe estar entre 140 y 215 cm",
      weight: "Debe estar entre 30 y 250 kg",
      name: "Máximo 100 caracteres",
    });
    expect(validatePatientStep({ ...VALID_PATIENT_FORM, height: "140" }, 0)).toEqual({});
    expect(validatePatientStep({ ...VALID_PATIENT_FORM, height: "215" }, 0)).toEqual({});
    expect(validatePatientStep({ ...VALID_PATIENT_FORM, spo2: "49", glasgow: "16", temperature: "abc" }, 1)).toEqual({
      spo2: "Debe estar entre 50 y 100 %",
      glasgow: "Debe estar entre 3 y 15",
      temperature: "Ingresa un número válido",
    });
  });

  it("limits the allergy and history lists", () => {
    const many = Array.from({ length: 21 }, (_, index) => `item ${index}`).join(", ");

    expect(validatePatientStep({ ...VALID_PATIENT_FORM, allergies: many, history: "a".repeat(201) }, 0)).toEqual({
      allergies: "Máximo 20 elementos",
      history: "Cada elemento admite máximo 200 caracteres",
    });
  });

  it("asks for a diastolic below the systolic", () => {
    expect(validatePatientStep({ ...VALID_PATIENT_FORM, systolic: "90", diastolic: "90" }, 1)).toEqual({ diastolic: "Debe ser menor que la sistólica" });
    expect(validatePatientStep({ ...VALID_PATIENT_FORM, systolic: "", diastolic: "90" }, 1)).toEqual({});
  });

  it("reports the first step with an error before sending", () => {
    expect(validatePatientForm(VALID_PATIENT_FORM)).toBeNull();
    expect(validatePatientForm({ ...VALID_PATIENT_FORM, spo2: "" })).toEqual({ errors: { spo2: "Requerida" }, step: 1 });
    expect(validatePatientForm({ ...VALID_PATIENT_FORM, condition: "", spo2: "" })).toEqual({ errors: { condition: "Requerida" }, step: 0 });
  });

  it("parses typed numbers and splits lists", () => {
    expect(parseFormNumber(" 38,5 ")).toBe(38.5);
    expect(parseFormNumber("")).toBeNull();
    expect(parseFormNumber("abc")).toBeNull();
    expect(splitFormList(" Penicilina, látex;\n\nAINES ,")).toEqual(["Penicilina", "látex", "AINES"]);
  });
});

describe("patient form reducer", () => {
  it("advances with Siguiente only when step 1 is valid", () => {
    const invalid = patientFormReducer(INITIAL_PATIENT_FORM_STATE, { type: "next" });

    expect(invalid.step).toBe(0);
    expect(invalid.errors.condition).toBe("Requerida");

    const filled = patientFormReducer(invalid, { type: "change", patch: VALID_PATIENT_FORM });
    const next = patientFormReducer(filled, { type: "next" });

    expect(filled.errors).toEqual({});
    expect(next.step).toBe(1);
    expect(patientFormReducer(next, { type: "back" }).step).toBe(0);
  });

  it("clears only the error of the changed field", () => {
    const invalid = patientFormReducer(INITIAL_PATIENT_FORM_STATE, { type: "next" });
    const changed = patientFormReducer(invalid, { type: "change", patch: { age: "40" } });

    expect(changed.errors.age).toBeUndefined();
    expect(changed.errors.sex).toBe("Requerido");
  });

  it("loads values at step 1 with the base case and the notice, and Limpiar restores the empty form", () => {
    const atStep2 = { ...INITIAL_PATIENT_FORM_STATE, step: 1 as const, errors: { spo2: "Requerida" } };
    const loaded = patientFormReducer(atStep2, {
      type: "load",
      values: VALID_PATIENT_FORM,
      loadedCase: { id: "july-neumonia-grave", title: "Neumonía grave" },
      notice: "Historia clínica \"Neumonía grave\" cargada.",
    });

    expect(loaded).toEqual({
      values: VALID_PATIENT_FORM,
      step: 0,
      errors: {},
      loadedCase: { id: "july-neumonia-grave", title: "Neumonía grave" },
      notice: "Historia clínica \"Neumonía grave\" cargada.",
    });
    expect(patientFormReducer(loaded, { type: "dismissNotice" }).notice).toBeNull();
    expect(patientFormReducer(loaded, { type: "reset" })).toEqual(INITIAL_PATIENT_FORM_STATE);
  });
});

describe("random patient", () => {
  it("always produces a complete, valid patient", () => {
    const sources = [() => 0, () => 0.999999, () => 0.5];

    for (const source of sources) {
      expect(validatePatientForm(randomPatientValues(source))).toBeNull();
    }

    for (let run = 0; run < 200; run += 1) {
      expect(validatePatientForm(randomPatientValues())).toBeNull();
    }
  });
});

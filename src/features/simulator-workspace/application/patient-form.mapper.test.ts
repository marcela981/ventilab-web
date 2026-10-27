/*
* Funcionalidad: Patient form mapper tests
* Descripción: The form → SimulatedPatientDTO mapping (units of the contract fields, optional values omitted instead
*   of sent as empty strings, trimmed name and diagnosis, allergies and history split into items, height bounds
*   passed as typed, difficulty passed through as a label, null without a required value) and the case preset → form
*   mapping (every known value filled, unknown ones empty, pathology mapped best-effort to a July condition).
*   Depends on Vitest, the mapper and the form entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { CasePatientPreset } from "@features/simulator/patient.entry";
import { EMPTY_PATIENT_FORM } from "./entities/patient-form.entity";
import type { PatientFormValues } from "./entities/patient-form.entity";
import { conditionForPathology, presetToFormValues, toSimulatedPatient } from "./patient-form.mapper";

const MINIMAL_FORM: PatientFormValues = {
  ...EMPTY_PATIENT_FORM,
  age: "60",
  sex: "MALE",
  weight: "70",
  height: "175",
  condition: "PNEUMONIA",
  respiratoryRate: "24",
  spo2: "84",
};

describe("toSimulatedPatient", () => {
  it("sends only the required values when the optional ones are empty", () => {
    expect(toSimulatedPatient({ ...MINIMAL_FORM, name: "   ", diagnosis: "", allergies: " , ", history: "\n" })).toEqual({
      ageYears: 60,
      sex: "MALE",
      weightKg: 70,
      heightCm: 175,
      condition: "PNEUMONIA",
      difficulty: "INTERMEDIATE",
      vitals: { respiratoryRateBpm: 24, spo2Percent: 84 },
    });
  });

  it("maps every field to its contract name and unit", () => {
    const patient = toSimulatedPatient({
      ...MINIMAL_FORM,
      name: "  Juan Rodríguez ",
      weight: "68,5",
      height: "140",
      difficulty: "ADVANCED",
      diagnosis: " Neumonía grave con hipoxemia ",
      allergies: "Penicilina, látex",
      history: "Hipertensión arterial\nTabaquismo; Diabetes",
      heartRate: "105",
      temperature: "39.1",
      systolic: "150",
      diastolic: "90",
      glasgow: "15",
      breathingPattern: "tachypneic",
    });

    expect(patient).toEqual({
      displayName: "Juan Rodríguez",
      ageYears: 60,
      sex: "MALE",
      weightKg: 68.5,
      heightCm: 140,
      condition: "PNEUMONIA",
      difficulty: "ADVANCED",
      diagnosis: "Neumonía grave con hipoxemia",
      allergies: ["Penicilina", "látex"],
      history: ["Hipertensión arterial", "Tabaquismo", "Diabetes"],
      vitals: {
        respiratoryRateBpm: 24,
        spo2Percent: 84,
        heartRateBpm: 105,
        temperatureC: 39.1,
        systolicMmHg: 150,
        diastolicMmHg: 90,
        glasgow: 15,
        breathingPattern: "tachypneic",
      },
    });
  });

  it("keeps the upper height bound as typed", () => {
    expect(toSimulatedPatient({ ...MINIMAL_FORM, sex: "FEMALE", height: "215" })).toMatchObject({ sex: "FEMALE", heightCm: 215 });
  });

  it.each([
    ["age", { age: "" }],
    ["sex", { sex: "" }],
    ["condition", { condition: "" }],
    ["respiratory rate", { respiratoryRate: "" }],
    ["SpO₂", { spo2: "abc" }],
  ] as const)("returns null without a valid %s", (_, patch) => {
    expect(toSimulatedPatient({ ...MINIMAL_FORM, ...patch })).toBeNull();
  });
});

const NEUMONIA_PRESET: CasePatientPreset = {
  caseId: "july-neumonia-grave",
  title: "Caso 1: Neumonía grave con hipoxemia",
  pathology: "NEUMONIA",
  difficulty: "INTERMEDIATE",
  ageYears: 60,
  sex: "MALE",
  weightKg: 70,
  heightCm: 175,
  diagnosis: "Neumonía grave con hipoxemia",
  allergies: [],
  history: ["Hipertensión arterial", "Tabaquismo, 20 paq-año"],
  vitals: {
    respiratoryRateBpm: 24,
    spo2Percent: 84,
    heartRateBpm: 105,
    temperatureC: 39.1,
    systolicMmHg: 150,
    diastolicMmHg: 90,
    glasgow: 15,
    breathingPattern: null,
  },
};

describe("presetToFormValues", () => {
  it("fills the form with the case patient", () => {
    expect(presetToFormValues(NEUMONIA_PRESET)).toEqual({
      name: "",
      age: "60",
      sex: "MALE",
      weight: "70",
      height: "175",
      condition: "PNEUMONIA",
      difficulty: "INTERMEDIATE",
      diagnosis: "Neumonía grave con hipoxemia",
      allergies: "",
      history: "Hipertensión arterial\nTabaquismo, 20 paq-año",
      heartRate: "105",
      respiratoryRate: "24",
      spo2: "84",
      temperature: "39.1",
      systolic: "150",
      diastolic: "90",
      glasgow: "15",
      breathingPattern: "",
    });
  });

  it("leaves unknown values empty and keeps the default difficulty", () => {
    const values = presetToFormValues({
      ...NEUMONIA_PRESET,
      pathology: "FIBROSIS_PULMONAR",
      difficulty: null,
      sex: null,
      heightCm: null,
      diagnosis: null,
      vitals: { ...NEUMONIA_PRESET.vitals, respiratoryRateBpm: null, spo2Percent: null },
    });

    expect(values).toMatchObject({ condition: "", difficulty: "INTERMEDIATE", sex: "", height: "", diagnosis: "", respiratoryRate: "", spo2: "" });
  });

  it("maps the case pathology to a July condition when there is one", () => {
    expect(conditionForPathology("SDRA")).toBe("ARDS_MODERATE");
    expect(conditionForPathology("EPOC")).toBe("COPD_MODERATE");
    expect(conditionForPathology("NEUMONIA")).toBe("PNEUMONIA");
    expect(conditionForPathology("ASMA")).toBe("ASTHMA_MODERATE");
    expect(conditionForPathology("NORMAL")).toBe("HEALTHY");
    expect(conditionForPathology("OBESIDAD")).toBe("OBESITY_HYPOVENTILATION");
    expect(conditionForPathology("TEP")).toBe("");
    expect(conditionForPathology("toString")).toBe("");
  });
});

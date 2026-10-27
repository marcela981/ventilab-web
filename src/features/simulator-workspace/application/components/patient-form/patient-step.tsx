/*
* Funcionalidad: Patient step
* Descripción: Step 1 "Paciente y Condición" of the Simular Paciente form (W8, Bloque 1; FLUJOS_JULIO a.3), in the
*   July order and wording: Datos del Paciente (Nombre, Edad, Sexo, Peso actual, Estatura and the computed PCI, IMC
*   and VT predicho, read-only) and Condición Clínica (Condición Principal, required; Dificultad Básico/Intermedio/
*   Avanzado, a label only; Diagnóstico / Resumen clínico; Alergias; Antecedentes relevantes). Depends on the simulator
*   patient labels, the patient metrics, the form fields and the patient form styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { DIFFICULTY_LABELS, PATIENT_CONDITION_LABELS, PATIENT_SEX_LABELS } from "@features/simulator/patient.entry";
import { cx } from "@shared/lib/class-names";
import type { PatientFormErrors, PatientFormValues } from "../../entities/patient-form.entity";
import { bmiLabel } from "../../entities/patient-metrics.entity";
import type { PatientMetrics } from "../../entities/patient-metrics.entity";
import { ComputedField, NumberField, SelectField, TextInputField } from "./patient-form-fields";
import type { PatientFormPatch } from "./patient-form-fields";
import styles from "../../../UI/patient-form/patient-form.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const PATIENT_STEP_COPY = {
  patientSection: "Datos del Paciente",
  name: "Nombre (opcional)",
  namePlaceholder: "Identificación del paciente",
  age: "Edad",
  sex: "Sexo",
  choose: "Selecciona…",
  weight: "Peso actual",
  weightHelper: "Estimado o medido",
  height: "Estatura",
  heightHelper: "Entre 140 y 215 cm",
  pbw: "Peso Corp. Ideal (PCI)",
  pbwHelper: "Auto-calculado · ARDSNet",
  bmi: "IMC",
  vt: "VT predicho",
  vtHelper: "6 – 8 ml/kg PCI",
  empty: "—",
  conditionSection: "Condición Clínica",
  condition: "Condición Principal",
  difficulty: "Dificultad",
  difficultyHelper: "Solo una etiqueta: no cambia la simulación",
  diagnosis: "Diagnóstico / Resumen clínico",
  diagnosisPlaceholder: "Ej: SDRA moderado secundario a neumonía bilateral…",
  allergies: "Alergias",
  allergiesPlaceholder: "Ej: Penicilina, látex",
  allergiesHelper: "Separa varias con comas",
  history: "Antecedentes relevantes",
  historyPlaceholder: "Ej: HTA, tabaquismo 20 paq-año…",
  historyHelper: "Uno por línea o separados por comas",
} as const;

export type PatientStepProps = {
  values: PatientFormValues
  errors: PatientFormErrors
  metrics: PatientMetrics
  onChange: PatientFormPatch
};

export function PatientStep({ values, errors, metrics, onChange }: PatientStepProps) {
  const field = { values, errors, onChange };
  const { idealBodyWeightKg, bmi, tidalVolume } = metrics;

  return (
    <>
      <fieldset className={cx(styles.section)}>
        <legend className={cx(styles.sectionTitle)}>{PATIENT_STEP_COPY.patientSection}</legend>
        <div className={cx(styles.grid)}>
          <TextInputField {...field} field="name" label={PATIENT_STEP_COPY.name} placeholder={PATIENT_STEP_COPY.namePlaceholder} wide />
          <NumberField {...field} field="age" label={PATIENT_STEP_COPY.age} required />
          <SelectField {...field} field="sex" label={PATIENT_STEP_COPY.sex} options={PATIENT_SEX_LABELS} emptyLabel={PATIENT_STEP_COPY.choose} required />
          <NumberField {...field} field="weight" label={PATIENT_STEP_COPY.weight} helperText={PATIENT_STEP_COPY.weightHelper} required />
          <NumberField {...field} field="height" label={PATIENT_STEP_COPY.height} helperText={PATIENT_STEP_COPY.heightHelper} required />
        </div>
        <div className={cx(styles.computedGrid)}>
          <ComputedField
            label={PATIENT_STEP_COPY.pbw}
            value={idealBodyWeightKg === null ? PATIENT_STEP_COPY.empty : String(idealBodyWeightKg)}
            unit="kg"
            helperText={PATIENT_STEP_COPY.pbwHelper}
          />
          <ComputedField
            label={PATIENT_STEP_COPY.bmi}
            value={bmi === null ? PATIENT_STEP_COPY.empty : String(bmi)}
            unit="kg/m²"
            helperText={bmi === null ? "" : bmiLabel(bmi)}
          />
          <ComputedField
            label={PATIENT_STEP_COPY.vt}
            value={tidalVolume === null ? PATIENT_STEP_COPY.empty : `${tidalVolume.minMl} – ${tidalVolume.maxMl}`}
            unit="ml"
            helperText={PATIENT_STEP_COPY.vtHelper}
          />
        </div>
      </fieldset>

      <fieldset className={cx(styles.section)}>
        <legend className={cx(styles.sectionTitle)}>{PATIENT_STEP_COPY.conditionSection}</legend>
        <div className={cx(styles.grid)}>
          <SelectField
            {...field}
            field="condition"
            label={PATIENT_STEP_COPY.condition}
            options={PATIENT_CONDITION_LABELS}
            emptyLabel={PATIENT_STEP_COPY.choose}
            required
            wide
          />
          <SelectField
            {...field}
            field="difficulty"
            label={PATIENT_STEP_COPY.difficulty}
            options={DIFFICULTY_LABELS}
            helperText={PATIENT_STEP_COPY.difficultyHelper}
          />
          <TextInputField
            {...field}
            field="diagnosis"
            label={PATIENT_STEP_COPY.diagnosis}
            placeholder={PATIENT_STEP_COPY.diagnosisPlaceholder}
            rows={2}
            wide
          />
          <TextInputField
            {...field}
            field="allergies"
            label={PATIENT_STEP_COPY.allergies}
            placeholder={PATIENT_STEP_COPY.allergiesPlaceholder}
            helperText={PATIENT_STEP_COPY.allergiesHelper}
          />
          <TextInputField
            {...field}
            field="history"
            label={PATIENT_STEP_COPY.history}
            placeholder={PATIENT_STEP_COPY.historyPlaceholder}
            helperText={PATIENT_STEP_COPY.historyHelper}
            rows={3}
          />
        </div>
      </fieldset>
    </>
  );
}

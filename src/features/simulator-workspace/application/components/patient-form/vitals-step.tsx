/*
* Funcionalidad: Vitals step
* Descripción: Step 2 "Estado Actual y Resumen" of the Simular Paciente form (W8, Bloque 1; FLUJOS_JULIO a.3), in the
*   July order and wording: Estado Actual (Frec. Cardíaca, Frec. Resp., SpO₂, Temperatura, Sistólica, Diastólica,
*   Glasgow, Patrón Respiratorio) and the July summary "Parámetros Ventilatorios Sugeridos" (PCI, IMC with its label
*   and the 6–8 ml/kg PCI tidal volume) once they can be computed. FR and SpO₂ are required (the server sets the
*   initial rate and PaO₂ from them). Depends on the simulator patient labels, the patient metrics, the form fields and
*   the patient form styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { BREATHING_PATTERN_LABELS } from "@features/simulator/patient.entry";
import { cx } from "@shared/lib/class-names";
import type { PatientFormErrors, PatientFormValues } from "../../entities/patient-form.entity";
import { bmiLabel } from "../../entities/patient-metrics.entity";
import type { PatientMetrics } from "../../entities/patient-metrics.entity";
import { NumberField, SelectField } from "./patient-form-fields";
import type { PatientFormPatch } from "./patient-form-fields";
import styles from "../../../UI/patient-form/patient-form.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const VITALS_STEP_COPY = {
  section: "Estado Actual",
  heartRate: "Frec. Cardíaca",
  respiratoryRate: "Frec. Resp.",
  spo2: "SpO₂",
  temperature: "Temperatura",
  systolic: "Sistólica",
  diastolic: "Diastólica",
  pressureHelper: "Tensión Art.",
  glasgow: "Glasgow",
  glasgowHelper: "Escala 3 – 15",
  breathingPattern: "Patrón Respiratorio",
  notSpecified: "No especificado",
  summary: "Parámetros Ventilatorios Sugeridos",
  pbw: "Peso Corporal Ideal (PCI)",
  bmi: "IMC",
  vt: "Volumen Tidal recomendado (6–8 ml/kg PCI)",
} as const;

export type VitalsStepProps = {
  values: PatientFormValues
  errors: PatientFormErrors
  metrics: PatientMetrics
  onChange: PatientFormPatch
};

export function VitalsStep({ values, errors, metrics, onChange }: VitalsStepProps) {
  const field = { values, errors, onChange };
  const { idealBodyWeightKg, bmi, tidalVolume } = metrics;

  return (
    <>
      <fieldset className={cx(styles.section)}>
        <legend className={cx(styles.sectionTitle)}>{VITALS_STEP_COPY.section}</legend>
        <div className={cx(styles.grid)}>
          <NumberField {...field} field="heartRate" label={VITALS_STEP_COPY.heartRate} />
          <NumberField {...field} field="respiratoryRate" label={VITALS_STEP_COPY.respiratoryRate} required />
          <NumberField {...field} field="spo2" label={VITALS_STEP_COPY.spo2} required />
          <NumberField {...field} field="temperature" label={VITALS_STEP_COPY.temperature} />
          <NumberField {...field} field="systolic" label={VITALS_STEP_COPY.systolic} helperText={VITALS_STEP_COPY.pressureHelper} />
          <NumberField {...field} field="diastolic" label={VITALS_STEP_COPY.diastolic} helperText={VITALS_STEP_COPY.pressureHelper} />
          <NumberField {...field} field="glasgow" label={VITALS_STEP_COPY.glasgow} helperText={VITALS_STEP_COPY.glasgowHelper} />
          <SelectField
            {...field}
            field="breathingPattern"
            label={VITALS_STEP_COPY.breathingPattern}
            options={BREATHING_PATTERN_LABELS}
            emptyLabel={VITALS_STEP_COPY.notSpecified}
          />
        </div>
      </fieldset>

      {idealBodyWeightKg !== null && tidalVolume !== null ? (
        <section className={cx(styles.section)} aria-label={VITALS_STEP_COPY.summary}>
          <h4 className={cx(styles.summaryTitle)}>{VITALS_STEP_COPY.summary}</h4>
          <dl className={cx(styles.summary)}>
            <div className={cx(styles.summaryRow)}>
              <dt>{VITALS_STEP_COPY.pbw}</dt>
              <dd>{`${idealBodyWeightKg} kg`}</dd>
            </div>
            {bmi === null ? null : (
              <div className={cx(styles.summaryRow)}>
                <dt>{`${VITALS_STEP_COPY.bmi} — ${bmiLabel(bmi)}`}</dt>
                <dd>{`${bmi} kg/m²`}</dd>
              </div>
            )}
            <div className={cx(styles.summaryRow)}>
              <dt>{VITALS_STEP_COPY.vt}</dt>
              <dd>{`${tidalVolume.minMl} – ${tidalVolume.maxMl} ml`}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </>
  );
}

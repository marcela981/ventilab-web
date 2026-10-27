/*
* Funcionalidad: Own patient info
* Descripción: The own patient of a digital session on the Monitoreo tab (W6, Bloque 1): the July form data the student
*   sent (FLUJOS_JULIO a.3: name, age, sex, weight, height, main condition, difficulty, diagnosis, allergies, history
*   and the initial vitals). Display only: the simulation runs the base case with the overrides the server resolved;
*   the difficulty is a label. Depends on React, the simulator patient labels and the monitoring styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { memo } from "react";
import {
  BREATHING_PATTERN_LABELS,
  DIFFICULTY_LABELS,
  PATIENT_CONDITION_LABELS,
  PATIENT_SEX_LABELS,
} from "@features/simulator/session.entry";
import type { SessionPatient } from "@features/simulator/session.entry";
import { cx } from "@shared/lib/class-names";
import styles from "../../../UI/monitoring/monitoring-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const PATIENT_INFO_COPY = {
  title: "Paciente",
  unnamed: "Paciente simulado",
  age: "Edad",
  sex: "Sexo",
  weight: "Peso actual",
  height: "Estatura",
  condition: "Condición Principal",
  difficulty: "Dificultad",
  diagnosis: "Diagnóstico / Resumen clínico",
  allergies: "Alergias",
  history: "Antecedentes relevantes",
  vitals: "Estado inicial",
  heartRate: "Frec. Cardíaca",
  respiratoryRate: "Frec. Resp.",
  spo2: "SpO₂",
  temperature: "Temperatura",
  pressure: "Presión arterial",
  glasgow: "Glasgow",
  pattern: "Patrón Respiratorio",
  none: "Ninguna",
  noneHistory: "Ninguno",
} as const;

type Row = { label: string, value: string };

function optional(value: number | null, unit: string): string | null {
  return value === null ? null : `${value}${unit}`;
}

function vitalsRows(patient: SessionPatient): Row[] {
  const { vitals } = patient;
  const pressure = vitals.systolicMmHg !== null && vitals.diastolicMmHg !== null ? `${vitals.systolicMmHg}/${vitals.diastolicMmHg} mmHg` : null;
  const rows: Array<{ label: string, value: string | null }> = [
    { label: PATIENT_INFO_COPY.heartRate, value: optional(vitals.heartRateBpm, " lpm") },
    { label: PATIENT_INFO_COPY.respiratoryRate, value: `${vitals.respiratoryRateBpm} rpm` },
    { label: PATIENT_INFO_COPY.spo2, value: `${vitals.spo2Percent} %` },
    { label: PATIENT_INFO_COPY.temperature, value: optional(vitals.temperatureC, " °C") },
    { label: PATIENT_INFO_COPY.pressure, value: pressure },
    { label: PATIENT_INFO_COPY.glasgow, value: optional(vitals.glasgow, "") },
    { label: PATIENT_INFO_COPY.pattern, value: vitals.breathingPattern ? BREATHING_PATTERN_LABELS[vitals.breathingPattern] : null },
  ];

  return rows.flatMap((row) => (row.value === null ? [] : [{ label: row.label, value: row.value }]));
}

function FactList({ rows }: { rows: readonly Row[] }) {
  return (
    <dl className={cx(styles.facts)}>
      {rows.map((row) => (
        <div key={row.label} className={cx(styles.fact)}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export const PatientInfo = memo(function PatientInfo({ patient }: { patient: SessionPatient }) {
  const facts: Row[] = [
    { label: PATIENT_INFO_COPY.age, value: `${patient.ageYears} años` },
    { label: PATIENT_INFO_COPY.sex, value: PATIENT_SEX_LABELS[patient.sex] },
    { label: PATIENT_INFO_COPY.weight, value: `${patient.weightKg} kg` },
    { label: PATIENT_INFO_COPY.height, value: `${patient.heightCm} cm` },
    { label: PATIENT_INFO_COPY.condition, value: PATIENT_CONDITION_LABELS[patient.condition] },
    { label: PATIENT_INFO_COPY.difficulty, value: DIFFICULTY_LABELS[patient.difficulty] },
    ...(patient.diagnosis ? [{ label: PATIENT_INFO_COPY.diagnosis, value: patient.diagnosis }] : []),
    { label: PATIENT_INFO_COPY.allergies, value: patient.allergies.length > 0 ? patient.allergies.join(", ") : PATIENT_INFO_COPY.none },
    { label: PATIENT_INFO_COPY.history, value: patient.history.length > 0 ? patient.history.join(", ") : PATIENT_INFO_COPY.noneHistory },
  ];

  return (
    <section className={cx(styles.patientCard)} aria-labelledby="monitor-patient-title">
      <h2 id="monitor-patient-title" className={cx(styles.cardTitle)}>
        {PATIENT_INFO_COPY.title}
        {": "}
        {patient.displayName ?? PATIENT_INFO_COPY.unnamed}
      </h2>
      <FactList rows={facts} />
      <h3 className={cx(styles.cardSubtitle)}>{PATIENT_INFO_COPY.vitals}</h3>
      <FactList rows={vitalsRows(patient)} />
    </section>
  );
});

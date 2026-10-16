/*
* Funcionalidad: Console patient monitor
* Descripción: Patient monitor zone of the ventilator console: shows only the vitals the adapter provides (for the simulation engine: SpO2, PaO2, PaCO2, pH and PAM), each as a value tile with unit and out-of-range highlight plus a short trend sparkline drawn as an inline SVG path computed from the data (last PATIENT_TREND_POINTS values). Renders a notice when the source provides no vitals. Depends on React, the value tile, the console format helpers and the console config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { PATIENT_TREND_POINTS, PATIENT_VITAL_IDS, PATIENT_VITALS } from "./config/console.config";
import type { PatientVitalId } from "./config/console.config";
import { resolveNormalRange, sparklinePath } from "./console-format";
import type { RangeOverrides } from "./console-format";
import type { ConsolePatient } from "./ventilator-console.entity";
import { ValueTile } from "./value-tile";
import styles from "../UI/console-monitor.module.css";

export const PATIENT_MONITOR_COPY = {
  title: "Paciente",
  empty: "La fuente de datos no informa signos del paciente.",
  trend: "Tendencia",
} as const;

const SPARK_WIDTH = 100;
const SPARK_HEIGHT = 24;

export type PatientMonitorProps = {
  patient: ConsolePatient
  ranges?: RangeOverrides<PatientVitalId> | undefined
  className?: string
};

function Sparkline({ values, label }: { values: readonly number[], label: string }) {
  const path = sparklinePath(values.slice(-PATIENT_TREND_POINTS), SPARK_WIDTH, SPARK_HEIGHT);

  if (!path) {
    return null;
  }

  return (
    <svg
      className={cx(styles.sparkline)}
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${PATIENT_MONITOR_COPY.trend} de ${label}`}
    >
      <path d={path} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function PatientMonitor({ patient, ranges, className }: PatientMonitorProps) {
  const provided = PATIENT_VITAL_IDS.filter((id) => patient.values[id] !== undefined);

  return (
    <section className={cx(styles.zone, className)} aria-label={PATIENT_MONITOR_COPY.title}>
      <h2 className={cx(styles.title)}>{PATIENT_MONITOR_COPY.title}</h2>
      {provided.length === 0 ? (
        <p className={cx(styles.empty)}>{PATIENT_MONITOR_COPY.empty}</p>
      ) : (
        <dl className={cx(styles.grid)}>
          {provided.map((id) => (
            <ValueTile
              key={id}
              definition={PATIENT_VITALS[id]}
              value={patient.values[id]}
              range={resolveNormalRange(id, PATIENT_VITALS, ranges)}
            >
              <Sparkline values={patient.trends?.[id] ?? []} label={PATIENT_VITALS[id].label} />
            </ValueTile>
          ))}
        </dl>
      )}
    </section>
  );
}

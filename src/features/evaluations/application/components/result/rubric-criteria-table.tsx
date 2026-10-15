/*
* Funcionalidad: RubricCriteriaTable
* Descripción: Published rubric of a SIMULATION question on the result page: one row per criterion (parameter label, expected value, accepted range min–max or "—", priority) and the rubric justification when present. The student API sends no per-criterion score nor teacher comment, so neither is shown. Renders nothing when the rubric cannot be parsed. Depends on the attempt feedback entities and the attempt result CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import type { RubricCriterion, RubricPriority } from "../../entities/attempt-feedback";
import { parseRubric } from "../../entities/attempt-feedback";
import styles from "../../../UI/attempt-result.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const RUBRIC_COPY = {
  caption: "Rúbrica de la pregunta práctica",
  parameter: "Parámetro",
  expected: "Valor esperado",
  range: "Rango aceptado",
  priority: "Prioridad",
  justification: "Justificación",
  none: "—",
} as const;

const PARAMETER_LABELS: Record<string, string> = {
  tidalVolume: "Volumen corriente",
  respiratoryRate: "Frecuencia respiratoria",
  peep: "PEEP",
  fio2: "FiO2",
  maxPressure: "Presión máxima",
  ventilationMode: "Modo ventilatorio",
  iERatio: "Relación I:E",
};

const PRIORITY_LABELS: Record<RubricPriority, string> = {
  CRITICO: "Crítico",
  IMPORTANTE: "Importante",
  OPCIONAL: "Opcional",
};

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

const formatValue = (value: string | number): string => (typeof value === "number" ? numberFormatter.format(value) : value);

function formatRange(criterion: RubricCriterion): string {
  return criterion.min !== null && criterion.max !== null
    ? `${numberFormatter.format(criterion.min)} – ${numberFormatter.format(criterion.max)}`
    : RUBRIC_COPY.none;
}

export function RubricCriteriaTable({ rubric }: { rubric: unknown }) {
  const parsed = parseRubric(rubric);

  if (!parsed) {
    return null;
  }

  return (
    <div className={cx(styles.rubric)}>
      {parsed.criteria.length > 0 ? (
        <table className={cx(styles.rubricTable)}>
          <caption className={cx(styles.rubricCaption)}>{RUBRIC_COPY.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{RUBRIC_COPY.parameter}</th>
              <th scope="col">{RUBRIC_COPY.expected}</th>
              <th scope="col">{RUBRIC_COPY.range}</th>
              <th scope="col">{RUBRIC_COPY.priority}</th>
            </tr>
          </thead>
          <tbody>
            {parsed.criteria.map((criterion) => (
              <tr key={criterion.parameter}>
                <th scope="row">{PARAMETER_LABELS[criterion.parameter] ?? criterion.parameter}</th>
                <td>{formatValue(criterion.expectedValue)}</td>
                <td>{formatRange(criterion)}</td>
                <td>{criterion.priority ? PRIORITY_LABELS[criterion.priority] : RUBRIC_COPY.none}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {parsed.justification ? (
        <p className={cx(styles.rubricJustification)}>
          <strong>{RUBRIC_COPY.justification}:</strong> {parsed.justification}
        </p>
      ) : null}
    </div>
  );
}

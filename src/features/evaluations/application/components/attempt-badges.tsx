/*
* Funcionalidad: Attempt badges
* Descripción: AttemptStatusBadge shows the status of an attempt (En curso, Enviado, Pendiente de calificación, Calificado) with a semantic color, and GradeBadge shows a published grade in es-CO with one decimal ("3,5") plus "Aprobado"/"No aprobado", colored with the success/error tokens from the API `passed` flag (the pass threshold is never computed on the client). Depends on @shared/lib (format, class names), the evaluation entities and labels, and the evaluations CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { formatGrade } from "@shared/lib/format";
import type { AttemptResult, AttemptStatus } from "../entities/evaluation.entity";
import { ATTEMPT_STATUS_LABELS } from "../entities/evaluation-labels";
import styles from "../../UI/evaluations.module.css";

const STATUS_CLASS: Record<AttemptStatus, string | undefined> = {
  IN_PROGRESS: styles.statusInProgress,
  SUBMITTED: styles.statusPending,
  PENDING_REVIEW: styles.statusPending,
  GRADED: styles.statusDone,
};

export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  return <span className={cx(styles.statusBadge, STATUS_CLASS[status])}>{ATTEMPT_STATUS_LABELS[status]}</span>;
}

// TODO(i18n): move to an evaluations namespace in src/i18n.
const GRADE_COPY = {
  label: "Nota",
  passed: "Aprobado",
  failed: "No aprobado",
} as const;

export function GradeBadge({ result }: { result: AttemptResult }) {
  return (
    <span className={cx(styles.grade, result.passed ? styles.gradePassed : styles.gradeFailed)}>
      <span>{GRADE_COPY.label}</span>
      <span>{formatGrade(result.grade)}</span>
      <span>· {result.passed ? GRADE_COPY.passed : GRADE_COPY.failed}</span>
    </span>
  );
}

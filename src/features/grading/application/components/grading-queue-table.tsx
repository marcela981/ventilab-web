/*
* Funcionalidad: GradingQueueTable
* Descripción: Table of the attempts waiting for review: student (name, or email when the name is missing, with the email below), evaluation title and type, attempt number, submission date in Bogota time with its age ("hace 3 días"), the automatic score so far when there is one, and a "Calificar" link to /grading/attempts/[attemptId]. Depends on MUI, next/link, @shared/lib, the grading entities and URLs and the CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import { formatDateTime, formatRelativeAge } from "@shared/lib/format";
import type { GradingEvaluationType, GradingQueueItem } from "../entities/grading.entity";
import { buildGradingAttemptUrl } from "../entities/grading-urls";
import styles from "../../UI/grading.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const QUEUE_TABLE_COPY = {
  label: "Intentos pendientes de calificación",
  student: "Estudiante",
  evaluation: "Evaluación",
  attempt: "Intento",
  submitted: "Enviado",
  autoScore: "Puntaje automático",
  actions: "Acciones",
  grade: "Calificar",
  noSubmission: "Sin fecha de envío",
  noScore: "—",
  score: (score: string, maxScore: string | null) => (maxScore === null ? score : `${score} / ${maxScore}`),
  attemptNumber: (attemptNumber: number) => `#${attemptNumber}`,
  gradeAction: (student: string) => `Calificar el intento de ${student}`,
} as const;

export const EVALUATION_TYPE_LABELS: Record<GradingEvaluationType, string> = {
  EXAM: "Examen",
  QUIZ: "Quiz",
  WORKSHOP: "Taller",
};

const scoreFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

function formatScore(score: number | null, maxScore: number | null): string {
  if (score === null) {
    return QUEUE_TABLE_COPY.noScore;
  }

  return QUEUE_TABLE_COPY.score(scoreFormatter.format(score), maxScore === null ? null : scoreFormatter.format(maxScore));
}

export type GradingQueueTableProps = {
  items: readonly GradingQueueItem[]
  now?: Date | undefined
};

export function GradingQueueTable({ items, now }: GradingQueueTableProps) {
  return (
    <TableContainer className={cx(styles.tableContainer)}>
      <Table aria-label={QUEUE_TABLE_COPY.label}>
        <TableHead>
          <TableRow>
            <TableCell>{QUEUE_TABLE_COPY.student}</TableCell>
            <TableCell>{QUEUE_TABLE_COPY.evaluation}</TableCell>
            <TableCell>{QUEUE_TABLE_COPY.attempt}</TableCell>
            <TableCell>{QUEUE_TABLE_COPY.submitted}</TableCell>
            <TableCell>{QUEUE_TABLE_COPY.autoScore}</TableCell>
            <TableCell>{QUEUE_TABLE_COPY.actions}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const student = item.studentName ?? item.studentEmail;

            return (
              <TableRow key={item.attemptId}>
                <TableCell>
                  <span className={styles.primary}>{student}</span>
                  {item.studentName ? <span className={styles.secondary}>{item.studentEmail}</span> : null}
                </TableCell>
                <TableCell>
                  <span className={styles.primary}>{item.evaluationTitle}</span>
                  <span className={styles.secondary}>{EVALUATION_TYPE_LABELS[item.evaluationType]}</span>
                </TableCell>
                <TableCell>{QUEUE_TABLE_COPY.attemptNumber(item.attemptNumber)}</TableCell>
                <TableCell>
                  {item.submittedAt ? (
                    <>
                      <span className={styles.primary}>{formatDateTime(item.submittedAt)}</span>
                      <span className={styles.secondary}>{formatRelativeAge(item.submittedAt, now)}</span>
                    </>
                  ) : (
                    <span className={styles.secondary}>{QUEUE_TABLE_COPY.noSubmission}</span>
                  )}
                </TableCell>
                <TableCell>{formatScore(item.score, item.maxScore)}</TableCell>
                <TableCell>
                  <Button
                    component={Link}
                    href={buildGradingAttemptUrl(item.attemptId)}
                    variant="outlined"
                    size="small"
                    aria-label={QUEUE_TABLE_COPY.gradeAction(student)}
                  >
                    {QUEUE_TABLE_COPY.grade}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

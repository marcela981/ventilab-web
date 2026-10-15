/*
* Funcionalidad: StudentResultsTable
* Descripción: Table of the published grade of each student of a group for one evaluation (from the group dashboard): student (name, or email when the name is missing, with the email below), grade in es-CO with pass/fail from the API `passed` flag, the attempt that counts and the publication date in Bogota time. Depends on MUI, @shared/lib, the evaluation results entities and the CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { cx } from "@shared/lib/class-names";
import { formatDateTime, formatGrade } from "@shared/lib/format";
import type { StudentResult } from "../../entities/evaluation-results.entity";
import styles from "../../../UI/evaluation-results.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const STUDENT_TABLE_COPY = {
  label: "Notas publicadas por estudiante",
  student: "Estudiante",
  grade: "Nota",
  attempt: "Intento",
  publishedAt: "Publicada",
  passed: "Aprobado",
  failed: "No aprobado",
  attemptNumber: (attemptNumber: number) => `#${attemptNumber}`,
} as const;

export type StudentResultsTableProps = {
  results: readonly StudentResult[]
};

export function StudentResultsTable({ results }: StudentResultsTableProps) {
  return (
    <TableContainer className={cx(styles.tableContainer)}>
      <Table size="small" aria-label={STUDENT_TABLE_COPY.label}>
        <TableHead>
          <TableRow>
            <TableCell>{STUDENT_TABLE_COPY.student}</TableCell>
            <TableCell>{STUDENT_TABLE_COPY.grade}</TableCell>
            <TableCell>{STUDENT_TABLE_COPY.attempt}</TableCell>
            <TableCell>{STUDENT_TABLE_COPY.publishedAt}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.userId}>
              <TableCell>
                <span className={cx(styles.primary)}>{result.name ?? result.email}</span>
                {result.name ? <span className={cx(styles.secondary)}>{result.email}</span> : null}
              </TableCell>
              <TableCell>
                <span className={cx(styles.grade, result.passed ? styles.gradePassed : styles.gradeFailed)}>
                  {formatGrade(result.grade)} · {result.passed ? STUDENT_TABLE_COPY.passed : STUDENT_TABLE_COPY.failed}
                </span>
              </TableCell>
              <TableCell>{STUDENT_TABLE_COPY.attemptNumber(result.attemptNumber)}</TableCell>
              <TableCell>{formatDateTime(result.publishedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

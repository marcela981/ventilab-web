/*
* Funcionalidad: RubricBreakdownTable
* Descripción: Read-only view of the practical score of a SIMULATION answer, computed by the server (never on the client): the practical score as a percentage and a table with one row per rubric criterion (criterion label, measured value, threshold, points, weighted points and justification). When the server could not score the session it shows the reason in Spanish instead. Depends on MUI, @shared/lib, the grading copy and entities and the grade-attempt CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { cx } from "@shared/lib/class-names";
import { formatPoints, GRADE_COPY, PRACTICAL_REASON_LABELS, RUBRIC_CRITERION_LABELS } from "../../entities/grade-attempt-copy";
import type { PracticalScore } from "../../entities/grading-attempt.entity";
import styles from "../../../UI/grade-attempt.module.css";

const percentFormatter = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 });
const MISSING = "—";

const cell = (value: number | null): string => (value === null ? MISSING : formatPoints(value));

export function RubricBreakdownTable({ practical }: { practical: PracticalScore }) {
  const columns = GRADE_COPY.rubricColumns;

  if (!practical.available) {
    const reason = practical.reason ? PRACTICAL_REASON_LABELS[practical.reason] ?? practical.reason : null;

    return (
      <Alert severity="warning">
        {GRADE_COPY.rubricUnavailable}
        {reason ? ` ${reason}` : null}
      </Alert>
    );
  }

  return (
    <section className={cx(styles.rubric)} aria-label={GRADE_COPY.rubricTitle}>
      <h4 className={cx(styles.subheading)}>{GRADE_COPY.rubricTitle}</h4>
      {practical.score !== null ? (
        <p className={cx(styles.muted)}>{GRADE_COPY.rubricScore(percentFormatter.format(practical.score))}</p>
      ) : null}
      {practical.breakdown.length === 0 ? (
        <p className={cx(styles.muted)}>{GRADE_COPY.rubricEmpty}</p>
      ) : (
        <TableContainer className={cx(styles.tableContainer)}>
          <Table size="small" aria-label={GRADE_COPY.rubricTableLabel}>
            <TableHead>
              <TableRow>
                <TableCell>{columns.criterion}</TableCell>
                <TableCell align="right">{columns.value}</TableCell>
                <TableCell align="right">{columns.threshold}</TableCell>
                <TableCell align="right">{columns.points}</TableCell>
                <TableCell align="right">{columns.weighted}</TableCell>
                <TableCell>{columns.justification}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {practical.breakdown.map((row) => (
                <TableRow key={row.criterion}>
                  <TableCell>{RUBRIC_CRITERION_LABELS[row.criterion] ?? row.criterion}</TableCell>
                  <TableCell align="right">{cell(row.value)}</TableCell>
                  <TableCell align="right">{cell(row.threshold)}</TableCell>
                  <TableCell align="right">{cell(row.points)}</TableCell>
                  <TableCell align="right">{cell(row.weightedPoints)}</TableCell>
                  <TableCell>{row.justification ?? MISSING}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </section>
  );
}

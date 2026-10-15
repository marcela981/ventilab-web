/*
* Funcionalidad: AssignmentCountsTable
* Descripción: Table of the groups an evaluation is assigned to, as `GET /api/evaluation-assignments?evaluationId` returns them: group, state (programada, activa, cerrada), window in Bogota time and the attempt counts by status (in progress, submitted, pending review, graded). Counts are shown as the API sends them. Depends on MUI, @shared/lib, the evaluation results entities and the CSS Module.
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
import { formatDateRange } from "@shared/lib/format";
import { formatCount } from "../../entities/evaluation-results.entity";
import type { AssignmentState, EvaluationAssignment } from "../../entities/evaluation-results.entity";
import styles from "../../../UI/evaluation-results.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const ASSIGNMENT_TABLE_COPY = {
  label: "Intentos por grupo",
  group: "Grupo",
  state: "Estado",
  window: "Ventana",
  inProgress: "En curso",
  submitted: "Enviados",
  pendingReview: "Por calificar",
  graded: "Calificados",
} as const;

export const ASSIGNMENT_STATE_LABELS: Record<AssignmentState, string> = {
  UPCOMING: "Programada",
  ACTIVE: "Activa",
  CLOSED: "Cerrada",
};

export type AssignmentCountsTableProps = {
  assignments: readonly EvaluationAssignment[]
};

export function AssignmentCountsTable({ assignments }: AssignmentCountsTableProps) {
  return (
    <TableContainer className={cx(styles.tableContainer)}>
      <Table size="small" aria-label={ASSIGNMENT_TABLE_COPY.label}>
        <TableHead>
          <TableRow>
            <TableCell>{ASSIGNMENT_TABLE_COPY.group}</TableCell>
            <TableCell>{ASSIGNMENT_TABLE_COPY.state}</TableCell>
            <TableCell>{ASSIGNMENT_TABLE_COPY.window}</TableCell>
            <TableCell align="right">{ASSIGNMENT_TABLE_COPY.inProgress}</TableCell>
            <TableCell align="right">{ASSIGNMENT_TABLE_COPY.submitted}</TableCell>
            <TableCell align="right">{ASSIGNMENT_TABLE_COPY.pendingReview}</TableCell>
            <TableCell align="right">{ASSIGNMENT_TABLE_COPY.graded}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {assignments.map((assignment) => (
            <TableRow key={assignment.id}>
              <TableCell>{assignment.groupName}</TableCell>
              <TableCell>{ASSIGNMENT_STATE_LABELS[assignment.state]}</TableCell>
              <TableCell>{formatDateRange(assignment.startsAt, assignment.endsAt)}</TableCell>
              <TableCell align="right">{formatCount(assignment.attemptCounts.inProgress)}</TableCell>
              <TableCell align="right">{formatCount(assignment.attemptCounts.submitted)}</TableCell>
              <TableCell align="right">{formatCount(assignment.attemptCounts.pendingReview)}</TableCell>
              <TableCell align="right">{formatCount(assignment.attemptCounts.graded)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

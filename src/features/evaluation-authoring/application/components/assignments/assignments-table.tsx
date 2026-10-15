/*
* Funcionalidad: AssignmentsTable
* Descripción: Table of the activations of an evaluation: group name, window formatted in America/Bogota, the state derived by the backend (Próxima, Activa, Cerrada) as a colored badge, the attempt total with its breakdown (in progress, pending review, graded) and the row actions: "Cerrar ahora" for upcoming and active activations and "Eliminar" for an upcoming activation without attempts. The actions only request confirmation; the page runs them. Depends on MUI, @shared/lib, the assignment entities and copy and the assignments CSS Module. v1.1 (A4 review C1/W3): the actions are shown on every row (the list is already scoped to the groups of the caller; the backend answers 403 assignment_forbidden otherwise), and "Eliminar" is offered for any activation without attempts.
* Versión: 1.1
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
import { cx } from "@shared/lib/class-names";
import { formatDateRange } from "@shared/lib/format";
import { ASSIGNMENTS_COPY } from "../../entities/assignments-copy";
import {
  ASSIGNMENT_STATE_LABELS,
  canCloseAssignment,
  canDeleteAssignment,
  totalAttempts,
} from "../../entities/evaluation-assignment.entity";
import type { AssignmentState, EvaluationAssignment } from "../../entities/evaluation-assignment.entity";
import styles from "../../../UI/assignments.module.css";

const STATE_CLASSES: Readonly<Record<AssignmentState, string | undefined>> = {
  UPCOMING: styles.stateUpcoming,
  ACTIVE: styles.stateActive,
  CLOSED: styles.stateClosed,
};

export type AssignmentsTableProps = {
  assignments: readonly EvaluationAssignment[]
  disabled: boolean
  onClose: (assignment: EvaluationAssignment) => void
  onDelete: (assignment: EvaluationAssignment) => void
};

export function AssignmentsTable({ assignments, disabled, onClose, onDelete }: AssignmentsTableProps) {
  const columns = ASSIGNMENTS_COPY.columns;

  return (
    <TableContainer className={cx(styles.tableContainer)}>
      <Table aria-label={ASSIGNMENTS_COPY.tableLabel}>
        <TableHead>
          <TableRow>
            <TableCell>{columns.group}</TableCell>
            <TableCell>{columns.window}</TableCell>
            <TableCell>{columns.state}</TableCell>
            <TableCell align="right">{columns.attempts}</TableCell>
            <TableCell align="right">{columns.actions}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {assignments.map((assignment) => {
            const counts = assignment.attemptCounts;

            return (
              <TableRow key={assignment.id}>
                <TableCell>
                  <span className={cx(styles.groupName)}>{assignment.groupName}</span>
                </TableCell>
                <TableCell>{formatDateRange(assignment.startsAt, assignment.endsAt)}</TableCell>
                <TableCell>
                  <span className={cx(styles.stateBadge, STATE_CLASSES[assignment.state])}>
                    {ASSIGNMENT_STATE_LABELS[assignment.state]}
                  </span>
                </TableCell>
                <TableCell align="right">
                  {totalAttempts(counts)}
                  <span className={cx(styles.secondary)}>
                    {ASSIGNMENTS_COPY.attemptBreakdown(counts.inProgress, counts.pendingReview, counts.graded)}
                  </span>
                </TableCell>
                <TableCell align="right">
                  <div className={cx(styles.rowActions)}>
                    {canCloseAssignment(assignment) ? (
                      <Button
                        size="small"
                        disabled={disabled}
                        aria-label={ASSIGNMENTS_COPY.closeNowFor(assignment.groupName)}
                        onClick={() => onClose(assignment)}
                      >
                        {ASSIGNMENTS_COPY.closeNow}
                      </Button>
                    ) : null}
                    {canDeleteAssignment(assignment) ? (
                      <Button
                        size="small"
                        color="error"
                        disabled={disabled}
                        aria-label={ASSIGNMENTS_COPY.deleteFor(assignment.groupName)}
                        onClick={() => onDelete(assignment)}
                      >
                        {ASSIGNMENTS_COPY.delete}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/*
* Funcionalidad: EvaluationsTable
* Descripción: Table of one page of authorable evaluations (caption "Evaluaciones"): title as row header (with the author), type, status badge (draft, ready, archived), questions and scenarios, activations, last update (es-CO, America/Bogota) and the row actions. Editar and Activaciones link to the editor and activations routes; Duplicar and Archivar call back to the page. Actions are shown only when the backend says the caller can manage the evaluation (canManage); Archivar is hidden for archived ones and every action is disabled while a mutation is pending. The summary carries no total points, so they are not shown. Depends on next/link, MUI, @shared/lib and the authoring entities, URLs and CSS Module.
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
import { formatDateTime } from "@shared/lib/format";
import { buildEvaluationAssignmentsUrl, buildEvaluationEditUrl } from "../entities/authoring-urls";
import { canArchive, EVALUATION_STATUS_LABELS, EVALUATION_TYPE_LABELS } from "../entities/evaluation-authoring.entity";
import type { EvaluationListItem, EvaluationStatus } from "../entities/evaluation-authoring.entity";
import styles from "../../UI/authoring.module.css";

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const TABLE_COPY = {
  label: "Evaluaciones",
  title: "Título",
  type: "Tipo",
  status: "Estado",
  questions: "Preguntas",
  assignments: "Activaciones",
  updated: "Actualizada",
  actions: "Acciones",
  by: (name: string) => `Por ${name}`,
  scenarios: (count: number) => `${count} ${count === 1 ? "escenario" : "escenarios"}`,
  edit: "Editar",
  activations: "Activaciones",
  duplicate: "Duplicar",
  archive: "Archivar",
  readOnly: "Solo lectura",
  rowAction: (action: string, title: string) => `${action} «${title}»`,
} as const;

const STATUS_CLASS: Readonly<Record<EvaluationStatus, string | undefined>> = {
  DRAFT: styles.statusDraft,
  READY: styles.statusReady,
  ARCHIVED: styles.statusArchived,
};

export type EvaluationsTableProps = {
  evaluations: readonly EvaluationListItem[]
  busy: boolean
  onDuplicate: (evaluation: EvaluationListItem) => void
  onArchive: (evaluation: EvaluationListItem) => void
};

export function EvaluationsTable({ evaluations, busy, onDuplicate, onArchive }: EvaluationsTableProps) {
  return (
    <TableContainer className={cx(styles.tableContainer)}>
      <Table aria-label={TABLE_COPY.label} size="small">
        <TableHead>
          <TableRow>
            <TableCell>{TABLE_COPY.title}</TableCell>
            <TableCell>{TABLE_COPY.type}</TableCell>
            <TableCell>{TABLE_COPY.status}</TableCell>
            <TableCell align="right">{TABLE_COPY.questions}</TableCell>
            <TableCell align="right">{TABLE_COPY.assignments}</TableCell>
            <TableCell>{TABLE_COPY.updated}</TableCell>
            <TableCell>{TABLE_COPY.actions}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {evaluations.map((evaluation) => (
            <TableRow key={evaluation.id}>
              <TableCell component="th" scope="row">
                <span className={cx(styles.evaluationTitle)}>{evaluation.title}</span>
                {evaluation.createdByName ? (
                  <span className={cx(styles.secondary)}>{TABLE_COPY.by(evaluation.createdByName)}</span>
                ) : null}
              </TableCell>
              <TableCell>{EVALUATION_TYPE_LABELS[evaluation.type]}</TableCell>
              <TableCell>
                <span className={cx(styles.statusBadge, STATUS_CLASS[evaluation.status])}>
                  {EVALUATION_STATUS_LABELS[evaluation.status]}
                </span>
              </TableCell>
              <TableCell align="right">
                {evaluation.questionCount}
                {evaluation.scenarioCount > 0 ? (
                  <span className={cx(styles.secondary)}>{TABLE_COPY.scenarios(evaluation.scenarioCount)}</span>
                ) : null}
              </TableCell>
              <TableCell align="right">{evaluation.assignmentCount}</TableCell>
              <TableCell>{formatDateTime(evaluation.updatedAt)}</TableCell>
              <TableCell>
                {evaluation.canManage ? (
                  <div className={cx(styles.rowActions)}>
                    <Button
                      component={Link}
                      href={buildEvaluationEditUrl(evaluation.id)}
                      size="small"
                      aria-label={TABLE_COPY.rowAction(TABLE_COPY.edit, evaluation.title)}
                    >
                      {TABLE_COPY.edit}
                    </Button>
                    <Button
                      component={Link}
                      href={buildEvaluationAssignmentsUrl(evaluation.id)}
                      size="small"
                      aria-label={TABLE_COPY.rowAction(TABLE_COPY.activations, evaluation.title)}
                    >
                      {TABLE_COPY.activations}
                    </Button>
                    <Button
                      size="small"
                      disabled={busy}
                      aria-label={TABLE_COPY.rowAction(TABLE_COPY.duplicate, evaluation.title)}
                      onClick={() => onDuplicate(evaluation)}
                    >
                      {TABLE_COPY.duplicate}
                    </Button>
                    {canArchive(evaluation) ? (
                      <Button
                        size="small"
                        color="error"
                        disabled={busy}
                        aria-label={TABLE_COPY.rowAction(TABLE_COPY.archive, evaluation.title)}
                        onClick={() => onArchive(evaluation)}
                      >
                        {TABLE_COPY.archive}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <span className={cx(styles.secondary)}>{TABLE_COPY.readOnly}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

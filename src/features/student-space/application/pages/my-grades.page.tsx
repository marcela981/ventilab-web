/*
* Funcionalidad: MyGradesPage
* Descripción: Page /me/grades (STUDENT): the caller's published grades (`GET /api/my-evaluations/grades`, full list without pagination) in a table with evaluation (link to the attempt result with its feedback), type, attempt, publication date, points, grade in es-CO and the passed/failed state from the API `passed` flag (semantic colour plus text). The type filter only selects rows of the list already returned (display filtering). No average or summary is shown: the API returns none and nothing is computed on the client. BACKEND GAP: grades carry no module, so there is no module column nor module filter. List skeleton, retryable error, stale-data warning and empty states (no grades, no grades of the selected type). Depends on MUI, next/head, next/link, the design-system states and header, @shared/lib format, the student space hooks, entities, routes and the student space CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import GradingIcon from "@mui/icons-material/Grading";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateTime, formatGrade } from "@shared/lib/format";
import { GradeState } from "../components/grade-state";
import { buildAttemptResultUrl, EVALUATIONS_LIST_URL } from "../config/student-space.routes";
import { filterGradesByType, GRADE_TYPE_FILTERS } from "../entities/my-grade.entity";
import type { GradeTypeFilter, MyGrade } from "../entities/my-grade.entity";
import { getStudentSpaceErrorMessage } from "../entities/student-space-error-messages";
import { EVALUATION_TYPE_LABELS, labelOf } from "../entities/student-space-labels";
import { useMyGrades } from "../hooks/use-my-grades";
import styles from "../../UI/student-space.module.css";

// TODO(i18n): move to a student-space namespace in src/i18n.
export const MY_GRADES_COPY = {
  documentTitle: "Mis calificaciones | VentyLab",
  title: "Mis calificaciones",
  subtitle: "Calificaciones publicadas de tus exámenes, quizzes y talleres.",
  typeFilter: "Tipo de evaluación",
  allTypes: "Todos los tipos",
  tableLabel: "Calificaciones publicadas",
  evaluation: "Evaluación",
  type: "Tipo",
  attempt: "Intento",
  publishedAt: "Publicada",
  points: "Puntos",
  grade: "Calificación",
  state: "Estado",
  openResult: (title: string) => `Ver resultado y retroalimentación de ${title}`,
  pointsValue: (score: number, maxScore: number) => `${score} de ${maxScore}`,
  loading: "Cargando tus calificaciones…",
  loadErrorTitle: "No se pudieron cargar tus calificaciones",
  staleWarning: "No se pudieron actualizar tus calificaciones. Los datos mostrados pueden estar desactualizados.",
  retry: "Reintentar",
  emptyTitle: "Todavía no tienes calificaciones publicadas",
  emptyDescription: "Cuando el docente publique la calificación de una evaluación aparecerá aquí.",
  emptyAction: "Ver mis evaluaciones",
  emptyTypeTitle: "No tienes calificaciones de este tipo",
  emptyTypeDescription: "Elige \"Todos los tipos\" para ver todas tus calificaciones.",
} as const;

const MISSING = "—";

function typeLabel(filter: GradeTypeFilter): string {
  return filter === "ALL" ? MY_GRADES_COPY.allTypes : labelOf(EVALUATION_TYPE_LABELS, filter);
}

function pointsOf(grade: MyGrade): string {
  return grade.score === null || grade.maxScore === null ? MISSING : MY_GRADES_COPY.pointsValue(grade.score, grade.maxScore);
}

function GradesTable({ grades }: { grades: readonly MyGrade[] }) {
  return (
    <div className={cx(styles.tableWrap)}>
      <Table aria-label={MY_GRADES_COPY.tableLabel}>
        <TableHead>
          <TableRow>
            <TableCell>{MY_GRADES_COPY.evaluation}</TableCell>
            <TableCell>{MY_GRADES_COPY.type}</TableCell>
            <TableCell>{MY_GRADES_COPY.attempt}</TableCell>
            <TableCell>{MY_GRADES_COPY.publishedAt}</TableCell>
            <TableCell align="right">{MY_GRADES_COPY.points}</TableCell>
            <TableCell align="right">{MY_GRADES_COPY.grade}</TableCell>
            <TableCell>{MY_GRADES_COPY.state}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {grades.map((grade) => (
            <TableRow key={grade.attemptId}>
              <TableCell>
                <Link
                  href={buildAttemptResultUrl(grade.evaluationId, grade.attemptId)}
                  aria-label={MY_GRADES_COPY.openResult(grade.evaluationTitle)}
                  className={cx(styles.link)}
                >
                  {grade.evaluationTitle}
                </Link>
              </TableCell>
              <TableCell>{labelOf(EVALUATION_TYPE_LABELS, grade.evaluationType)}</TableCell>
              <TableCell className={cx(styles.numeric)}>{grade.attemptNumber}</TableCell>
              <TableCell className={cx(styles.numeric)}>{formatDateTime(grade.publishedAt)}</TableCell>
              <TableCell align="right" className={cx(styles.numeric)}>{pointsOf(grade)}</TableCell>
              <TableCell align="right" className={cx(styles.numeric)}>{formatGrade(grade.grade)}</TableCell>
              <TableCell><GradeState passed={grade.passed} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function MyGradesPage() {
  const { grades, isLoading, error, reload } = useMyGrades();
  const [type, setType] = useState<GradeTypeFilter>("ALL");
  const rows = useMemo(() => (grades ? filterGradesByType(grades, type) : null), [grades, type]);

  const renderGrades = () => {
    if (!grades || !rows) {
      return null;
    }

    if (grades.length === 0) {
      return (
        <EmptyState
          icon={<GradingIcon />}
          title={MY_GRADES_COPY.emptyTitle}
          description={MY_GRADES_COPY.emptyDescription}
          action={<Button component={Link} href={EVALUATIONS_LIST_URL} variant="outlined">{MY_GRADES_COPY.emptyAction}</Button>}
        />
      );
    }

    return (
      <>
        <div className={cx(styles.filters)}>
          <TextField
            select
            size="small"
            label={MY_GRADES_COPY.typeFilter}
            value={type}
            onChange={(event) => setType(event.target.value as GradeTypeFilter)}
            className={cx(styles.filter)}
          >
            {GRADE_TYPE_FILTERS.map((filter) => <MenuItem key={filter} value={filter}>{typeLabel(filter)}</MenuItem>)}
          </TextField>
        </div>
        {rows.length === 0
          ? <EmptyState title={MY_GRADES_COPY.emptyTypeTitle} description={MY_GRADES_COPY.emptyTypeDescription} />
          : <GradesTable grades={rows} />}
      </>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{MY_GRADES_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={MY_GRADES_COPY.title} subtitle={MY_GRADES_COPY.subtitle} />
      <div className={cx(styles.content)}>
        {grades && error ? (
          <Alert
            severity="warning"
            action={<Button color="inherit" size="small" onClick={() => void reload()}>{MY_GRADES_COPY.retry}</Button>}
          >
            {MY_GRADES_COPY.staleWarning} {getStudentSpaceErrorMessage(error)}
          </Alert>
        ) : null}
        {renderGrades()}
        {!grades && isLoading ? <ListSkeleton rows={4} label={MY_GRADES_COPY.loading} /> : null}
        {!grades && !isLoading && error ? (
          <ErrorState
            title={MY_GRADES_COPY.loadErrorTitle}
            description={getStudentSpaceErrorMessage(error)}
            onRetry={() => void reload()}
          />
        ) : null}
      </div>
    </div>
  );
}

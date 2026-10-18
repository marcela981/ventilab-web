/*
* Funcionalidad: StudentGrades
* Descripción: Grades block of /teacher/students/[userId]: the student's published grades from `GET /api/evaluation-grading/students/{userId}/grades` (evaluation, module, grade, attempt, publication date and the passed / failed label of the API; each grade links to its attempt in /grading/attempts/[attemptId]) and the attempts waiting for review from the grading queue filtered by the student (`GET /api/evaluation-grading/queue?studentId`, paged with the API pagination, linked to grading). v1.1 (O3 review): a note warned when the scanned group queue page could miss attempts. v1.2 (closure B2): no group is needed: grades come from the staff student grades endpoint (no group dashboard row, no link to the results page for lack of attemptId) and the queue is filtered by studentId and paged (no 50-row limit, no incomplete-list warning). Depends on MUI, next/link, @shared/lib/format, the teacher dashboard hooks, entities, routes and CSS Module.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Pagination from "@mui/material/Pagination";
import Link from "next/link";
import { useState } from "react";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDate, formatDateTime, formatGrade } from "@shared/lib/format";
import { buildGradingAttemptUrl } from "../config/teacher-dashboard.routes";
import { getTeacherDashboardErrorMessage } from "../entities/teacher-dashboard-error-messages";
import { MISSING } from "../entities/teacher-dashboard-labels";
import { useStudentGrades } from "../hooks/use-student-grades";
import { useStudentPendingAttempts } from "../hooks/use-student-pending-attempts";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENT_GRADES_COPY = {
  published: "Calificaciones publicadas",
  pending: "Intentos por calificar",
  noPublished: "Aún no tiene calificaciones publicadas.",
  noPending: "No tiene intentos pendientes de calificación.",
  gradeLine: (grade: string, attempt: number, date: string) => `Nota ${grade} · intento ${attempt} · publicada el ${date}`,
  module: (title: string) => `Módulo: ${title}`,
  pendingLine: (attempt: number, date: string) => `Intento ${attempt} · enviado ${date}`,
  pendingTotal: (total: number) => `${total} ${total === 1 ? "intento pendiente" : "intentos pendientes"}`,
  passed: "Aprobada",
  failed: "Reprobada",
  loading: "Cargando calificaciones…",
  grade: "Calificar",
  pagination: "Páginas de intentos por calificar",
} as const;

function PublishedGrades({ userId }: { userId: string }) {
  const { grades, isLoading, error } = useStudentGrades(userId);

  if (!grades) {
    if (error) {
      return <Alert severity="error">{getTeacherDashboardErrorMessage(error)}</Alert>;
    }

    return isLoading ? <ListSkeleton rows={3} label={STUDENT_GRADES_COPY.loading} /> : null;
  }

  if (grades.length === 0) {
    return <p className={cx(styles.emptyText)}>{STUDENT_GRADES_COPY.noPublished}</p>;
  }

  return (
    <ul className={cx(styles.list)}>
      {grades.map((grade) => (
        <li key={grade.attemptId} className={cx(styles.listItem)}>
          <Link href={buildGradingAttemptUrl(grade.attemptId)} className={cx(styles.link)}>{grade.evaluationTitle}</Link>
          <span className={cx(styles.itemMeta)}>
            {STUDENT_GRADES_COPY.gradeLine(formatGrade(grade.grade), grade.attemptNumber, formatDate(grade.publishedAt))}
            {" · "}
            <span className={cx(grade.passed ? styles.passed : styles.failed)}>
              {grade.passed ? STUDENT_GRADES_COPY.passed : STUDENT_GRADES_COPY.failed}
            </span>
          </span>
          {grade.moduleTitle ? <span className={cx(styles.itemMeta)}>{STUDENT_GRADES_COPY.module(grade.moduleTitle)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function PendingAttempts({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const pending = useStudentPendingAttempts(userId, page);

  return (
    <>
      {pending.error ? <Alert severity="error">{getTeacherDashboardErrorMessage(pending.error)}</Alert> : null}
      {pending.attempts === null && pending.isLoading ? <ListSkeleton rows={2} label={STUDENT_GRADES_COPY.loading} /> : null}
      {pending.attempts && pending.attempts.length === 0 ? <p className={cx(styles.emptyText)}>{STUDENT_GRADES_COPY.noPending}</p> : null}
      {pending.attempts && pending.attempts.length > 0 ? (
        <>
          <p className={cx(styles.meta)}>{STUDENT_GRADES_COPY.pendingTotal(pending.total)}</p>
          <ul className={cx(styles.list)}>
            {pending.attempts.map((attempt) => (
              <li key={attempt.attemptId} className={cx(styles.listItem)}>
                <span className={cx(styles.itemTitle)}>{attempt.evaluationTitle}</span>
                <span className={cx(styles.itemMeta)}>
                  {STUDENT_GRADES_COPY.pendingLine(attempt.attemptNumber, attempt.submittedAt ? formatDateTime(attempt.submittedAt) : MISSING)}
                </span>
                <Link href={buildGradingAttemptUrl(attempt.attemptId)} className={cx(styles.link)}>{STUDENT_GRADES_COPY.grade}</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {pending.pages > 1 ? (
        <Pagination
          size="small"
          count={pending.pages}
          page={Math.min(page, pending.pages)}
          onChange={(_event, next) => setPage(next)}
          aria-label={STUDENT_GRADES_COPY.pagination}
        />
      ) : null}
    </>
  );
}

export function StudentGrades({ userId }: { userId: string }) {
  return (
    <div className={cx(styles.detailGrid)}>
      <div>
        <h3 className={cx(styles.subTitle)}>{STUDENT_GRADES_COPY.published}</h3>
        <PublishedGrades userId={userId} />
      </div>
      <div>
        <h3 className={cx(styles.subTitle)}>{STUDENT_GRADES_COPY.pending}</h3>
        <PendingAttempts userId={userId} />
      </div>
    </div>
  );
}

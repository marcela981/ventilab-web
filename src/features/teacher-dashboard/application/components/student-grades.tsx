/*
* Funcionalidad: StudentGrades
* Descripción: Grades block of /teacher/students/[userId]. With the group the page was opened from (?groupId), it lists the published grades of the student's group dashboard row (grade, attempt, date and the passed / failed label of the API, linked to the evaluation results page because the row has no attemptId: BACKEND GAP) and the student's attempts waiting for review in the group grading queue (linked to /grading/attempts/[attemptId]). Without a group there is no staff endpoint with a student's grades (BACKEND GAP), so it explains how to see them. Depends on MUI, next/link, @shared/lib/format, the teacher dashboard hooks, entities, routes and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Link from "next/link";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDate, formatDateTime, formatGrade } from "@shared/lib/format";
import { buildEvaluationResultsUrl, buildGradingAttemptUrl } from "../config/teacher-dashboard.routes";
import { getTeacherDashboardErrorMessage } from "../entities/teacher-dashboard-error-messages";
import { MISSING } from "../entities/teacher-dashboard-labels";
import { useGroupDashboard } from "../hooks/use-group-dashboard";
import { useStudentPendingAttempts } from "../hooks/use-student-pending-attempts";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENT_GRADES_COPY = {
  published: "Calificaciones publicadas",
  pending: "Intentos por calificar",
  average: (grade: string) => `Promedio (según la API): ${grade}`,
  noGroup: "Abre este detalle desde el panel de un grupo para ver sus calificaciones: la API solo entrega las calificaciones de un estudiante dentro de su grupo.",
  notInGroup: "El estudiante no aparece en el panel de este grupo.",
  noPublished: "Aún no tiene calificaciones publicadas.",
  noPending: "No tiene intentos pendientes de calificación.",
  gradeLine: (grade: string, attempt: number, date: string) => `Nota ${grade} · intento ${attempt} · publicada el ${date}`,
  pendingLine: (attempt: number, date: string) => `Intento ${attempt} · enviado ${date}`,
  passed: "Aprobada",
  failed: "Reprobada",
  loading: "Cargando calificaciones…",
  grade: "Calificar",
} as const;

export function StudentGrades({ userId, groupId }: { userId: string, groupId: string | null }) {
  const { dashboard, isLoading, error } = useGroupDashboard(groupId);
  const pending = useStudentPendingAttempts(groupId, userId);

  if (!groupId) {
    return <Alert severity="info">{STUDENT_GRADES_COPY.noGroup}</Alert>;
  }

  if (!dashboard) {
    if (error) {
      return <Alert severity="error">{getTeacherDashboardErrorMessage(error)}</Alert>;
    }

    return isLoading ? <ListSkeleton rows={3} label={STUDENT_GRADES_COPY.loading} /> : null;
  }

  const row = dashboard.students.find((student) => student.userId === userId) ?? null;

  return (
    <div className={cx(styles.detailGrid)}>
      <div>
        <h3 className={cx(styles.subTitle)}>{STUDENT_GRADES_COPY.published}</h3>
        {!row ? <p className={cx(styles.emptyText)}>{STUDENT_GRADES_COPY.notInGroup}</p> : (
          <>
            <p className={cx(styles.meta)}>{STUDENT_GRADES_COPY.average(row.averageGrade === null ? MISSING : formatGrade(row.averageGrade))}</p>
            {row.evaluations.length === 0 ? <p className={cx(styles.emptyText)}>{STUDENT_GRADES_COPY.noPublished}</p> : (
              <ul className={cx(styles.list)}>
                {row.evaluations.map((grade) => (
                  <li key={`${grade.evaluationId}-${grade.attemptNumber}`} className={cx(styles.listItem)}>
                    <Link href={buildEvaluationResultsUrl(grade.evaluationId)} className={cx(styles.link)}>{grade.evaluationTitle}</Link>
                    <span className={cx(styles.itemMeta)}>
                      {STUDENT_GRADES_COPY.gradeLine(formatGrade(grade.grade), grade.attemptNumber, formatDate(grade.publishedAt))}
                      {" · "}
                      <span className={cx(grade.passed ? styles.passed : styles.failed)}>
                        {grade.passed ? STUDENT_GRADES_COPY.passed : STUDENT_GRADES_COPY.failed}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <div>
        <h3 className={cx(styles.subTitle)}>{STUDENT_GRADES_COPY.pending}</h3>
        {pending.error ? <Alert severity="error">{getTeacherDashboardErrorMessage(pending.error)}</Alert> : null}
        {pending.attempts === null && pending.isLoading ? <ListSkeleton rows={2} label={STUDENT_GRADES_COPY.loading} /> : null}
        {pending.attempts && pending.attempts.length === 0 ? <p className={cx(styles.emptyText)}>{STUDENT_GRADES_COPY.noPending}</p> : null}
        {pending.attempts && pending.attempts.length > 0 ? (
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
        ) : null}
      </div>
    </div>
  );
}

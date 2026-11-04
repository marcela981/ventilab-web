/*
* Funcionalidad: RecentStudents
* Descripción: "Estudiantes recientes" of the General tab of /teacher (julio RecentActivityFeed, FLUJOS_JULIO §c.3): up to 5 rows with the student's name, a labelled progress bar coloured by tone (≥ 70 success, ≥ 30 warning, otherwise error) and the percentage as text (never colour alone); the name links to the student detail only when the API says canView, otherwise it is plain text. "Ver todos" opens /teacher/students. States: five skeleton rows while loading, "Sin estudiantes recientes" when empty and an inline error with retry when the list fails (julio showed the empty text instead). Presentational. Depends on MUI LinearProgress and Button, next/link, the design-system skeleton, @shared/lib/class-names, the teacher dashboard routes and error messages, the teacher general entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "next/link";
import { useId } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { buildStudentDetailUrl, TEACHER_STUDENTS_URL } from "../../config/teacher-dashboard.routes";
import { getTeacherDashboardErrorMessage, isForbiddenError } from "../../entities/teacher-dashboard-error-messages";
import { progressTone, RECENT_STUDENTS_LIMIT } from "../../entities/teacher-general.entity";
import type { RecentStudent } from "../../entities/teacher-general.entity";
import styles from "../../../UI/teacher-general.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const RECENT_STUDENTS_COPY = {
  title: "Estudiantes recientes",
  viewAll: "Ver todos",
  empty: "Sin estudiantes recientes",
  loading: "Cargando estudiantes recientes…",
  errorTitle: "No se pudieron cargar los estudiantes recientes.",
  forbidden: "No tienes permiso para ver los estudiantes.",
  retry: "Reintentar",
  progressAria: (name: string) => `Progreso de ${name}`,
} as const;

export type RecentStudentsProps = {
  students: RecentStudent[] | null
  isLoading: boolean
  error: ApiError | null
  onRetry: () => void
};

export function RecentStudents({ students, isLoading, error, onRetry }: RecentStudentsProps) {
  const titleId = useId();

  const renderBody = () => {
    if (students === null) {
      if (error) {
        return (
          <div role="alert" className={cx(styles.feedError)}>
            <p className={cx(styles.muted)}>{`${RECENT_STUDENTS_COPY.errorTitle} ${isForbiddenError(error) ? RECENT_STUDENTS_COPY.forbidden : getTeacherDashboardErrorMessage(error)}`}</p>
            <Button size="small" onClick={onRetry}>{RECENT_STUDENTS_COPY.retry}</Button>
          </div>
        );
      }

      return isLoading ? <ListSkeleton rows={RECENT_STUDENTS_LIMIT} label={RECENT_STUDENTS_COPY.loading} /> : null;
    }

    if (students.length === 0) {
      return <p className={cx(styles.muted)}>{RECENT_STUDENTS_COPY.empty}</p>;
    }

    return (
      <ul className={cx(styles.feedList)}>
        {students.map((student) => (
          <li key={student.id} className={cx(styles.feedRow)}>
            {student.canView ? (
              <Link href={buildStudentDetailUrl(student.id, null)} className={cx(styles.feedName, styles.link)}>{student.name}</Link>
            ) : (
              <span className={cx(styles.feedName)}>{student.name}</span>
            )}
            <div className={cx(styles.feedProgress)}>
              <LinearProgress
                variant="determinate"
                value={student.progress}
                color={progressTone(student.progress)}
                aria-label={RECENT_STUDENTS_COPY.progressAria(student.name)}
                className={cx(styles.progressBar)}
              />
              <span className={cx(styles.feedPercent)}>{`${student.progress} %`}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section aria-labelledby={titleId} className={cx(styles.panelCard)}>
      <div className={cx(styles.panelHeader)}>
        <h2 id={titleId} className={cx(styles.panelTitle)}>{RECENT_STUDENTS_COPY.title}</h2>
        <Link href={TEACHER_STUDENTS_URL} className={cx(styles.link)}>{RECENT_STUDENTS_COPY.viewAll}</Link>
      </div>
      {renderBody()}
    </section>
  );
}

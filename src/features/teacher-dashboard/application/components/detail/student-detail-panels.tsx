/*
* Funcionalidad: Student detail panels
* Descripción: The five tab panels of /teacher/students/[userId] (DISENO_BLOQUE4 §2.4), lazy loaded together by the page (one chunk) and kept mounted once visited: Módulos (progress tree by section, level and module of `GET /api/progress/users/{userId}/summary`, the summary the header already read), Evaluaciones (published grades and attempts waiting for review, linked to the grading screen), Simulador (simulation sessions with result and replay, then the real ventilator recordings only when there are some), Actividad (windowed timeline) and Gamificación (XP, streak and achievements, read-only). Each panel reads the student from StudentDetailContext and requests its own data on its first visit. No panel reads personal notes or AI conversations. Depends on MUI, the design-system skeleton, the detail components and context and the teacher dashboard entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { getTeacherDashboardErrorMessage } from "../../entities/teacher-dashboard-error-messages";
import { StudentActivity } from "./student-activity";
import { useStudentDetailContext } from "./student-detail-context";
import { StudentGamification } from "./student-gamification";
import { StudentGrades } from "./student-grades";
import { StudentProgressTree } from "./student-progress-tree";
import { StudentSessions } from "./student-sessions";
import { TeamRecordings } from "./team-recordings";
import styles from "../../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENT_PANELS_COPY = {
  progressTitle: "Progreso por nivel y módulo",
  gradesTitle: "Calificaciones",
  loadingProgress: "Cargando el progreso…",
} as const;

export function ModulesPanel() {
  const { summary, summaryLoading, summaryError, titles } = useStudentDetailContext();

  return (
    <section aria-label={STUDENT_PANELS_COPY.progressTitle} className={cx(styles.section)}>
      <h2 className={cx(styles.sectionTitle)}>{STUDENT_PANELS_COPY.progressTitle}</h2>
      {summary ? <StudentProgressTree summary={summary} titles={titles} /> : null}
      {!summary && summaryLoading ? <ListSkeleton rows={4} label={STUDENT_PANELS_COPY.loadingProgress} /> : null}
      {!summary && summaryError ? <Alert severity="error">{getTeacherDashboardErrorMessage(summaryError)}</Alert> : null}
    </section>
  );
}

export function EvaluationsPanel() {
  const { userId } = useStudentDetailContext();

  return (
    <section aria-label={STUDENT_PANELS_COPY.gradesTitle} className={cx(styles.section)}>
      <h2 className={cx(styles.sectionTitle)}>{STUDENT_PANELS_COPY.gradesTitle}</h2>
      <StudentGrades userId={userId} />
    </section>
  );
}

export function SimulatorPanel() {
  const { userId } = useStudentDetailContext();

  return (
    <>
      <StudentSessions userId={userId} />
      <TeamRecordings userId={userId} />
    </>
  );
}

export function ActivityPanel() {
  const { userId } = useStudentDetailContext();

  return <StudentActivity userId={userId} />;
}

export function GamificationPanel() {
  const { userId } = useStudentDetailContext();

  return <StudentGamification userId={userId} />;
}

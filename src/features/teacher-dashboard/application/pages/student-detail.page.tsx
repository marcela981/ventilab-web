/*
* Funcionalidad: StudentDetailPage
* Descripción: Page /teacher/students/[userId] (TEACHER, ADMIN): header from `GET /api/users/students/{id}` (name, email, last access; a 403 or 404 becomes a no-access / not-found state), the progress tree from `GET /api/progress/users/{userId}/summary` labelled with the curriculum titles, the grades (published grades of `GET /api/evaluation-grading/students/{userId}/grades` and attempts waiting for review of the queue filtered by the student, linked to grading), and the activity (simulation sessions of `GET /api/simulation/sessions/history?userId` with replay links and the windowed timeline of `GET /api/analytics/students/{userId}/timeline`). ?groupId only drives the back link to the group panel. The student's personal notes and AI conversations are never read. Depends on MUI, next/head, next/link, next/router, the design-system states, the teacher dashboard hooks, components, entities, routes and CSS Module. v1.1 (closure B2): the grades no longer depend on the group the page was opened from.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton, ListSkeleton } from "@shared/design-system/components/skeleton";
import { toApiError } from "@shared/api-client/api-error";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { StudentActivity } from "../components/student-activity";
import { StudentGrades } from "../components/student-grades";
import { StudentProgressTree } from "../components/student-progress-tree";
import { buildTeacherDashboardUrl } from "../config/teacher-dashboard.routes";
import { getTeacherDashboardErrorMessage } from "../entities/teacher-dashboard-error-messages";
import { useCurriculumTitles } from "../hooks/use-curriculum-titles";
import { useStudentDetail } from "../hooks/use-student-detail";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENT_DETAIL_COPY = {
  documentTitle: (name: string) => `${name} | Panel docente | VentyLab`,
  fallbackTitle: "Detalle del estudiante",
  back: "Volver al panel del grupo",
  lastAccess: (date: string) => `Último acceso: ${date}`,
  neverAccessed: "Sin accesos registrados",
  loading: "Cargando el estudiante…",
  loadingProgress: "Cargando el progreso…",
  forbiddenTitle: "No tienes acceso a este estudiante",
  forbiddenDescription: "Solo puedes ver a los estudiantes de los grupos que creaste o supervisas.",
  notFoundTitle: "El estudiante no existe",
  errorTitle: "No se pudo cargar el estudiante",
  progressTitle: "Progreso",
  gradesTitle: "Calificaciones",
  activityTitle: "Simulación y actividad",
} as const;

function readGroupId(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export type StudentDetailPageProps = {
  userId: string
};

export function StudentDetailPage({ userId }: StudentDetailPageProps) {
  const router = useRouter();
  const groupId = readGroupId(router.query.groupId);
  const { student, studentLoading, studentError, summary, summaryLoading, summaryError, reload } = useStudentDetail(userId);
  const titles = useCurriculumTitles();
  const name = student ? (student.name?.trim() ? student.name : student.email) : STUDENT_DETAIL_COPY.fallbackTitle;
  const backLink = <Link href={buildTeacherDashboardUrl(groupId)} className={cx(styles.link)}>{STUDENT_DETAIL_COPY.back}</Link>;

  const renderBlocked = () => {
    const status = toApiError(studentError).status;

    if (status === 403) {
      return <ErrorState title={STUDENT_DETAIL_COPY.forbiddenTitle} description={STUDENT_DETAIL_COPY.forbiddenDescription} />;
    }

    if (status === 404) {
      return <ErrorState title={STUDENT_DETAIL_COPY.notFoundTitle} description={getTeacherDashboardErrorMessage(studentError)} />;
    }

    return <ErrorState title={STUDENT_DETAIL_COPY.errorTitle} description={getTeacherDashboardErrorMessage(studentError)} onRetry={() => void reload()} />;
  };

  const renderContent = () => {
    if (!student) {
      if (studentError) {
        return renderBlocked();
      }

      return studentLoading ? <CardSkeleton label={STUDENT_DETAIL_COPY.loading} /> : null;
    }

    return (
      <>
        <section aria-label={STUDENT_DETAIL_COPY.progressTitle} className={cx(styles.card)}>
          <h2 className={cx(styles.sectionTitle)}>{STUDENT_DETAIL_COPY.progressTitle}</h2>
          {summary ? <StudentProgressTree summary={summary} titles={titles} /> : null}
          {!summary && summaryLoading ? <ListSkeleton rows={4} label={STUDENT_DETAIL_COPY.loadingProgress} /> : null}
          {!summary && summaryError ? <Alert severity="error">{getTeacherDashboardErrorMessage(summaryError)}</Alert> : null}
        </section>
        <section aria-label={STUDENT_DETAIL_COPY.gradesTitle} className={cx(styles.card)}>
          <h2 className={cx(styles.sectionTitle)}>{STUDENT_DETAIL_COPY.gradesTitle}</h2>
          <StudentGrades userId={userId} />
        </section>
        <section aria-label={STUDENT_DETAIL_COPY.activityTitle} className={cx(styles.card)}>
          <h2 className={cx(styles.sectionTitle)}>{STUDENT_DETAIL_COPY.activityTitle}</h2>
          <StudentActivity userId={userId} />
        </section>
      </>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{STUDENT_DETAIL_COPY.documentTitle(name)}</title>
      </Head>
      <PageHeader
        title={name}
        subtitle={student ? (
          <span className={cx(styles.header)}>
            <span>{student.email}</span>
            <span>{student.lastAccess ? STUDENT_DETAIL_COPY.lastAccess(formatDateTime(student.lastAccess)) : STUDENT_DETAIL_COPY.neverAccessed}</span>
          </span>
        ) : null}
        actions={backLink}
      />
      <div className={cx(styles.content)}>{renderContent()}</div>
    </div>
  );
}

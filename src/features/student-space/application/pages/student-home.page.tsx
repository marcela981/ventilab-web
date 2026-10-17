/*
* Funcionalidad: StudentHomePage
* Descripción: Page /me (STUDENT): the student home built from ONE request, `GET /api/me/summary`. Blocks: learning progress, active and upcoming evaluations, latest grades, latest notes, AI conversations, simulation sessions, upcoming ventilator reservations and the unread notifications counter, each with its empty state (summary-blocks). Card skeletons while loading, a retryable error, and a stale-data warning when a refresh fails over shown data. Nothing is computed on the client. Depends on MUI, next/head, the design-system states and header, the student summary hook, the summary blocks and the student space CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Head from "next/head";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import {
  ConversationsBlock,
  EvaluationsBlock,
  GradesBlock,
  NotesBlock,
  NotificationsBlock,
  ProgressBlock,
  ReservationsBlock,
  SimulationsBlock,
} from "../components/summary-blocks";
import { getStudentSpaceErrorMessage } from "../entities/student-space-error-messages";
import { useStudentSummary } from "../hooks/use-student-summary";
import styles from "../../UI/student-space.module.css";

// TODO(i18n): move to a student-space namespace in src/i18n.
export const STUDENT_HOME_COPY = {
  documentTitle: "Mi espacio | VentyLab",
  title: "Mi espacio",
  subtitle: "Tu progreso, tus evaluaciones y tu actividad reciente en VentyLab.",
  loading: "Cargando tu resumen…",
  loadErrorTitle: "No se pudo cargar tu resumen",
  staleWarning: "No se pudo actualizar tu resumen. Los datos mostrados pueden estar desactualizados.",
  retry: "Reintentar",
} as const;

const SKELETON_CARDS = ["a", "b", "c", "d"];

export type StudentHomePageProps = {
  // Reference instant of the relative times; tests pin it.
  now?: Date | undefined
};

export function StudentHomePage({ now }: StudentHomePageProps = {}) {
  const { summary, isLoading, error, reload } = useStudentSummary();

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{STUDENT_HOME_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={STUDENT_HOME_COPY.title} subtitle={STUDENT_HOME_COPY.subtitle} />
      <div className={cx(styles.content)}>
        {summary && error ? (
          <Alert
            severity="warning"
            action={<Button color="inherit" size="small" onClick={() => void reload()}>{STUDENT_HOME_COPY.retry}</Button>}
          >
            {STUDENT_HOME_COPY.staleWarning} {getStudentSpaceErrorMessage(error)}
          </Alert>
        ) : null}
        {summary ? (
          <div className={cx(styles.grid)}>
            <ProgressBlock overall={summary.overallProgress} sections={summary.sectionProgress} />
            <EvaluationsBlock active={summary.activeEvaluations} upcoming={summary.upcomingEvaluations} />
            <GradesBlock grades={summary.grades} />
            <NotificationsBlock unread={summary.unreadNotifications} />
            <NotesBlock notes={summary.latestNotes} now={now} />
            <ConversationsBlock conversations={summary.latestConversations} now={now} />
            <SimulationsBlock sessions={summary.latestSimulationSessions} />
            <ReservationsBlock reservations={summary.upcomingReservations} />
          </div>
        ) : null}
        {!summary && isLoading ? (
          <div className={cx(styles.grid)}>
            {SKELETON_CARDS.map((key) => <CardSkeleton key={key} label={STUDENT_HOME_COPY.loading} />)}
          </div>
        ) : null}
        {!summary && !isLoading && error ? (
          <ErrorState
            title={STUDENT_HOME_COPY.loadErrorTitle}
            description={getStudentSpaceErrorMessage(error)}
            onRetry={() => void reload()}
          />
        ) : null}
      </div>
    </div>
  );
}

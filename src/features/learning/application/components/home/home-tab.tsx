/*
* Funcionalidad: HomeTab
* Descripción: Inicio panel of the /learn workspace (students only; W8, Bloque 2; DISENO_BLOQUE2 §2.12 and July DashboardTab). One parallel request wave: the student summary (`GET /api/me/summary`, the same useStudentSummary as /me), the gamification stats and the recent ledger activity. Layout of July with real data: "Continuar donde quedaste" (shared ContinueLearningBlock) and "XP Hoy" on top, then "Evaluaciones pendientes" (shared EvaluationsBlock), notifications (shared NotificationsBlock) and "Actividad Reciente" (ledger facts merged with the summary notes, conversations, sessions and grades). A card whose data is absent or empty is hidden (homeCardVisibility); "Plan Semanal" and "Reto del Día" are not rendered (no data). Skeletons while the first wave loads, a retryable error when nothing could be read, a stale-data warning with retry when one read fails over shown data, and the July empty state when no card has data. v0.2 (W8): replaces the W3 placeholder; moved from learn-workspace/ to home/. Depends on MUI, next/link, the design-system states and skeleton, the student space entries, the gamification hooks, the Inicio selectors and components and the Inicio styles.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import HomeIcon from "@mui/icons-material/Home";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import {
  ContinueLearningBlock,
  EvaluationsBlock,
  getStudentSpaceErrorMessage,
  NotificationsBlock,
} from "@features/student-space/home.entry";
import { useStudentSummary } from "@features/student-space/summary.entry";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { hasAnyHomeCard, homeCardVisibility, mergeHomeActivity } from "../../entities/home-activity.entity";
import { buildCurriculumUrl } from "../../entities/learning-urls";
import { useGamification, useRecentActivity } from "../../hooks/use-gamification";
import { RecentActivityBlock } from "./recent-activity-block";
import { XpTodayCard } from "./xp-today-card";
import styles from "../../../UI/home.module.css";

// TODO(i18n): move to a learning namespace in src/i18n. Empty state from July ProgressTab.
export const HOME_TAB_COPY = {
  loading: "Cargando tu inicio…",
  loadErrorTitle: "No se pudo cargar tu inicio",
  staleWarning: "No se pudo actualizar parte de tu inicio. Los datos mostrados pueden estar desactualizados.",
  retry: "Reintentar",
  evaluationsTitle: "Evaluaciones pendientes",
  emptyTitle: "Aún no tienes progreso",
  emptyDescription: "Comienza tu viaje de aprendizaje completando tu primera lección.",
  emptyAction: "Ir al currículo",
} as const;

const SKELETON_CARDS = ["a", "b", "c"];

export type HomeTabProps = {
  // Reference instant of the relative times; tests pin it.
  now?: Date | undefined
};

export function HomeTab({ now }: HomeTabProps = {}) {
  const { summary, isLoading: summaryLoading, error: summaryError, reload: reloadSummary } = useStudentSummary();
  const gamification = useGamification();
  const recent = useRecentActivity();
  const { reload: reloadGamification } = gamification;
  const { reload: reloadRecent } = recent;

  const activity = useMemo(() => mergeHomeActivity({ recent: recent.data ?? [], summary }), [recent.data, summary]);
  const visible = homeCardVisibility({ summary, stats: gamification.data, activity });

  const reloadAll = useCallback(() => {
    void Promise.all([reloadSummary(), reloadGamification(), reloadRecent()]);
  }, [reloadSummary, reloadGamification, reloadRecent]);

  if (summaryLoading || gamification.isLoading || recent.isLoading) {
    return (
      <div className={cx(styles.grid)}>
        {SKELETON_CARDS.map((key) => <CardSkeleton key={key} label={HOME_TAB_COPY.loading} />)}
      </div>
    );
  }

  const firstError = summaryError ?? gamification.error ?? recent.error;

  if (!summary && !gamification.data && !recent.data && firstError) {
    return (
      <ErrorState
        title={HOME_TAB_COPY.loadErrorTitle}
        description={getStudentSpaceErrorMessage(firstError)}
        onRetry={reloadAll}
      />
    );
  }

  return (
    <div className={cx(styles.home)}>
      {firstError ? (
        <Alert severity="warning" action={<Button color="inherit" size="small" onClick={reloadAll}>{HOME_TAB_COPY.retry}</Button>}>
          {HOME_TAB_COPY.staleWarning} {getStudentSpaceErrorMessage(firstError)}
        </Alert>
      ) : null}
      {hasAnyHomeCard(visible) ? null : (
        <EmptyState
          icon={<HomeIcon />}
          title={HOME_TAB_COPY.emptyTitle}
          description={HOME_TAB_COPY.emptyDescription}
          action={<Link href={buildCurriculumUrl()} className={cx(styles.link)}>{HOME_TAB_COPY.emptyAction}</Link>}
        />
      )}
      {visible.continueLearning || visible.xpToday ? (
        <div className={cx(styles.hero)}>
          {summary?.continueLearning ? <ContinueLearningBlock item={summary.continueLearning} /> : null}
          {gamification.data ? <XpTodayCard stats={gamification.data} /> : null}
        </div>
      ) : null}
      {visible.evaluations || visible.notifications || visible.activity ? (
        <div className={cx(styles.grid)}>
          {visible.evaluations && summary ? (
            <EvaluationsBlock
              title={HOME_TAB_COPY.evaluationsTitle}
              active={summary.activeEvaluations}
              upcoming={summary.upcomingEvaluations}
            />
          ) : null}
          {visible.notifications && summary ? <NotificationsBlock unread={summary.unreadNotifications} /> : null}
          {visible.activity ? <RecentActivityBlock items={activity} now={now} /> : null}
        </div>
      ) : null}
    </div>
  );
}

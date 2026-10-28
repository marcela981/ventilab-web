/*
* Funcionalidad: ProgressTab
* Descripción: Mi Progreso panel of the /learn workspace (students only; W9, Bloque 2; DISENO_BLOQUE2 §2.11 and July ProgressTab/ProgressContent). One parallel request wave: gamification stats, activity calendar (last 12 weeks), unlocked achievements, curriculum tree and progress summary. Cards: "Nivel {n}" (XP and level bar), "Racha consecutiva", the activity calendar (heatmap, lazy loaded with retryImport, skeleton while its data loads), "Logros (n)", "Hitos" and "Árbol de Habilidades" (both derived in the client from the curriculum; pure selectors). Skeletons while the wave loads; "No se pudo cargar el progreso" with retry when the stats fail; a stale-data warning with retry when another read fails (its card is hidden); the July "Aún no tienes progreso" empty state with no XP, no achievements and no completed lesson. v0.2 (W9): replaces the W3 placeholder; moved from learn-workspace/ to progress/. Depends on React, MUI, next/link, @shared/lib (retryImport, class names), the design-system states and skeleton, the learning hooks, the Mi Progreso selectors and cards and the Mi Progreso styles.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import InsightsIcon from "@mui/icons-material/Insights";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import { lazy, Suspense, useCallback, useMemo } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import type { CurriculumAccordionKey } from "../../entities/curriculum-view.entity";
import { getLearningErrorMessage } from "../../entities/learning-error-messages";
import { buildCurriculumUrl } from "../../entities/learning-urls";
import { deriveMilestones, deriveSkillTree } from "../../entities/progress-insights.entity";
import { useCurriculumTree } from "../../hooks/use-curriculum-tree";
import { useAchievements, useActivityCalendar, useGamification } from "../../hooks/use-gamification";
import { useProgressSummary } from "../../hooks/use-progress";
import { AchievementsCard, MilestonesCard, SkillTreeCard, StreakCard, XpLevelCard } from "./progress-cards";
import styles from "../../../UI/progress.module.css";

const ActivityCalendar = lazy(() =>
  retryImport(() => import("./activity-calendar")).then((module) => ({ default: module.ActivityCalendar })),
);

// TODO(i18n): move to a learning namespace in src/i18n. Texts from July ProgressTab.
export const PROGRESS_TAB_COPY = {
  loading: "Cargando tu progreso…",
  loadingCalendar: "Cargando el calendario…",
  loadErrorTitle: "No se pudo cargar el progreso",
  loadErrorDescription: "Intenta recargar la página o verifica tu conexión.",
  staleWarning: "No se pudo cargar parte de tu progreso.",
  retry: "Reintentar",
  emptyTitle: "Aún no tienes progreso",
  emptyDescription: "Comienza tu viaje de aprendizaje completando tu primera lección.",
  emptyAction: "Ir al currículo",
  // Same branch names as the Currículo accordions (July teaching.json).
  branches: {
    ventylab: "Aprendizaje VentyLab",
    prerrequisitos: "Prerequisitos",
    mecanica: "Aprendizaje Mecánica respiratoria",
  } satisfies Record<CurriculumAccordionKey, string>,
} as const;

const SKELETON_CARDS = ["a", "b", "c"];

export function ProgressTab() {
  const gamification = useGamification();
  const calendar = useActivityCalendar();
  const achievements = useAchievements();
  const curriculum = useCurriculumTree();
  const progress = useProgressSummary();
  const { reload: reloadGamification } = gamification;
  const { reload: reloadCalendar } = calendar;
  const { reload: reloadAchievements } = achievements;
  const { reload: reloadTree } = curriculum;
  const { reload: reloadProgress } = progress;

  const milestones = useMemo(() => (curriculum.tree ? deriveMilestones(curriculum.tree, progress.progress) : []), [curriculum.tree, progress.progress]);
  const branches = useMemo(() => (curriculum.tree ? deriveSkillTree(curriculum.tree, progress.progress) : []), [curriculum.tree, progress.progress]);

  const reloadAll = useCallback(() => {
    void Promise.all([reloadGamification(), reloadCalendar(), reloadAchievements(), reloadTree(), reloadProgress()]);
  }, [reloadGamification, reloadCalendar, reloadAchievements, reloadTree, reloadProgress]);

  if (gamification.isLoading || achievements.isLoading || curriculum.isLoading || progress.isLoading) {
    return (
      <div className={cx(styles.grid)}>
        {SKELETON_CARDS.map((key) => <CardSkeleton key={key} label={PROGRESS_TAB_COPY.loading} />)}
      </div>
    );
  }

  const stats = gamification.data;

  if (!stats) {
    return (
      <ErrorState
        title={PROGRESS_TAB_COPY.loadErrorTitle}
        description={gamification.error ? getLearningErrorMessage(gamification.error) : PROGRESS_TAB_COPY.loadErrorDescription}
        onRetry={reloadAll}
      />
    );
  }

  const partialError = calendar.error ?? achievements.error ?? curriculum.error ?? progress.error;
  const noProgress = stats.xpTotal === 0
    && (achievements.data?.length ?? 0) === 0
    && (progress.progress?.overall.completedLessons ?? 0) === 0;

  if (noProgress && !partialError) {
    return (
      <EmptyState
        icon={<InsightsIcon />}
        title={PROGRESS_TAB_COPY.emptyTitle}
        description={PROGRESS_TAB_COPY.emptyDescription}
        action={<Link href={buildCurriculumUrl()} className={cx(styles.link)}>{PROGRESS_TAB_COPY.emptyAction}</Link>}
      />
    );
  }

  return (
    <div className={cx(styles.progress)}>
      {partialError ? (
        <Alert severity="warning" action={<Button color="inherit" size="small" onClick={reloadAll}>{PROGRESS_TAB_COPY.retry}</Button>}>
          {PROGRESS_TAB_COPY.staleWarning} {getLearningErrorMessage(partialError)}
        </Alert>
      ) : null}
      <div className={cx(styles.grid)}>
        <XpLevelCard stats={stats} />
        <StreakCard stats={stats} />
        {calendar.data ? (
          <Suspense fallback={<CardSkeleton label={PROGRESS_TAB_COPY.loadingCalendar} />}>
            <ActivityCalendar days={calendar.data} range={calendar.range} />
          </Suspense>
        ) : null}
        {!calendar.data && calendar.isLoading ? <CardSkeleton label={PROGRESS_TAB_COPY.loadingCalendar} /> : null}
        {achievements.data ? <AchievementsCard achievements={achievements.data} /> : null}
        {curriculum.tree ? <MilestonesCard milestones={milestones} /> : null}
        {curriculum.tree ? <SkillTreeCard branches={branches} branchTitles={PROGRESS_TAB_COPY.branches} /> : null}
      </div>
    </div>
  );
}

/*
* Funcionalidad: EvaluationGradingPage
* Descripción: The single grading screen of one evaluation, /grading/evaluations/[evaluationId] (DISENO_BLOQUE3 §2.8 and §3): header with the evaluation title, its type and passing grade (`GET /api/analytics/evaluations/{id}/stats`) and "Volver a Calificar" (the Calificar tab of the staff hub), then the tabs Revisar, Estadísticas and Publicación masiva (`?tab=revisar|estadisticas|publicacion`, default revisar, shared useUrlTab). Each panel loads lazily (lazyPanel: React.lazy + retryImport) on its first visit and stays mounted with `hidden` (shared KeptMountedTabPanels), so the drafts of the review pane survive a tab switch; the panels read the evaluation from GradingWorkspaceContext. Revisar also reads `?attempt=`, `?group=` and `?status=`. Depends on MUI, next/head, next/link, the design-system header and skeleton, @shared/lib, the grading entities, hooks and workspace components and the grading CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { KeptMountedTabPanels, lazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import type { LazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import { useUrlTab } from "@shared/lib/use-url-tab";
import { EVALUATION_TYPE_LABELS } from "../components/grading-queue-table";
import { gradingPanelId, gradingTabId, GradingTabs } from "../components/workspace/grading-tabs";
import { GradingWorkspaceContext } from "../components/workspace/grading-workspace-context";
import type { GradingTab } from "../entities/evaluation-attempts.entity";
import { DEFAULT_GRADING_TAB, GRADING_TABS } from "../entities/evaluation-attempts.entity";
import { formatStatGrade } from "../entities/evaluation-results.entity";
import { GRADING_URL } from "../entities/grading-urls";
import { useEvaluationStats } from "../hooks/use-evaluation-results";
import styles from "../../UI/grading.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const GRADING_PAGE_COPY = {
  documentTitle: (title: string) => `Calificación: ${title} | VentyLab`,
  fallbackTitle: "Calificación de la evaluación",
  subtitle: (type: string | null, passingGrade: string) => `${type ? `${type} · ` : ""}Nota mínima para aprobar: ${passingGrade}`,
  back: "Volver a Calificar",
  loadingPanel: {
    revisar: "Cargando los intentos…",
    estadisticas: "Cargando las estadísticas…",
    publicacion: "Cargando la publicación…",
  } satisfies Record<GradingTab, string>,
} as const;

const TAB_PANELS: Record<GradingTab, LazyPanel> = {
  revisar: lazyPanel(() => import("../components/workspace/review-tab").then((module) => module.ReviewTab)),
  estadisticas: lazyPanel(() => import("../components/workspace/statistics-tab").then((module) => module.StatisticsTab)),
  publicacion: lazyPanel(() => import("../components/workspace/bulk-publish-tab").then((module) => module.BulkPublishTab)),
};

const panelFallback = (tab: GradingTab) => <CardSkeleton label={GRADING_PAGE_COPY.loadingPanel[tab]} />;

export type EvaluationGradingPageProps = {
  evaluationId: string
};

export function EvaluationGradingPage({ evaluationId }: EvaluationGradingPageProps) {
  const { tab, selectTab } = useUrlTab(GRADING_TABS, DEFAULT_GRADING_TAB);
  const stats = useEvaluationStats(evaluationId);
  const workspace = useMemo(() => ({ evaluationId }), [evaluationId]);
  const title = stats.data?.title ?? GRADING_PAGE_COPY.fallbackTitle;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{GRADING_PAGE_COPY.documentTitle(title)}</title>
      </Head>
      <PageHeader
        title={title}
        subtitle={stats.data
          ? GRADING_PAGE_COPY.subtitle(stats.data.type ? EVALUATION_TYPE_LABELS[stats.data.type] : null, formatStatGrade(stats.data.passingGrade))
          : undefined}
        actions={(
          <Button component={Link} href={GRADING_URL} startIcon={<ArrowBackIcon />}>
            {GRADING_PAGE_COPY.back}
          </Button>
        )}
      />
      {tab !== null ? <GradingTabs active={tab} onSelect={selectTab} /> : null}
      <GradingWorkspaceContext.Provider value={workspace}>
        <KeptMountedTabPanels
          tabs={GRADING_TABS}
          active={tab}
          panels={TAB_PANELS}
          fallback={panelFallback}
          panelId={gradingPanelId}
          tabId={gradingTabId}
          panelClassName={cx(styles.tabPanel)}
        />
      </GradingWorkspaceContext.Provider>
    </div>
  );
}

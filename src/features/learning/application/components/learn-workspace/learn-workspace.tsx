/*
* Funcionalidad: LearnWorkspace
* Descripción: The /learn page (W3, Bloque 2; DISENO_BLOQUE2 §2.1 and §3): header, the top tabs Inicio, Currículo and Mi Progreso (?tab=inicio|curriculo|progreso, default curriculo, read only once the router is ready and switched with a shallow router.replace through the shared useUrlTab) and one panel per tab. Each panel is lazy loaded (lazyPanel: React.lazy + retryImport) on the FIRST visit of its tab and then stays mounted with the `hidden` attribute (shared KeptMountedTabPanels), with its own error boundary and skeleton. Staff (TEACHER, ADMIN) only see Currículo: no tab list and the URL tab is ignored (decision 1 of §7b). While the Currículo tab is active, the curriculum tree and progress summary requests start together with the panel chunk (SWR dedupes them with the panel's own reads), so the first content is not delayed by the chunk. Depends on next/head, @shared/lib (url tab, kept-mounted panels), the design-system header and skeleton, the learning hooks and the workspace styles. v0.2 (W8, Bloque 2): the Inicio panel lives in components/home; while Inicio is active its single request wave (student summary, gamification stats, recent activity) starts together with the panel chunk, the same way as Currículo.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import { useStudentSummary } from "@features/student-space/summary.entry";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { KeptMountedTabPanels, lazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import type { LazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import { useUrlTab } from "@shared/lib/use-url-tab";
import { DEFAULT_LEARN_TAB, LEARN_TABS, learnTabsFor } from "../../entities/learn-tab.entity";
import type { LearnTab } from "../../entities/learn-tab.entity";
import { useCurriculumTree } from "../../hooks/use-curriculum-tree";
import { usePreviewMode } from "../../hooks/use-preview-mode";
import { useGamification, useRecentActivity } from "../../hooks/use-gamification";
import { useProgressSummary } from "../../hooks/use-progress";
import { learnPanelId, learnTabId, LearnTabs } from "./learn-tabs";
import styles from "../../../UI/learn-workspace.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
export const LEARN_WORKSPACE_COPY = {
  documentTitle: "Aprender | VentyLab",
  title: "Aprender",
  subtitle: "Recorre el curso de ventilación mecánica a tu ritmo.",
  loadingPanel: {
    inicio: "Cargando tu inicio…",
    curriculo: "Cargando el currículo…",
    progreso: "Cargando tu progreso…",
  } satisfies Record<LearnTab, string>,
} as const;

const TAB_PANELS: Record<LearnTab, LazyPanel> = {
  inicio: lazyPanel(() => import("../home/home-tab").then((module) => module.HomeTab)),
  curriculo: lazyPanel(() => import("../curriculum/curriculum-tab").then((module) => module.CurriculumTab)),
  progreso: lazyPanel(() => import("./progress-tab").then((module) => module.ProgressTab)),
};

const HEADING_ID = "learn-workspace-title";

const panelFallback = (tab: LearnTab) => <CardSkeleton label={LEARN_WORKSPACE_COPY.loadingPanel[tab]} />;

export function LearnWorkspace() {
  const isStaff = usePreviewMode();
  const tabs = learnTabsFor(isStaff);
  const { tab, selectTab } = useUrlTab(LEARN_TABS, DEFAULT_LEARN_TAB, { ignoreUrl: isStaff });
  const curriculumActive = tab === "curriculo";
  const homeActive = tab === "inicio" && !isStaff;

  // Warm-up only: the Currículo panel reads the same SWR keys once its chunk is loaded.
  useCurriculumTree(curriculumActive);
  useProgressSummary(curriculumActive);
  // Warm-up only: the Inicio panel reads the same three keys (one parallel wave).
  useStudentSummary(homeActive);
  useGamification(homeActive);
  useRecentActivity(homeActive);

  return (
    <div className={cx(styles.workspace)} data-learn-tab={tab ?? undefined}>
      <Head>
        <title>{LEARN_WORKSPACE_COPY.documentTitle}</title>
      </Head>
      <div id={HEADING_ID}>
        <PageHeader title={LEARN_WORKSPACE_COPY.title} subtitle={LEARN_WORKSPACE_COPY.subtitle} />
      </div>
      {tab !== null && !isStaff ? <LearnTabs tabs={tabs} active={tab} onSelect={selectTab} /> : null}
      <KeptMountedTabPanels
        tabs={tabs}
        active={tab}
        panels={TAB_PANELS}
        fallback={panelFallback}
        panelId={learnPanelId}
        // Staff have no tab list: their only panel is labelled by the page heading.
        tabId={isStaff ? () => HEADING_ID : learnTabId}
        panelClassName={cx(styles.panel)}
      />
    </div>
  );
}

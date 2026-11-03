/*
* Funcionalidad: StaffEvaluationsHub
* Descripción: The /evaluations page of teachers and admins (DISENO_BLOQUE3 §2.6 and §3): header "Evaluación", the tabs Gestionar, Calificar and Resultados (?tab=gestionar|calificar|resultados, default gestionar, through the shared useUrlTab) and one panel per tab. Each panel is lazy loaded (lazyPanel: React.lazy + retryImport) on the first visit of its tab and then stays mounted with `hidden` (shared KeptMountedTabPanels): Gestionar is the authoring list (EvaluationsManageBody), Calificar the grading queue (GradingQueueBody of @features/grading/hub.entry, itself lazy) and Resultados the ResultsTab. The Calificar tab carries the pending count (usePendingGradingCount, same SWR key as the navigation badge). Loaded lazily by the /evaluations route for staff only, so students never download it. Depends on next/head, the design-system header and skeleton, @shared/lib, the grading hub entry, the staff hub entities and components and the staff hub CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import { GradingQueueBody, usePendingGradingCount } from "@features/grading/hub.entry";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { KeptMountedTabPanels, lazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import type { LazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import { useUrlTab } from "@shared/lib/use-url-tab";
import type { StaffHubTab } from "../../entities/staff-hub.entity";
import { DEFAULT_STAFF_HUB_TAB, STAFF_HUB_TABS } from "../../entities/staff-hub.entity";
import { staffHubPanelId, staffHubTabId, StaffHubTabs } from "./staff-hub-tabs";
import styles from "../../../UI/staff-hub.module.css";

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const STAFF_HUB_COPY = {
  documentTitle: "Evaluación | VentyLab",
  title: "Evaluación",
  subtitle: "Gestiona, califica y consulta los resultados de las evaluaciones de tus grupos.",
  loadingPanel: {
    gestionar: "Cargando evaluaciones…",
    calificar: "Cargando la cola de calificación…",
    resultados: "Cargando resultados…",
  } satisfies Record<StaffHubTab, string>,
} as const;

const TAB_PANELS: Record<StaffHubTab, LazyPanel> = {
  gestionar: lazyPanel(() => import("../../pages/evaluations-manage.page").then((module) => module.EvaluationsManageBody)),
  // The body is already a lazy entry point: its chunk loads when the tab is first shown.
  calificar: lazyPanel(() => Promise.resolve(GradingQueueBody)),
  resultados: lazyPanel(() => import("./results-tab").then((module) => module.ResultsTab)),
};

const panelFallback = (tab: StaffHubTab) => <CardSkeleton label={STAFF_HUB_COPY.loadingPanel[tab]} />;

export function StaffEvaluationsHub() {
  const { tab, selectTab } = useUrlTab(STAFF_HUB_TABS, DEFAULT_STAFF_HUB_TAB);
  const pendingCount = usePendingGradingCount(true);

  return (
    <div className={cx(styles.hub)}>
      <Head>
        <title>{STAFF_HUB_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={STAFF_HUB_COPY.title} subtitle={STAFF_HUB_COPY.subtitle} />
      {tab !== null ? <StaffHubTabs active={tab} onSelect={selectTab} pendingCount={pendingCount} /> : null}
      <KeptMountedTabPanels
        tabs={STAFF_HUB_TABS}
        active={tab}
        panels={TAB_PANELS}
        fallback={panelFallback}
        panelId={staffHubPanelId}
        tabId={staffHubTabId}
        panelClassName={cx(styles.panel)}
      />
    </div>
  );
}

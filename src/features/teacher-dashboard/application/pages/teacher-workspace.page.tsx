/*
* Funcionalidad: TeacherWorkspacePage
* Descripción: Page /teacher (TEACHER, ADMIN) as a tabbed workspace (DISENO_BLOQUE4 §2.2): the tabs General and Por grupo live in the URL (?tab=general|grupo through the shared useUrlTab; default general, but a ?groupId without tab opens grupo, so the group links and the student detail's back link land on the group). Each panel is lazy loaded on the first visit of its tab and then stays mounted with `hidden` (shared KeptMountedTabPanels): General is the julio panel home (GeneralTab) and Por grupo the unchanged TeacherDashboardPage. The tab list has roving tabindex and arrow/Home/End keys (shared useTabListKeyboard). Depends on next/head, next/router, @shared/lib (tabs, URL tab, class names), the design-system skeleton, the teacher dashboard routes and the teacher general CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import { useRouter } from "next/router";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { KeptMountedTabPanels, lazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import type { LazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import { useTabListKeyboard } from "@shared/lib/tab-list-keyboard";
import { useUrlTab } from "@shared/lib/use-url-tab";
import { TEACHER_DASHBOARD_TABS } from "../config/teacher-dashboard.routes";
import type { TeacherDashboardTab } from "../config/teacher-dashboard.routes";
import styles from "../../UI/teacher-general.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const TEACHER_WORKSPACE_COPY = {
  documentTitle: "Panel docente | VentyLab",
  tabsLabel: "Secciones del dashboard",
  tabs: { general: "General", grupo: "Por grupo" } satisfies Record<TeacherDashboardTab, string>,
  loadingPanel: { general: "Cargando el resumen…", grupo: "Cargando el panel del grupo…" } satisfies Record<TeacherDashboardTab, string>,
} as const;

const TAB_PANELS: Record<TeacherDashboardTab, LazyPanel> = {
  general: lazyPanel(() => import("../components/general/general-tab").then((module) => module.GeneralTab)),
  grupo: lazyPanel(() => import("./teacher-dashboard.page").then((module) => module.TeacherDashboardPage)),
};

export const teacherWorkspaceTabId = (tab: TeacherDashboardTab): string => `teacher-workspace-tab-${tab}`;
export const teacherWorkspacePanelId = (tab: TeacherDashboardTab): string => `teacher-workspace-panel-${tab}`;

const panelFallback = (tab: TeacherDashboardTab) => <CardSkeleton label={TEACHER_WORKSPACE_COPY.loadingPanel[tab]} />;

function hasGroupId(value: string | string[] | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

type WorkspaceTabsProps = {
  active: TeacherDashboardTab
  onSelect: (tab: TeacherDashboardTab) => void
};

function WorkspaceTabs({ active, onSelect }: WorkspaceTabsProps) {
  const { onKeyDown, registerTab } = useTabListKeyboard(TEACHER_DASHBOARD_TABS, active, onSelect);

  return (
    <div role="tablist" aria-label={TEACHER_WORKSPACE_COPY.tabsLabel} className={cx(styles.tabList)} onKeyDown={onKeyDown}>
      {TEACHER_DASHBOARD_TABS.map((tab) => (
        <button
          key={tab}
          ref={registerTab(tab)}
          type="button"
          role="tab"
          id={teacherWorkspaceTabId(tab)}
          aria-selected={tab === active}
          aria-controls={teacherWorkspacePanelId(tab)}
          tabIndex={tab === active ? 0 : -1}
          className={cx(styles.tab)}
          onClick={() => onSelect(tab)}
        >
          {TEACHER_WORKSPACE_COPY.tabs[tab]}
        </button>
      ))}
    </div>
  );
}

export function TeacherWorkspacePage() {
  const router = useRouter();
  // A group link without a tab (?groupId=…) opens the group tab.
  const defaultTab: TeacherDashboardTab = hasGroupId(router.query.groupId) ? "grupo" : "general";
  const { tab, selectTab } = useUrlTab(TEACHER_DASHBOARD_TABS, defaultTab);

  return (
    <div className={cx(styles.workspace)}>
      <Head>
        <title>{TEACHER_WORKSPACE_COPY.documentTitle}</title>
      </Head>
      {tab !== null ? <WorkspaceTabs active={tab} onSelect={selectTab} /> : null}
      <KeptMountedTabPanels
        tabs={TEACHER_DASHBOARD_TABS}
        active={tab}
        panels={TAB_PANELS}
        fallback={panelFallback}
        panelId={teacherWorkspacePanelId}
        tabId={teacherWorkspaceTabId}
        panelClassName={cx(styles.panel)}
      />
    </div>
  );
}

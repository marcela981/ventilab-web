/*
* Funcionalidad: SimulatorWorkspace
* Descripción: Shell of the /simulador workspace (W5, Bloque 1; DISENO_BLOQUE1 §2.4 and §3): one section per tab
*   (Simular Paciente, Monitoreo, Conexión, Mis sesiones) and the fixed bottom tabs. Each panel is lazy loaded on the
*   FIRST visit of its tab and then stays mounted with the `hidden` attribute (never unmounted), so its state, its
*   canvases and the session it shows survive every tab switch; the tab is read from the URL only once the router is
*   ready (useWorkspaceTab). Each panel has its own error
*   boundary and loading skeleton. Depends on @shared/lib/kept-mounted-tab-panels, the design-system skeleton,
*   the workspace tab hook, the bottom tabs and the workspace styles. v0.2 (W9, Bloque 1): Mis sesiones
*   is the SessionsPanel (unified list and in-panel replay). v0.3 (W8, Bloque 1): the Simular Paciente tab is the
*   patient form panel. v0.4 (W11, Bloque 1): every tab has its final panel (W6–W10); the temporary panels are gone.
*   v0.5 (W1, Bloque 2): the visited/hidden panels and their lazy loading come from the shared KeptMountedTabPanels
*   and lazyPanel, with no behaviour change.
* Versión: 0.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { KeptMountedTabPanels, lazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import type { LazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import { WORKSPACE_TABS } from "../entities/workspace-tab.entity";
import type { WorkspaceTab } from "../entities/workspace-tab.entity";
import { useWorkspaceTab } from "../hooks/use-workspace-tab";
import { BottomTabs, workspacePanelId, workspaceTabId } from "./bottom-tabs";
import styles from "../../UI/simulator-workspace.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const SIMULATOR_WORKSPACE_COPY = {
  title: "Simulador",
  loading: "Cargando el simulador…",
  loadingPanel: {
    simular: "Cargando Simulador de Paciente…",
    monitoreo: "Cargando sistema de ventilación...",
    conexion: "Cargando la conexión…",
    sesiones: "Cargando tus sesiones…",
  } satisfies Record<WorkspaceTab, string>,
} as const;

const TAB_PANELS: Record<WorkspaceTab, LazyPanel> = {
  simular: lazyPanel(() => import("./patient-form/patient-form-panel").then((module) => module.PatientFormPanel)),
  monitoreo: lazyPanel(() => import("./monitoring/monitoring-panel").then((module) => module.MonitoringPanel)),
  conexion: lazyPanel(() => import("./connection/connection-panel").then((module) => module.ConnectionPanel)),
  sesiones: lazyPanel(() => import("./sessions/sessions-panel").then((module) => module.SessionsPanel)),
};

const panelFallback = (tab: WorkspaceTab) => <CardSkeleton label={SIMULATOR_WORKSPACE_COPY.loadingPanel[tab]} />;

export function SimulatorWorkspace() {
  const { tab, selectTab } = useWorkspaceTab();

  return (
    <div className={cx(styles.workspace)} data-workspace-tab={tab ?? undefined}>
      <h1 className={cx(styles.visuallyHidden)}>{SIMULATOR_WORKSPACE_COPY.title}</h1>
      <div className={cx(styles.panels)}>
        <KeptMountedTabPanels
          tabs={WORKSPACE_TABS}
          active={tab}
          panels={TAB_PANELS}
          fallback={panelFallback}
          panelId={workspacePanelId}
          tabId={workspaceTabId}
          panelClassName={cx(styles.panel)}
        />
      </div>
      {tab !== null ? <BottomTabs active={tab} onSelect={selectTab} /> : null}
    </div>
  );
}

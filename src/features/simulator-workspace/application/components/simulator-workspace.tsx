/*
* Funcionalidad: SimulatorWorkspace
* Descripción: Shell of the /simulador workspace (W5, Bloque 1; DISENO_BLOQUE1 §2.4 and §3): one section per tab
*   (Simular Paciente, Monitoreo, Conexión, Mis sesiones) and the fixed bottom tabs. Each panel is lazy loaded on the
*   FIRST visit of its tab and then stays mounted with the `hidden` attribute (never unmounted), so its state, its
*   canvases and the session it shows survive every tab switch; the tab is read from the URL only once the router is
*   ready (useWorkspaceTab). Panels not built yet are temporary (W7–W9 replace them). Each panel has its own error
*   boundary and loading skeleton. Depends on React.lazy, @shared/lib/retry-import, the design-system skeleton and route
*   error boundary, the workspace tab hook, the bottom tabs and the workspace styles. v0.2 (W9, Bloque 1): Mis sesiones
*   is the SessionsPanel (unified list and in-panel replay). v0.3 (W8, Bloque 1): the Simular Paciente tab is the
*   patient form panel.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense, useState } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
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

const MonitoringPanel = lazy(() =>
  retryImport(() => import("./monitoring/monitoring-panel")).then((module) => ({ default: module.MonitoringPanel })),
);

// Temporary panels: W8 (Simular Paciente), W7 (Conexión) and W9 (Mis sesiones) replace them.
const SimularPanel = lazy(() =>
  retryImport(() => import("./patient-form/patient-form-panel")).then((module) => ({ default: module.PatientFormPanel })),
);

const ConexionPanel = lazy(() =>
  retryImport(() => import("./temporary-panels")).then((module) => ({ default: module.TemporaryConexionPanel })),
);

const SesionesPanel = lazy(() =>
  retryImport(() => import("./sessions/sessions-panel")).then((module) => ({ default: module.SessionsPanel })),
);

const TAB_PANELS: Record<WorkspaceTab, LazyExoticComponent<ComponentType>> = {
  simular: SimularPanel,
  monitoreo: MonitoringPanel,
  conexion: ConexionPanel,
  sesiones: SesionesPanel,
};

const NO_VISITS: readonly WorkspaceTab[] = [];

export function SimulatorWorkspace() {
  const { tab, selectTab } = useWorkspaceTab();
  // Tabs visited at least once: their panel is mounted and stays mounted (hidden) afterwards.
  const [visited, setVisited] = useState<readonly WorkspaceTab[]>(NO_VISITS);

  if (tab !== null && !visited.includes(tab)) {
    setVisited([...visited, tab]);
  }

  return (
    <div className={cx(styles.workspace)} data-workspace-tab={tab ?? undefined}>
      <h1 className={cx(styles.visuallyHidden)}>{SIMULATOR_WORKSPACE_COPY.title}</h1>
      <div className={cx(styles.panels)}>
        {WORKSPACE_TABS.map((key) => {
          const Panel = TAB_PANELS[key];

          return (
            <section
              key={key}
              id={workspacePanelId(key)}
              role="tabpanel"
              aria-labelledby={workspaceTabId(key)}
              hidden={tab !== key}
              className={cx(styles.panel)}
            >
              {visited.includes(key) ? (
                <RouteErrorBoundary>
                  <Suspense fallback={<CardSkeleton label={SIMULATOR_WORKSPACE_COPY.loadingPanel[key]} />}>
                    <Panel />
                  </Suspense>
                </RouteErrorBoundary>
              ) : null}
            </section>
          );
        })}
      </div>
      {tab !== null ? <BottomTabs active={tab} onSelect={selectTab} /> : null}
    </div>
  );
}

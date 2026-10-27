/*
* Funcionalidad: Simulator workspace page (placeholder)
* Descripción: Temporary page of /simulador, the home of every role (W1, Bloque 1). It reads `?tab=` only once the router is ready (parseWorkspaceTab; missing or unknown → monitoreo), shows the workspace heading and, so no screen is lost while the workspace is built, lazy loads the existing page of that tab from its feature barrel: simular and sesiones → SimulatorCatalogPage (catalog and "Mis sesiones"), conexion → LabHomePage, monitoreo → LabLivePage. W5 replaces this content with the workspace shell (bottom tabs, panels mounted once). Depends on next/router, React.lazy, @shared/lib/retry-import, the design-system skeleton and route error boundary, and the simulator and ventilator-lab barrels.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Typography from "@mui/material/Typography";
import { useRouter } from "next/router";
import { lazy, Suspense } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import { parseWorkspaceTab } from "../entities/workspace-tab.entity";
import type { WorkspaceTab } from "../entities/workspace-tab.entity";
import styles from "../../UI/simulator-workspace.module.css";

export const SIMULATOR_WORKSPACE_COPY = {
  title: "Simulador",
  loading: "Cargando el simulador…",
} as const;

const SimulatorCatalogPanel = lazy(() =>
  retryImport(() => import("@features/simulator")).then((module) => ({ default: module.SimulatorCatalogPage })),
);

const LabHomePanel = lazy(() =>
  retryImport(() => import("@features/ventilator-lab")).then((module) => ({ default: module.LabHomePage })),
);

const LabLivePanel = lazy(() =>
  retryImport(() => import("@features/ventilator-lab")).then((module) => ({ default: module.LabLivePage })),
);

// Temporary mapping to the pages that existed before the workspace (W5–W10 replace each panel).
const TAB_PANELS: Record<WorkspaceTab, LazyExoticComponent<ComponentType>> = {
  simular: SimulatorCatalogPanel,
  sesiones: SimulatorCatalogPanel,
  conexion: LabHomePanel,
  monitoreo: LabLivePanel,
};

export function SimulatorWorkspacePage() {
  const router = useRouter();
  // Before hydration the query is empty: wait for it instead of flashing the default tab.
  const tab = router.isReady ? parseWorkspaceTab(router.query.tab) : null;
  const Panel = tab ? TAB_PANELS[tab] : null;

  return (
    <div className={styles.page} data-workspace-tab={tab ?? undefined}>
      <Typography variant="h4" component="h1" className={cx(styles.title)}>
        {SIMULATOR_WORKSPACE_COPY.title}
      </Typography>
      {Panel ? (
        <RouteErrorBoundary resetKey={tab ?? undefined}>
          <Suspense fallback={<CardSkeleton label={SIMULATOR_WORKSPACE_COPY.loading} />}>
            <Panel />
          </Suspense>
        </RouteErrorBoundary>
      ) : null}
    </div>
  );
}

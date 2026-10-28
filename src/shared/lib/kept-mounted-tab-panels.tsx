/*
* Funcionalidad: KeptMountedTabPanels + lazyPanel
* Descripción: Panels of a tabbed workspace, extracted from the Bloque 1 simulator workspace so /learn reuses it
*   (DISENO_BLOQUE2 §2.1). One `role="tabpanel"` section per tab (aria-labelledby its tab); a panel is rendered the
*   FIRST time its tab is active and then stays mounted with the `hidden` attribute (never unmounted), so its state
*   survives every tab switch. Each panel has its own error boundary and a Suspense fallback given by the feature.
*   lazyPanel wraps React.lazy with retryImport for a named export. Styling stays in each feature (panelClassName).
*   Depends on React, @shared/lib/retry-import and the design-system route error boundary.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense, useState } from "react";
import type { ComponentType, LazyExoticComponent, ReactNode } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { retryImport } from "./retry-import";

export type LazyPanel = LazyExoticComponent<ComponentType>;

/** Lazy panel loaded with retryImport: `lazyPanel(() => import("./x-panel").then((m) => m.XPanel))`. */
export function lazyPanel(load: () => Promise<ComponentType>): LazyPanel {
  return lazy(() => retryImport(load).then((component) => ({ default: component })));
}

export type KeptMountedTabPanelsProps<T extends string> = {
  tabs: readonly T[]
  /** Active tab; null (router not ready) renders every panel empty and hidden. */
  active: T | null
  panels: Record<T, LazyPanel>
  /** Suspense fallback while a panel chunk loads. */
  fallback: (tab: T) => ReactNode
  panelId: (tab: T) => string
  tabId: (tab: T) => string
  panelClassName?: string
};

export function KeptMountedTabPanels<T extends string>({
  tabs,
  active,
  panels,
  fallback,
  panelId,
  tabId,
  panelClassName,
}: KeptMountedTabPanelsProps<T>) {
  // Tabs visited at least once: their panel is mounted and stays mounted (hidden) afterwards.
  const [visited, setVisited] = useState<readonly T[]>([]);

  if (active !== null && !visited.includes(active)) {
    setVisited([...visited, active]);
  }

  return tabs.map((key) => {
    const Panel: LazyPanel = panels[key];

    return (
      <section
        key={key}
        id={panelId(key)}
        role="tabpanel"
        aria-labelledby={tabId(key)}
        hidden={active !== key}
        className={panelClassName}
      >
        {visited.includes(key) ? (
          <RouteErrorBoundary>
            <Suspense fallback={fallback(key)}>
              <Panel />
            </Suspense>
          </RouteErrorBoundary>
        ) : null}
      </section>
    );
  });
}

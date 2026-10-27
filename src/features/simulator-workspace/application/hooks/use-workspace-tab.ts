/*
* Funcionalidad: useWorkspaceTab
* Descripción: Active tab of the /simulador workspace, owned by the URL (`?tab=simular | monitoreo | conexion |
*   sesiones`, DISENO_BLOQUE1 §2.4 and §2.8). The query is read only once the router is ready (null before, so the
*   default tab never flashes); a missing or unknown value gives "monitoreo". Selecting a tab is a shallow
*   `router.replace` that keeps the rest of the query (e.g. `?session=`), so the page and its panels never remount.
*   Depends on next/router and the workspace tab entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useCallback } from "react";
import { parseWorkspaceTab } from "../entities/workspace-tab.entity";
import type { WorkspaceTab } from "../entities/workspace-tab.entity";

export type UseWorkspaceTabResult = {
  /** null until the router is ready. */
  tab: WorkspaceTab | null
  selectTab: (tab: WorkspaceTab) => void
};

export function useWorkspaceTab(): UseWorkspaceTabResult {
  const router = useRouter();
  const tab = router.isReady ? parseWorkspaceTab(router.query.tab) : null;

  const selectTab = useCallback((next: WorkspaceTab) => {
    void router.replace({ pathname: router.pathname, query: { ...router.query, tab: next } }, undefined, { shallow: true });
  }, [router]);

  return { tab, selectTab };
}

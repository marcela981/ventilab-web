/*
* Funcionalidad: useWorkspaceTab
* Descripción: Active tab of the /simulador workspace, owned by the URL (`?tab=simular | monitoreo | conexion |
*   sesiones`, DISENO_BLOQUE1 §2.4 and §2.8). The query is read only once the router is ready (null before, so the
*   default tab never flashes); a missing or unknown value gives "monitoreo". Selecting a tab is a shallow
*   `router.replace` that keeps the rest of the query (e.g. `?session=`), so the page and its panels never remount.
*   v0.2 (W1, Bloque 2): thin wrapper over the shared useUrlTab. Depends on @shared/lib/use-url-tab and the workspace
*   tab entity.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useUrlTab } from "@shared/lib/use-url-tab";
import type { UseUrlTabResult } from "@shared/lib/use-url-tab";
import { DEFAULT_WORKSPACE_TAB, WORKSPACE_TABS } from "../entities/workspace-tab.entity";
import type { WorkspaceTab } from "../entities/workspace-tab.entity";

export function useWorkspaceTab(): UseUrlTabResult<WorkspaceTab> {
  return useUrlTab(WORKSPACE_TABS, DEFAULT_WORKSPACE_TAB);
}

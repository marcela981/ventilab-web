/*
* Funcionalidad: Simulator workspace tabs
* Descripción: Tab keys of the unified simulator workspace (/simulador?tab=simular | monitoreo | conexion | sesiones) and the parser of the `tab` query value: a missing, repeated or unknown value falls back to "monitoreo" (DISENO_BLOQUE1 §2.8). No dependencies.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const WORKSPACE_TABS = ["simular", "monitoreo", "conexion", "sesiones"] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

export const DEFAULT_WORKSPACE_TAB: WorkspaceTab = "monitoreo";

function isWorkspaceTab(value: string): value is WorkspaceTab {
  return (WORKSPACE_TABS as readonly string[]).includes(value);
}

/** Tab of a Next query value (`router.query.tab`); anything but one known key gives the default tab. */
export function parseWorkspaceTab(value: string | string[] | undefined): WorkspaceTab {
  return typeof value === "string" && isWorkspaceTab(value) ? value : DEFAULT_WORKSPACE_TAB;
}

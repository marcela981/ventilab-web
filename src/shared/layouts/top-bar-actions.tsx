/*
* Funcionalidad: Top bar actions slot
* Descripción: Generic slot for extra actions of the shells. The composition root (pages/_app.js) mounts TopBarActionsProvider with the action elements a feature contributes (for example the AI assistant launcher), and the shells render them through useTopBarActions, so the shared layer never imports a feature. Without a provider there are no actions, so layouts and tests work unchanged. Depends on React. v1.1 (Bloque 5, D10): the actions no longer live only in a top bar: on desktop the shells put them in the "Herramientas" row of the sidebar and below 900px in the thin mobile bar. ShellActionsPlacementProvider tells the actions where they are (useShellActionsPlacement(): "sidebar" | "topbar", "topbar" without a provider) so a popover can open towards the content (the notifications bell opens to the right and upwards from the sidebar), and which surface scope their portals must carry (useShellActionsSurface(): "panel" inside the PanelShell, undefined elsewhere; MUI portals render in <body>, outside the data-surface of the shell).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

const TopBarActionsContext = createContext<ReactNode>(null);

export type TopBarActionsProviderProps = {
  // Elements rendered by the shells as tools; each one decides by itself whether it is visible.
  actions: ReactNode
  children: ReactNode
};

export function TopBarActionsProvider({ actions, children }: TopBarActionsProviderProps) {
  return <TopBarActionsContext.Provider value={actions}>{children}</TopBarActionsContext.Provider>;
}

// The registered shell actions; null without a provider.
export function useTopBarActions(): ReactNode {
  return useContext(TopBarActionsContext);
}

export type ShellActionsPlacement = "sidebar" | "topbar";
export type ShellSurface = "panel";

type PlacementValue = {
  placement: ShellActionsPlacement
  surface: ShellSurface | undefined
};

const DEFAULT_PLACEMENT: PlacementValue = { placement: "topbar", surface: undefined };
const ShellActionsPlacementContext = createContext<PlacementValue>(DEFAULT_PLACEMENT);

export type ShellActionsPlacementProviderProps = {
  placement: ShellActionsPlacement
  surface?: ShellSurface
  children: ReactNode
};

export function ShellActionsPlacementProvider({ placement, surface, children }: ShellActionsPlacementProviderProps) {
  const value = useMemo(() => ({ placement, surface }), [placement, surface]);

  return <ShellActionsPlacementContext.Provider value={value}>{children}</ShellActionsPlacementContext.Provider>;
}

// Where the shell rendered the actions: the sidebar tools row or a top bar ("topbar" without a provider).
export function useShellActionsPlacement(): ShellActionsPlacement {
  return useContext(ShellActionsPlacementContext).placement;
}

// The surface scope the actions' portals must carry ("panel" inside the PanelShell).
export function useShellActionsSurface(): ShellSurface | undefined {
  return useContext(ShellActionsPlacementContext).surface;
}

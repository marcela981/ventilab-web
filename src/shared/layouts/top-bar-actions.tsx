/*
* Funcionalidad: Top bar actions slot
* Descripción: Generic slot for extra actions in the AppShell top bar (between the realtime status chip and the user menu). The composition root (pages/_app.js) mounts TopBarActionsProvider with the action elements a feature contributes (for example the AI assistant launcher), and the AppShell renders them through useTopBarActions, so the shared layer never imports a feature. Without a provider there are no actions, so layouts and tests work unchanged. Depends on React.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const TopBarActionsContext = createContext<ReactNode>(null);

export type TopBarActionsProviderProps = {
  // Elements rendered in the AppShell top bar; each one decides by itself whether it is visible.
  actions: ReactNode
  children: ReactNode
};

export function TopBarActionsProvider({ actions, children }: TopBarActionsProviderProps) {
  return <TopBarActionsContext.Provider value={actions}>{children}</TopBarActionsContext.Provider>;
}

// The registered top bar actions; null without a provider.
export function useTopBarActions(): ReactNode {
  return useContext(TopBarActionsContext);
}

/*
* Funcionalidad: Grading workspace context
* Descripción: The evaluation of the unified grading screen, shared with its lazy tab panels (KeptMountedTabPanels renders panels without props). useGradingWorkspace throws outside the screen. Depends on React.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useContext } from "react";

export type GradingWorkspace = {
  evaluationId: string
};

export const GradingWorkspaceContext = createContext<GradingWorkspace | null>(null);

export function useGradingWorkspace(): GradingWorkspace {
  const value = useContext(GradingWorkspaceContext);

  if (!value) {
    throw new Error("useGradingWorkspace must be used inside the grading screen");
  }

  return value;
}

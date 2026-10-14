/*
* Funcionalidad: useSidePanelState
* Descripción: Collapsed/expanded state of the lesson side panel (Notas | Profundizar | Preguntas) on desktop. It is a per-viewer convenience persisted in localStorage and read through useSyncExternalStore (the server snapshot is "expanded", so the server render and hydration match). Every storage read and write is wrapped in try/catch (private mode, blocked storage): when storage is unavailable an in-memory value keeps the state for the visit. Depends on react.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useSyncExternalStore } from "react";

export const SIDE_PANEL_STORAGE_KEY = "vl-learning-side-panel-collapsed";

const listeners = new Set<() => void>();
// Used only when localStorage throws.
let memoryCollapsed = false;

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDE_PANEL_STORAGE_KEY) === "1";
  } catch {
    return memoryCollapsed;
  }
}

function writeCollapsed(collapsed: boolean): void {
  memoryCollapsed = collapsed;

  try {
    window.localStorage.setItem(SIDE_PANEL_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Storage unavailable: the in-memory value keeps the state for this visit.
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot = (): boolean => false;

export type SidePanelState = {
  collapsed: boolean
  toggle: () => void
};

export function useSidePanelState(): SidePanelState {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, serverSnapshot);

  const toggle = useCallback(() => {
    writeCollapsed(!readCollapsed());
  }, []);

  return { collapsed, toggle };
}

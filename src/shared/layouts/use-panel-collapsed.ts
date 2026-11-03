/*
* Funcionalidad: usePanelCollapsed
* Descripción: Collapsed state of the staff panel side menu, kept in localStorage ("ventylab.panel.collapsed" = "1"; absent = expanded) through a small useSyncExternalStore store (the pattern of learning's edit-mode-store): the server snapshot is expanded, the client reads the stored value when the first subscriber arrives and other tabs follow through the `storage` event (a change made while nothing was mounted is picked up on the next mount). Every storage access is inside try/catch (private mode, blocked storage or a quota error keep the in-memory state). Depends on React.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useSyncExternalStore } from "react";

export const PANEL_COLLAPSED_STORAGE_KEY = "ventylab.panel.collapsed";

const listeners = new Set<() => void>();
// null: not read from storage yet.
let current: boolean | null = null;

function readStorage(): boolean {
  try {
    return window.localStorage.getItem(PANEL_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getSnapshot(): boolean {
  current ??= readStorage();

  return current;
}

function getServerSnapshot(): boolean {
  return false;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent): void {
  if (event.key === PANEL_COLLAPSED_STORAGE_KEY) {
    current = null;
    notify();
  }
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    // Nobody listened to `storage` meanwhile: read it again.
    current = null;
    window.addEventListener("storage", onStorage);
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function setCollapsed(collapsed: boolean): void {
  current = collapsed;

  try {
    if (collapsed) {
      window.localStorage.setItem(PANEL_COLLAPSED_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(PANEL_COLLAPSED_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable: the state only lives in memory.
  }

  notify();
}

export function usePanelCollapsed(): [collapsed: boolean, toggle: () => void] {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => setCollapsed(!getSnapshot()), []);

  return [collapsed, toggle];
}

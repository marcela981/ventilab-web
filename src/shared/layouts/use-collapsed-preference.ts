/*
* Funcionalidad: Collapsed side menu preferences
* Descripción: Collapsed state of a side menu, kept in localStorage (key = "1"; absent = expanded) through a small useSyncExternalStore store (the pattern of learning's edit-mode-store): the server snapshot is expanded, the client reads the stored value when the first subscriber arrives and other tabs follow through the `storage` event (a change made while nothing was mounted is picked up on the next mount). Every storage access is inside try/catch (private mode, blocked storage or a quota error keep the in-memory state). Depends on React. v1.2 (Bloque 5, D13): generalized from usePanelCollapsed (use-panel-collapsed.ts) into the createCollapsedPreference(key) factory, one independent store per key: usePanelCollapsed keeps "ventylab.panel.collapsed" and the global sidebar gets useSidebarCollapsed with "ventylab.sidebar.collapsed" (separate keys: the widths differ, 260/72 and 240/64).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useSyncExternalStore } from "react";

export const PANEL_COLLAPSED_STORAGE_KEY = "ventylab.panel.collapsed";
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "ventylab.sidebar.collapsed";

export type CollapsedPreferenceHook = () => [collapsed: boolean, toggle: () => void];

function getServerSnapshot(): boolean {
  return false;
}

// One store per storage key: its own listeners, cached value and `storage` subscription.
export function createCollapsedPreference(storageKey: string): CollapsedPreferenceHook {
  const listeners = new Set<() => void>();
  // null: not read from storage yet.
  let current: boolean | null = null;

  function readStorage(): boolean {
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  }

  function getSnapshot(): boolean {
    current ??= readStorage();

    return current;
  }

  function notify(): void {
    listeners.forEach((listener) => listener());
  }

  function onStorage(event: StorageEvent): void {
    if (event.key === storageKey) {
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
        window.localStorage.setItem(storageKey, "1");
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      // Storage unavailable: the state only lives in memory.
    }

    notify();
  }

  return function useCollapsedPreference() {
    const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const toggle = useCallback(() => setCollapsed(!getSnapshot()), []);

    return [collapsed, toggle];
  };
}

// Staff panel side menu (PanelShell).
export const usePanelCollapsed = createCollapsedPreference(PANEL_COLLAPSED_STORAGE_KEY);

// Global sidebar (AppShell).
export const useSidebarCollapsed = createCollapsedPreference(SIDEBAR_COLLAPSED_STORAGE_KEY);

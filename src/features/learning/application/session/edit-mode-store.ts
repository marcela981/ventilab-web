/*
* Funcionalidad: Learning edit mode store
* Descripción: Tiny store of the staff "Modo edición" of /learn (W4, Bloque 2; DISENO_BLOQUE2 §2.13, July EditModeToggle): one boolean persisted in localStorage (`learning.editMode.v1`; every read and write in try/catch, so a blocked storage only loses the persistence) and read with useSyncExternalStore (server snapshot: off). A change in another tab (`storage` event) is picked up. While on, the Currículo tab shows "Editar en el CMS" links on levels and modules. Only staff render the toggle. Depends on React.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useSyncExternalStore } from "react";

export const EDIT_MODE_STORAGE_KEY = "learning.editMode.v1";

const listeners = new Set<() => void>();
// null: not read from storage yet.
let current: boolean | null = null;

function readStorage(): boolean {
  try {
    return window.localStorage.getItem(EDIT_MODE_STORAGE_KEY) === "1";
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
  if (event.key === EDIT_MODE_STORAGE_KEY) {
    current = null;
    notify();
  }
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
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

export function setEditMode(enabled: boolean): void {
  current = enabled;

  try {
    if (enabled) {
      window.localStorage.setItem(EDIT_MODE_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(EDIT_MODE_STORAGE_KEY);
    }
  } catch {
    // Storage blocked: the mode still applies to this page view.
  }

  notify();
}

/** Forgets the cached value (tests). */
export function resetEditModeStore(): void {
  current = null;
  notify();
}

export type EditMode = {
  enabled: boolean
  toggle: () => void
};

export function useEditMode(): EditMode {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, () => false);

  return { enabled, toggle: () => setEditMode(!getSnapshot()) };
}

/*
* Funcionalidad: useMonitorCardsPref
* Descripción: The per-user preference of the July value cards as a MonitorCardsController for the console (`cards` prop of VentilatorConsole layout="july"): one external store per storage key `ventylab.monitor.cards.v1.<userId>` (the pattern of use-collapsed-preference: lazy read on the first snapshot, `storage` event from other tabs, every localStorage access inside try/catch with the defaults as fallback), normalized by normalizeCardsPref. It writes only on user actions (setLayout after a drop or a click; reset removes the key) and never per frame; a stored preference of a newer version is applied as defaults and never overwritten. Without a user id (no session) the preference lives in memory only. The controller identity is stable per user, so passing it to the console never re-renders it. One preference for Digital and Real (D27). v0.1 (Bloque 5, C5): first version. Depends on React, the ventilator-console card contract and the preference entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useState } from "react";
import { createMemoryCardsController, DEFAULT_CARDS_LAYOUT } from "@shared/ventilator-console";
import type { MonitorCardsController, MonitorCardsLayout } from "@shared/ventilator-console";
import { layoutToPref, monitorCardsStorageKey, normalizeCardsPref, prefToLayout } from "../entities/monitor-cards-pref.entity";

type StoredState = { layout: MonitorCardsLayout, writable: boolean };

const DEFAULT_STATE: StoredState = { layout: DEFAULT_CARDS_LAYOUT, writable: true };

function readStorage(key: string): StoredState {
  try {
    const raw = window.localStorage.getItem(key);

    if (raw === null) {
      return DEFAULT_STATE;
    }

    const { pref, writable } = normalizeCardsPref(raw);

    return { layout: prefToLayout(pref), writable };
  } catch {
    return DEFAULT_STATE;
  }
}

/** One persisted controller per storage key (its listeners, cached value and `storage` subscription). */
export function createPersistedCardsController(key: string): MonitorCardsController {
  const listeners = new Set<() => void>();
  // null: not read from storage yet.
  let current: StoredState | null = null;

  const read = (): StoredState => {
    current ??= readStorage(key);

    return current;
  };
  const notify = (): void => listeners.forEach((listener) => listener());
  // Re-reads the storage and keeps the same snapshot when the content did not change (no needless re-render).
  const refresh = (): boolean => {
    const fresh = readStorage(key);

    if (current !== null && JSON.stringify(current) === JSON.stringify(fresh)) {
      return false;
    }

    current = fresh;

    return true;
  };
  const onStorage = (event: StorageEvent): void => {
    if (event.key === key && refresh()) {
      notify();
    }
  };

  return {
    subscribe(listener) {
      if (listeners.size === 0) {
        // Nobody listened to `storage` meanwhile: read it again (useSyncExternalStore re-checks the snapshot).
        refresh();
        window.addEventListener("storage", onStorage);
      }

      listeners.add(listener);

      return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
    getSnapshot: () => read().layout,
    setLayout(layout) {
      const { writable } = read();
      const pref = layoutToPref(layout);

      current = { layout: prefToLayout(pref), writable };

      if (writable) {
        try {
          window.localStorage.setItem(key, JSON.stringify(pref));
        } catch {
          // Storage unavailable or full: the preference only lives in memory.
        }
      }

      notify();
    },
    reset() {
      const { writable } = read();

      current = { layout: DEFAULT_CARDS_LAYOUT, writable };

      if (writable) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Storage unavailable: nothing to remove.
        }
      }

      notify();
    },
  };
}

const persisted = new Map<string, MonitorCardsController>();

/** The persisted controller of a user (stable identity per user for the whole app). */
export function monitorCardsPrefFor(userId: string): MonitorCardsController {
  const key = monitorCardsStorageKey(userId);
  let controller = persisted.get(key);

  if (controller === undefined) {
    controller = createPersistedCardsController(key);
    persisted.set(key, controller);
  }

  return controller;
}

/** The value cards preference of the signed-in user; in memory without a user id. */
export function useMonitorCardsPref(userId: string | null | undefined): MonitorCardsController {
  const [memory] = useState(createMemoryCardsController);

  return userId ? monitorCardsPrefFor(userId) : memory;
}

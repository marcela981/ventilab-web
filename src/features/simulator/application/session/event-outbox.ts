/*
* Funcionalidad: Simulation event outbox mirror
* Descripción: Mirrors the events of a session that the server has not acknowledged yet to sessionStorage, under one
*   key per session (`ventylab.simulator.outbox.<id>`), so a reload or a closed tab does not lose them: at the next
*   boot they are re-enqueued (the ones the server already stored are skipped by id). It is a per-viewer convenience:
*   every storage access is wrapped in try/catch (private windows, blocked storage, quota) and each stored event is
*   validated before use, so the console works without it. Depends on the session entities and the console config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { EVENT_OUTBOX_STORAGE_PREFIX } from "../config/sim-console.config";
import type { ClientSessionEvent } from "../entities/sim-session.entity";
import type { StorageLike } from "./session-store";

export type EventOutbox = {
  /** Replaces the mirrored events of the session; an empty list removes the entry. */
  save: (sessionId: string, events: readonly ClientSessionEvent[]) => void
  read: (sessionId: string) => ClientSessionEvent[]
  clear: (sessionId: string) => void
};

function browserSessionStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function isClientEvent(value: unknown): value is ClientSessionEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<ClientSessionEvent>;
  const changes: unknown = (candidate.payload as { changes?: unknown } | undefined)?.changes;

  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    candidate.type === "PARAM_CHANGE" &&
    typeof candidate.simTimeMs === "number" &&
    Number.isFinite(candidate.simTimeMs) &&
    candidate.simTimeMs >= 0 &&
    typeof changes === "object" &&
    changes !== null &&
    !Array.isArray(changes)
  );
}

export function createEventOutbox(getStorage: () => StorageLike | null = browserSessionStorage): EventOutbox {
  const keyOf = (sessionId: string): string => `${EVENT_OUTBOX_STORAGE_PREFIX}${sessionId}`;

  return {
    save(sessionId, events) {
      try {
        if (events.length === 0) {
          getStorage()?.removeItem(keyOf(sessionId));
        } else {
          getStorage()?.setItem(keyOf(sessionId), JSON.stringify(events));
        }
      } catch {
        // The queue in memory still holds the events; only a reload would lose them.
      }
    },
    read(sessionId) {
      try {
        const raw = getStorage()?.getItem(keyOf(sessionId)) ?? null;
        const value: unknown = raw === null ? [] : JSON.parse(raw);

        return Array.isArray(value) ? value.filter(isClientEvent) : [];
      } catch {
        return [];
      }
    },
    clear(sessionId) {
      try {
        getStorage()?.removeItem(keyOf(sessionId));
      } catch {
        // A stale entry is harmless: the server skips stored ids and the session has ended.
      }
    },
  };
}

/** The outbox shared by the bootstrap and the console of this tab. */
export const eventOutbox: EventOutbox = createEventOutbox();

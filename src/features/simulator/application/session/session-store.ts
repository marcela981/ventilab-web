/*
* Funcionalidad: Simulation session store
* Descripción: Small in-memory store of started simulation sessions (start response + mode + clinical case id),
*   mirrored to sessionStorage under one key per session (`ventylab.simulator.session.<id>`) so the same tab can
*   resume after a reload without asking the server for the seed and the case. It is a per-viewer convenience only:
*   every storage read and write is wrapped in try/catch (private windows, blocked storage, quota) and a stored value
*   is checked before use, so the console works without it. Depends on the session entities and the console config.
*   v1.1: the record keeps the session `startedAt` (null for entries stored before it existed). v1.2 (T9): the
*   record keeps the validated exam context of an EXAM session (dropped when malformed). v1.3 (W6, Bloque 1): the
*   record keeps the validated own patient of a FREE session (dropped when malformed).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { SESSION_STORAGE_PREFIX } from "../config/sim-console.config";
import { SIMULATION_MODE_LABELS } from "../config/simulator.config";
import { parseExamContext } from "../entities/sim-exam.entity";
import { parseSessionPatient } from "../entities/sim-patient.entity";
import { isEngineCase, toTimeMultiplier } from "../entities/sim-session.entity";
import type { SessionRecord } from "../entities/sim-session.entity";

/** The subset of the Web Storage API the store needs. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SessionStore = {
  save: (record: SessionRecord) => void
  read: (sessionId: string) => SessionRecord | null
  forget: (sessionId: string) => void
};

function browserSessionStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function parseRecord(raw: string | null, sessionId: string): SessionRecord | null {
  if (raw === null) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);

    if (typeof value !== "object" || value === null) {
      return null;
    }

    const candidate = value as Partial<SessionRecord>;
    const validMode = typeof candidate.mode === "string" && Object.prototype.hasOwnProperty.call(SIMULATION_MODE_LABELS, candidate.mode);

    if (
      candidate.id !== sessionId ||
      !validMode ||
      typeof candidate.seed !== "number" ||
      typeof candidate.engineVersion !== "string" ||
      typeof candidate.caseId !== "string" ||
      !isEngineCase(candidate.engineCase)
    ) {
      return null;
    }

    const exam = parseExamContext(candidate.exam);
    const patient = parseSessionPatient(candidate.patient);

    return {
      id: candidate.id,
      mode: candidate.mode as SessionRecord["mode"],
      seed: candidate.seed,
      engineVersion: candidate.engineVersion,
      timeMultiplier: toTimeMultiplier(candidate.timeMultiplier),
      expiresAt: typeof candidate.expiresAt === "string" ? candidate.expiresAt : null,
      startedAt: typeof candidate.startedAt === "string" ? candidate.startedAt : null,
      engineCase: candidate.engineCase,
      caseId: candidate.caseId,
      fresh: candidate.fresh === true,
      ...(exam ? { exam } : {}),
      ...(patient ? { patient } : {}),
    };
  } catch {
    return null;
  }
}

/** `getStorage` is called on every access, so a storage that throws or disappears never breaks the store. */
export function createSessionStore(getStorage: () => StorageLike | null = browserSessionStorage): SessionStore {
  const memory = new Map<string, SessionRecord>();
  const keyOf = (sessionId: string): string => `${SESSION_STORAGE_PREFIX}${sessionId}`;

  return {
    save(record) {
      memory.set(record.id, record);

      try {
        getStorage()?.setItem(keyOf(record.id), JSON.stringify(record));
      } catch {
        // The in-memory copy still serves this page; a reload falls back to the server.
      }
    },
    read(sessionId) {
      const cached = memory.get(sessionId);

      if (cached) {
        return cached;
      }

      let raw: string | null = null;

      try {
        raw = getStorage()?.getItem(keyOf(sessionId)) ?? null;
      } catch {
        return null;
      }

      const record = parseRecord(raw, sessionId);

      if (record) {
        memory.set(sessionId, record);
      }

      return record;
    },
    forget(sessionId) {
      memory.delete(sessionId);

      try {
        getStorage()?.removeItem(keyOf(sessionId));
      } catch {
        // Nothing else to clean; a stale entry is ignored once the session has ended.
      }
    },
  };
}

/** The store shared by the start flow and the console of this tab. */
export const sessionStore: SessionStore = createSessionStore();

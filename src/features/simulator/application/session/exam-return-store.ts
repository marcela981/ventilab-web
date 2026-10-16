/*
* Funcionalidad: Exam return store
* Descripción: sessionStorage record of where a simulation session started from an exam must return to: the exam
*   attempt (evaluation id + attempt id) of the practical question. The exam flow (T9) saves it when it starts the
*   session; the result page reads it for "Volver al examen". The session data (history DTO) carries the attempt id
*   but not the evaluation id the attempt route needs, so without this record the result page links to the
*   evaluations list. Every storage access is wrapped in try/catch and stored values are validated. Depends on the
*   result config and the session store storage type.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { EXAM_RETURN_STORAGE_PREFIX } from "../config/sim-result.config";
import type { StorageLike } from "./session-store";

export type ExamReturn = {
  evaluationId: string
  attemptId: string
};

export type ExamReturnStore = {
  save: (sessionId: string, target: ExamReturn) => void
  read: (sessionId: string) => ExamReturn | null
  forget: (sessionId: string) => void
};

function browserSessionStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parse(raw: string | null): ExamReturn | null {
  if (raw === null) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);

    if (typeof value !== "object" || value === null) {
      return null;
    }

    const { evaluationId, attemptId } = value as Partial<Record<keyof ExamReturn, unknown>>;

    return isNonEmpty(evaluationId) && isNonEmpty(attemptId) ? { evaluationId, attemptId } : null;
  } catch {
    return null;
  }
}

export function createExamReturnStore(getStorage: () => StorageLike | null = browserSessionStorage): ExamReturnStore {
  const keyOf = (sessionId: string): string => `${EXAM_RETURN_STORAGE_PREFIX}${sessionId}`;

  return {
    save(sessionId, target) {
      try {
        getStorage()?.setItem(keyOf(sessionId), JSON.stringify(target));
      } catch {
        // Without storage the result page falls back to the evaluations list.
      }
    },
    read(sessionId) {
      try {
        return parse(getStorage()?.getItem(keyOf(sessionId)) ?? null);
      } catch {
        return null;
      }
    },
    forget(sessionId) {
      try {
        getStorage()?.removeItem(keyOf(sessionId));
      } catch {
        // A stale entry only points back to a finished attempt.
      }
    },
  };
}

export const examReturnStore: ExamReturnStore = createExamReturnStore();

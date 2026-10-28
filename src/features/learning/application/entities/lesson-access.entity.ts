/*
* Funcionalidad: Lesson access entity
* Descripción: Pure rules of the mandatory lesson order in the viewer (W5, Bloque 2; DISENO_BLOQUE2 §2.6). lessonLockFromError reads the server decision out of a 403 `progress.lesson_locked` (GET /api/pages/{id} or the page view), whose data carries { reason, missing }. buildLessonIndex derives the module lesson index: lessons without published Pages are left out (they never block, as on the server), completed lessons and the current one are open, the first lesson after an unbroken run of completed lessons is open (the next one to study) and every later incomplete lesson is locked and not navigable. While the module progress is unknown (null) the lessons up to the current one are open and the later ones locked. Staff (preview) see every lesson open. The server enforces the same order; this is only the UI state. Depends on the api-client error type and the lesson entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isApiError } from "@shared/api-client/api-error";
import type { LessonLock, LessonSummary, MissingLesson } from "./lesson.entity";

export const LESSON_LOCKED_ERROR_CODE = "progress.lesson_locked";

function toMissing(value: unknown): MissingLesson[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item: unknown) => {
    const { lessonId, title } = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;

    return typeof lessonId === "string" && typeof title === "string" ? [{ lessonId, title }] : [];
  });
}

/** The lock carried by a 403 progress.lesson_locked, or null for any other error. */
export function lessonLockFromError(error: unknown): LessonLock | null {
  if (!isApiError(error) || error.status !== 403 || error.code !== LESSON_LOCKED_ERROR_CODE) {
    return null;
  }

  const details = (typeof error.details === "object" && error.details !== null ? error.details : {}) as Record<string, unknown>;

  return {
    reason: details.reason === "module_locked" ? "module_locked" : "previous_lesson_incomplete",
    missing: toMissing(details.missing),
  };
}

export type LessonIndexEntry = {
  id: string
  title: string
  completed: boolean
  current: boolean
  locked: boolean
};

export type LessonIndexInput = {
  lessons: LessonSummary[]
  // null while the module progress loads.
  completedLessonIds: ReadonlySet<string> | null
  currentLessonId: string
  preview: boolean
};

export function buildLessonIndex({ lessons, completedLessonIds, currentLessonId, preview }: LessonIndexInput): LessonIndexEntry[] {
  const visible = lessons.filter((lesson) => lesson.pageCount > 0);
  const currentIndex = visible.findIndex((lesson) => lesson.id === currentLessonId);
  let previousCompleted = true;

  return visible
    .map((lesson, index) => {
      const completed = completedLessonIds?.has(lesson.id) ?? false;
      const current = index === currentIndex;
      const reachable = completedLessonIds === null ? index <= currentIndex : previousCompleted;
      const open = preview || completed || current || reachable;

      previousCompleted = previousCompleted && completed;

      return { id: lesson.id, title: lesson.title, completed, current, locked: !open };
    });
}

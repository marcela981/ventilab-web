/*
* Funcionalidad: Lesson access entity tests
* Descripción: Unit tests of the mandatory lesson order rules of the viewer: the 403 progress.lesson_locked parser (reason and missing lessons, other errors ignored) and the module lesson index (later incomplete lessons locked, completed and current open, lessons without Pages left out, unknown progress, staff preview). Depends on vitest and the api-client error.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { buildLessonIndex, lessonLockFromError } from "./lesson-access.entity";
import type { LessonSummary } from "./lesson.entity";

const lesson = (id: string, order: number, pageCount = 2): LessonSummary => ({ id, title: `Lección ${id}`, order, pageCount });
const LESSONS = [lesson("l1", 1), lesson("empty", 2, 0), lesson("l2", 3), lesson("l3", 4), lesson("l4", 5)];

describe("lessonLockFromError", () => {
  it("reads the reason and the missing lessons of a 403 progress.lesson_locked", () => {
    const error = new ApiError({
      code: "progress.lesson_locked",
      message: "locked",
      status: 403,
      details: { reason: "previous_lesson_incomplete", missing: [{ lessonId: "l1", title: "Uno" }, { bad: true }] },
    });

    expect(lessonLockFromError(error)).toEqual({ reason: "previous_lesson_incomplete", missing: [{ lessonId: "l1", title: "Uno" }] });
  });

  it("ignores any other error", () => {
    expect(lessonLockFromError(new ApiError({ code: "auth.forbidden", message: "x", status: 403 }))).toBeNull();
    expect(lessonLockFromError(new ApiError({ code: "progress.lesson_locked", message: "x", status: 500 }))).toBeNull();
    expect(lessonLockFromError(null)).toBeNull();
  });
});

describe("buildLessonIndex", () => {
  const locks = (entries: ReturnType<typeof buildLessonIndex>) => entries.map((entry) => `${entry.id}:${entry.locked ? "locked" : "open"}`);

  it("locks every incomplete lesson after the next one to study and leaves lessons without Pages out", () => {
    const entries = buildLessonIndex({ lessons: LESSONS, completedLessonIds: new Set(["l1"]), currentLessonId: "l2", preview: false });

    expect(locks(entries)).toEqual(["l1:open", "l2:open", "l3:locked", "l4:locked"]);
    expect(entries.find((entry) => entry.current)?.id).toBe("l2");
    expect(entries[0]?.completed).toBe(true);
  });

  it("opens the lesson that follows the completed ones even when the student is on an earlier one", () => {
    const entries = buildLessonIndex({ lessons: LESSONS, completedLessonIds: new Set(["l1", "l2"]), currentLessonId: "l1", preview: false });

    expect(locks(entries)).toEqual(["l1:open", "l2:open", "l3:open", "l4:locked"]);
  });

  it("opens only the lessons up to the current one while the progress loads", () => {
    const entries = buildLessonIndex({ lessons: LESSONS, completedLessonIds: null, currentLessonId: "l2", preview: false });

    expect(locks(entries)).toEqual(["l1:open", "l2:open", "l3:locked", "l4:locked"]);
  });

  it("opens everything for staff", () => {
    const entries = buildLessonIndex({ lessons: LESSONS, completedLessonIds: null, currentLessonId: "l1", preview: true });

    expect(entries.every((entry) => !entry.locked)).toBe(true);
  });
});

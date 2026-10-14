/*
* Funcionalidad: Lesson navigation tests
* Descripción: Unit tests of the viewer Previous/Next rules derived only from the URL position, the ordered module lessons and the real page count of the current lesson: next inside the lesson, next across lessons (first page), previous across lessons (last page by the lesson pageCount), no previous on the first page of the module, module completion after the last page, lessons with 0 Pages skipped, unknown lesson; and the redirect of an invalid pageNumber (page 1 when not an integer, last page when out of range). Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { LessonSummary } from "./lesson.entity";
import { findNextStep, findPreviousStep, resolvePageRedirect } from "./lesson-navigation";

const lesson = (id: string, order: number, pageCount: number): LessonSummary => ({ id, title: id, order, pageCount });

// l1 (2 Pages), empty (0 Pages), l2 (3 Pages), l3 (1 Page).
const lessons = [lesson("l1", 1, 2), lesson("empty", 2, 0), lesson("l2", 3, 3), lesson("l3", 4, 1)];

describe("findNextStep", () => {
  it("moves to the next Page inside the lesson", () => {
    expect(findNextStep(lessons, { lessonId: "l1", pageNumber: 1 }, 2)).toEqual({ kind: "page", lessonId: "l1", pageNumber: 2 });
  });

  it("crosses to the first Page of the next lesson with Pages, skipping empty lessons", () => {
    expect(findNextStep(lessons, { lessonId: "l1", pageNumber: 2 }, 2)).toEqual({ kind: "page", lessonId: "l2", pageNumber: 1 });
  });

  it("uses the real page count of the current lesson, not the list count", () => {
    expect(findNextStep(lessons, { lessonId: "l2", pageNumber: 3 }, 4)).toEqual({ kind: "page", lessonId: "l2", pageNumber: 4 });
    expect(findNextStep(lessons, { lessonId: "l2", pageNumber: 2 }, 2)).toEqual({ kind: "page", lessonId: "l3", pageNumber: 1 });
  });

  it("completes the module after the last Page of the last lesson", () => {
    expect(findNextStep(lessons, { lessonId: "l3", pageNumber: 1 }, 1)).toEqual({ kind: "complete" });
  });

  it("completes the module when only empty lessons follow", () => {
    expect(findNextStep([lesson("l1", 1, 1), lesson("empty", 2, 0)], { lessonId: "l1", pageNumber: 1 }, 1)).toEqual({ kind: "complete" });
  });

  it("returns null for a lesson outside the module", () => {
    expect(findNextStep(lessons, { lessonId: "ghost", pageNumber: 1 }, 1)).toBeNull();
  });
});

describe("findPreviousStep", () => {
  it("moves to the previous Page inside the lesson", () => {
    expect(findPreviousStep(lessons, { lessonId: "l2", pageNumber: 3 })).toEqual({ lessonId: "l2", pageNumber: 2 });
  });

  it("crosses to the last Page of the previous lesson with Pages, skipping empty lessons", () => {
    expect(findPreviousStep(lessons, { lessonId: "l2", pageNumber: 1 })).toEqual({ lessonId: "l1", pageNumber: 2 });
  });

  it("has no previous step on the first Page of the module", () => {
    expect(findPreviousStep(lessons, { lessonId: "l1", pageNumber: 1 })).toBeNull();
  });

  it("returns null for a lesson outside the module", () => {
    expect(findPreviousStep(lessons, { lessonId: "ghost", pageNumber: 1 })).toBeNull();
  });
});

describe("resolvePageRedirect", () => {
  it("keeps a valid pageNumber", () => {
    expect(resolvePageRedirect(1, 2)).toBeNull();
    expect(resolvePageRedirect(2, 2)).toBeNull();
  });

  it("sends an invalid pageNumber to the first Page", () => {
    expect(resolvePageRedirect(null, 2)).toBe(1);
  });

  it("sends an out-of-range pageNumber to the last Page", () => {
    expect(resolvePageRedirect(9, 2)).toBe(2);
  });

  it("never redirects inside a lesson without Pages", () => {
    expect(resolvePageRedirect(null, 0)).toBeNull();
    expect(resolvePageRedirect(3, 0)).toBeNull();
  });
});

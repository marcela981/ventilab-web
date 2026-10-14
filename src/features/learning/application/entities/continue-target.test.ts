/*
* Funcionalidad: Continue target tests
* Descripción: Unit tests of "Continuar donde quedé" inside a module: first lesson whose viewedPages < totalPages, at page viewedPages + 1 clamped to the real page count of the lesson (v1.1 L3: the lesson list count, not the progress total), finished-ness from the progress total, start at the first lesson without progress, review from the start when everything is viewed, lessons without Pages skipped. Depends on vitest.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { findContinueTarget } from "./continue-target";
import type { LessonSummary } from "./lesson.entity";

const lesson = (id: string, order: number, pageCount = 1): LessonSummary => ({ id, title: id, order, pageCount });
const progress = (lessonId: string, viewedPages: number, totalPages: number) => ({ lessonId, viewedPages, totalPages, completed: viewedPages >= totalPages });

describe("findContinueTarget", () => {
  const lessons = [lesson("l1", 1, 2), lesson("l2", 2, 3), lesson("l3", 3)];

  it("returns null when the module has no lessons", () => {
    expect(findContinueTarget([], null)).toBeNull();
  });

  it("starts at the first page of the first lesson when there is no progress", () => {
    expect(findContinueTarget(lessons, null)).toEqual({ lessonId: "l1", pageNumber: 1, kind: "start" });
    expect(findContinueTarget(lessons, [])).toEqual({ lessonId: "l1", pageNumber: 1, kind: "start" });
  });

  it("continues at the first unviewed page of the first unfinished lesson", () => {
    expect(findContinueTarget(lessons, [progress("l1", 2, 2), progress("l2", 1, 3)]))
      .toEqual({ lessonId: "l2", pageNumber: 2, kind: "continue" });
  });

  it("uses the lesson page count when a lesson has no progress entry yet", () => {
    expect(findContinueTarget(lessons, [progress("l1", 2, 2)])).toEqual({ lessonId: "l2", pageNumber: 1, kind: "continue" });
  });

  it("clamps the page to the real page count of the lesson", () => {
    // The progress total counts more Pages than the lesson really lists: never point past its last Page.
    expect(findContinueTarget([lesson("l1", 1, 2)], [{ lessonId: "l1", viewedPages: 3, totalPages: 4, completed: false }]))
      .toEqual({ lessonId: "l1", pageNumber: 2, kind: "continue" });
  });

  it("uses the progress total to decide whether a lesson is finished", () => {
    expect(findContinueTarget([lesson("l1", 1, 2), lesson("l2", 2)], [progress("l1", 1, 1)]))
      .toEqual({ lessonId: "l2", pageNumber: 1, kind: "continue" });
  });

  it("skips lessons that list no Pages even when the progress counts some", () => {
    expect(findContinueTarget([lesson("l1", 1, 0), lesson("l2", 2)], [progress("l1", 0, 2)]))
      .toEqual({ lessonId: "l2", pageNumber: 1, kind: "start" });
  });

  it("skips lessons without Pages", () => {
    expect(findContinueTarget([lesson("empty", 1, 0), lesson("l2", 2)], null)).toEqual({ lessonId: "l2", pageNumber: 1, kind: "start" });
  });

  it("offers a review from the start when every page was viewed", () => {
    expect(findContinueTarget(lessons, [progress("l1", 2, 2), progress("l2", 3, 3), progress("l3", 1, 1)]))
      .toEqual({ lessonId: "l1", pageNumber: 1, kind: "review" });
  });
});

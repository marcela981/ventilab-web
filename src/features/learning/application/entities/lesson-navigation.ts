/*
* Funcionalidad: Lesson navigation
* Descripción: Pure Previous/Next rules of the lesson viewer, derived ONLY from the URL position (lessonId + 1-based pageNumber), the ordered module lessons (`GET /api/modules/{id}/lessons`, with their pageCount) and the real page count of the current lesson (`GET /api/pages?lessonId=`). Next stays inside the lesson, then crosses to page 1 of the next lesson with Pages, and after the last Page of the module it is "complete". Previous stays inside the lesson, then crosses to the LAST page of the previous lesson with Pages using its list pageCount (no extra request; if that count is stale, the viewer clamps the out-of-range pageNumber to the real last Page with a redirect). Lessons with 0 Pages are skipped. A lesson outside the module yields null. resolvePageRedirect: an invalid pageNumber (null = not a canonical positive integer) goes to Page 1 and an out-of-range one to the last Page; a lesson without Pages never redirects (the viewer shows an empty state). No dependencies besides the lesson entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { LessonSummary } from "./lesson.entity";

export type PagePosition = {
  lessonId: string
  pageNumber: number
};

export type NextStep = ({ kind: "page" } & PagePosition) | { kind: "complete" };

export function findNextStep(lessons: LessonSummary[], current: PagePosition, currentPageCount: number): NextStep | null {
  const index = lessons.findIndex((lesson) => lesson.id === current.lessonId);

  if (index < 0) {
    return null;
  }

  if (current.pageNumber < currentPageCount) {
    return { kind: "page", lessonId: current.lessonId, pageNumber: current.pageNumber + 1 };
  }

  const next = lessons.slice(index + 1).find((lesson) => lesson.pageCount > 0);

  return next ? { kind: "page", lessonId: next.id, pageNumber: 1 } : { kind: "complete" };
}

export function findPreviousStep(lessons: LessonSummary[], current: PagePosition): PagePosition | null {
  const index = lessons.findIndex((lesson) => lesson.id === current.lessonId);

  if (index < 0) {
    return null;
  }

  if (current.pageNumber > 1) {
    return { lessonId: current.lessonId, pageNumber: current.pageNumber - 1 };
  }

  const previous = lessons.slice(0, index).reverse().find((lesson) => lesson.pageCount > 0);

  return previous ? { lessonId: previous.id, pageNumber: previous.pageCount } : null;
}

// Target pageNumber for router.replace, or null when the URL is already valid (or the lesson has no Pages).
export function resolvePageRedirect(pageNumber: number | null, pageCount: number): number | null {
  if (pageCount <= 0) {
    return null;
  }

  if (pageNumber === null) {
    return 1;
  }

  return pageNumber > pageCount ? pageCount : null;
}

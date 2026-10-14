/*
* Funcionalidad: Continue target
* Descripción: "Continuar donde quedé" inside a module: the first lesson (in order) whose viewedPages < totalPages, at page viewedPages + 1 clamped to the lesson size; lessons without Pages are skipped; without any progress it is a "start", and when every page was viewed it is a "review" from the first page. APPROXIMATION: the backend reports how many Pages were viewed, not which ones, so viewedPages + 1 is the first unviewed Page only while Pages are viewed in order. That always holds today (one Page per lesson, decision 1); if lessons are split into several Pages and viewed out of order, the target may point at an already viewed Page. Depends on the lesson and progress entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { LessonSummary } from "./lesson.entity";
import type { LessonProgress } from "./progress.entity";

export type ContinueTarget = {
  lessonId: string
  pageNumber: number
  kind: "start" | "continue" | "review"
};

export function findContinueTarget(lessons: LessonSummary[], progress: LessonProgress[] | null): ContinueTarget | null {
  const byLesson = new Map((progress ?? []).map((item) => [item.lessonId, item]));
  const hasProgress = (progress ?? []).some((item) => item.viewedPages > 0);
  let firstWithPages: string | null = null;

  for (const lesson of lessons) {
    const entry = byLesson.get(lesson.id);
    // The progress total wins; the lesson page count covers lessons without a progress entry yet.
    const totalPages = Math.max(entry?.totalPages ?? 0, lesson.pageCount);
    const viewedPages = entry?.viewedPages ?? 0;

    if (totalPages <= 0) {
      continue;
    }

    firstWithPages ??= lesson.id;

    if (viewedPages < totalPages) {
      const pageNumber = Math.min(Math.max(viewedPages + 1, 1), totalPages);

      return { lessonId: lesson.id, pageNumber, kind: hasProgress ? "continue" : "start" };
    }
  }

  return firstWithPages ? { lessonId: firstWithPages, pageNumber: 1, kind: "review" } : null;
}

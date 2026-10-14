/*
* Funcionalidad: Continue target
* Descripción: "Continuar donde quedé" inside a module: the first lesson (in order) whose viewedPages < totalPages, at page viewedPages + 1 clamped to the real page count of the lesson (the lesson list pageCount); lessons listing no Pages are skipped; whether a lesson is finished follows the backend progress total (the real count when the lesson has no progress entry); without any progress it is a "start", and when every page was viewed it is a "review" from the first page. APPROXIMATION: the backend reports how many Pages were viewed, not which ones, so viewedPages + 1 is the first unviewed Page only while Pages are viewed in order. That always holds today (one Page per lesson, decision 1); if lessons are split into several Pages and viewed out of order, the target may point at an already viewed Page. v1.1 (L3): the code now clamps to the real page count as documented (it used the larger of progress total and page count). Depends on the lesson and progress entities.
* Versión: 1.1
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
    // The lesson list count is the real number of Pages the viewer can open: lessons without Pages are skipped.
    const realPages = lesson.pageCount;

    if (realPages <= 0) {
      continue;
    }

    firstWithPages ??= lesson.id;

    // Finished-ness follows the backend progress total; lessons without a progress entry use the real count.
    const totalPages = entry?.totalPages ?? realPages;
    const viewedPages = entry?.viewedPages ?? 0;

    if (viewedPages < totalPages) {
      // Clamped to the real page count so the link never points past the last Page of the lesson.
      const pageNumber = Math.min(Math.max(viewedPages + 1, 1), realPages);

      return { lessonId: lesson.id, pageNumber, kind: hasProgress ? "continue" : "start" };
    }
  }

  return firstWithPages ? { lessonId: firstWithPages, pageNumber: 1, kind: "review" } : null;
}

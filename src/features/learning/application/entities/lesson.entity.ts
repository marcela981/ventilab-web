/*
* Funcionalidad: Lesson entity
* Descripción: Frontend model of a module lesson (`GET /api/modules/{id}/lessons`: id, title, order, number of Pages) and of a lesson Page (`GET /api/pages?lessonId=`: id, title, order). Decision 1 of the learning feature: the [pageNumber] of the viewer URL is the 1-based position of the Page inside its lesson, in `order`. Types only. v1.1 (L3): PageContent (`GET /api/pages/{id}`: id, title, lessonId, moduleId and the active blocks sorted by order, in the shared rich-content block shape). v1.2 (W5, Bloque 2): PageContent carries the module title and level id (the viewer no longer reads the curriculum tree on load); MissingLesson and LessonLock, the server decision that closes a lesson for a student (module locked, or previous lessons still missing).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ContentBlockInput } from "@shared/rich-content/blocks/content-block.types";

export type LessonSummary = {
  id: string
  title: string
  order: number
  pageCount: number
};

// One Page as the viewer renders it (`GET /api/pages/{id}`): its owners and its active blocks sorted by order.
export type PageContent = {
  id: string
  title: string
  lessonId: string | null
  moduleId: string
  moduleTitle: string
  levelId: string | null
  blocks: ContentBlockInput[]
};

export type MissingLesson = {
  lessonId: string
  title: string
};

// Server decision (GET /api/lessons/{id}/access or a 403 progress.lesson_locked): the lesson is closed for the student.
export type LessonLock = {
  reason: "module_locked" | "previous_lesson_incomplete"
  missing: MissingLesson[]
};

export type LessonPage = {
  id: string
  title: string
  order: number
};

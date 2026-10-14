/*
* Funcionalidad: Lesson entity
* Descripción: Frontend model of a module lesson (`GET /api/modules/{id}/lessons`: id, title, order, number of Pages) and of a lesson Page (`GET /api/pages?lessonId=`: id, title, order). Decision 1 of the learning feature: the [pageNumber] of the viewer URL is the 1-based position of the Page inside its lesson, in `order`. Types only. v1.1 (L3): PageContent (`GET /api/pages/{id}`: id, title, lessonId, moduleId and the active blocks sorted by order, in the shared rich-content block shape).
* Versión: 1.1
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
  blocks: ContentBlockInput[]
};

export type LessonPage = {
  id: string
  title: string
  order: number
};

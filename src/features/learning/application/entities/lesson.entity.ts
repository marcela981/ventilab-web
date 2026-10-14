/*
* Funcionalidad: Lesson entity
* Descripción: Frontend model of a module lesson (`GET /api/modules/{id}/lessons`: id, title, order, number of Pages) and of a lesson Page (`GET /api/pages?lessonId=`: id, title, order). Decision 1 of the learning feature: the [pageNumber] of the viewer URL is the 1-based position of the Page inside its lesson, in `order`. Types only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type LessonSummary = {
  id: string
  title: string
  order: number
  pageCount: number
};

export type LessonPage = {
  id: string
  title: string
  order: number
};

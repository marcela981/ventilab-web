/*
* Funcionalidad: Lesson viewer entry point
* Descripción: Public entry point of /learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber] (W3, Bloque 2): the LessonViewerPage and the route id parser. Routes import this file instead of the feature barrel. Depends on the learning application layer.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { LessonViewerPage } from "./application/pages/lesson-viewer.page";
export { parseRouteId } from "./application/entities/learning-urls";

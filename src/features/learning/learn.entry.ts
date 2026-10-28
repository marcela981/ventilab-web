/*
* Funcionalidad: Learn workspace entry point
* Descripción: Public entry point of the /learn workspace (W3, Bloque 2): the LearnWorkspace page (tabs Inicio, Currículo, Mi Progreso) and what the /learn/[sectionId] redirect needs (route id parser and the Currículo section URL). Routes import this file instead of the feature barrel, so the /learn chunk never carries the viewer, the notes editor or the print view. Depends on the learning application layer.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { LearnWorkspace } from "./application/components/learn-workspace/learn-workspace";
export { buildSectionUrl, parseRouteId } from "./application/entities/learning-urls";

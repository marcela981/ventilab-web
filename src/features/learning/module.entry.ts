/*
* Funcionalidad: Module resume entry point
* Descripción: Public entry point of /learn/modules/[moduleId] (W3, Bloque 2): the ModuleResumeResolver page (redirects to the lesson page where the module continues, or shows the lock screen) and the route id parser. Routes import this file instead of the feature barrel. Depends on the learning application layer.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { ModuleResumeResolver } from "./application/pages/module-resume-resolver.page";
export { parseRouteId } from "./application/entities/learning-urls";

/*
* Funcionalidad: Module evaluations entry point
* Descripción: Public entry point for other features that only need to know which curriculum modules have evaluations for the student (the learning curriculum's "Quiz del módulo" link; Bloque 3, Ola 4): useEvaluatedModuleIds. Importing this file instead of the feature barrel keeps the evaluation pages and components out of the /learn chunks. Depends on the evaluations application layer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { useEvaluatedModuleIds } from "./application/hooks/use-evaluated-module-ids";

/*
* Funcionalidad: Evaluation builder entry point
* Descripción: Public entry point of the evaluation builder routes (/evaluations/manage/new and /evaluations/manage/[id]/edit; Bloque 3 W5): the lazy EvaluationBuilderPage and buildEvaluationEditUrl, used by the /evaluations/manage/[id]/assignments redirect page. Routes import this file instead of the feature barrel. Depends on the authoring application layer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { buildEvaluationEditUrl } from "./application/entities/authoring-urls";
export { EvaluationBuilderPage } from "./application/pages/lazy-builder-page";

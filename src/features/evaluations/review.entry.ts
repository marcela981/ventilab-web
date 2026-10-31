/*
* Funcionalidad: Evaluations entry point for the grading review
* Descripción: The student evaluation components the grading review pane reuses (Bloque 3, W7): the attempt status badge and the clinical scenario panel, imported without the feature barrel so the grading chunk does not carry the student pages. Depends on the evaluations application layer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { ScenarioPanel } from "./application/components/attempt/scenario-panel";
export { AttemptStatusBadge } from "./application/components/attempt-badges";

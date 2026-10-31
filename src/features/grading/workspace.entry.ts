/*
* Funcionalidad: Grading workspace entry point
* Descripción: Public entry point of the grading routes (Bloque 3 W5): the lazy page of /grading/evaluations/[evaluationId] and the GradingAttemptResolver of /grading/attempts/[attemptId], which sends an attempt to its evaluation screen (?attempt=). Routes import this file instead of the feature barrel. Depends on the grading application layer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { GradingAttemptResolver } from "./application/components/grading-attempt-resolver";
export { EvaluationResultsPage } from "./application/pages/lazy-evaluation-results-page";

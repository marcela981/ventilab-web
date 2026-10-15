/*
* Funcionalidad: Grading URLs
* Descripción: URL builders of the grading routes registered in routes.config: the queue (/grading) and the grading screen of one attempt (/grading/attempts/[attemptId]). Depends on nothing at runtime. v1.1 (G3): the results page of one evaluation (/grading/evaluations/[evaluationId]).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const GRADING_URL = "/grading";

export function buildGradingEvaluationUrl(evaluationId: string): string {
  return `${GRADING_URL}/evaluations/${encodeURIComponent(evaluationId)}`;
}

export function buildGradingAttemptUrl(attemptId: string): string {
  return `${GRADING_URL}/attempts/${encodeURIComponent(attemptId)}`;
}

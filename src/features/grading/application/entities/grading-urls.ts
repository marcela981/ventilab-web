/*
* Funcionalidad: Grading URLs
* Descripción: URL builders of the grading routes registered in routes.config: the queue (/grading) and the grading screen of one attempt (/grading/attempts/[attemptId]). Depends on nothing at runtime. v1.1 (G3): the results page of one evaluation (/grading/evaluations/[evaluationId]). v1.2 (Bloque 3): GRADING_URL is the Calificar tab of the staff hub (/evaluations?tab=calificar); buildGradingReviewUrl opens one attempt in the unified grading screen of its evaluation (?attempt=), replacing buildGradingAttemptUrl.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

// The queue is the Calificar tab of the staff evaluation hub (/grading redirects there).
export const GRADING_URL = "/evaluations?tab=calificar";
const GRADING_ROOT = "/grading";

export function buildGradingEvaluationUrl(evaluationId: string): string {
  return `${GRADING_ROOT}/evaluations/${encodeURIComponent(evaluationId)}`;
}

// Review of one attempt inside the unified grading screen of its evaluation.
export function buildGradingReviewUrl(evaluationId: string, attemptId: string): string {
  return `${buildGradingEvaluationUrl(evaluationId)}?attempt=${encodeURIComponent(attemptId)}`;
}

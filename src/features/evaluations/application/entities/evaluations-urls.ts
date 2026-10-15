/*
* Funcionalidad: Evaluations URLs
* Descripción: URL builders of the student evaluation routes declared in routes.config: the list (/evaluations), the intro page (/evaluations/[evaluationId]), the attempt player (/evaluations/[evaluationId]/attempts/[attemptId]) and the attempt result (.../result). Path segments are URI-encoded. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const EVALUATIONS_URL = "/evaluations";

const segment = (value: string): string => encodeURIComponent(value);

export function buildEvaluationIntroUrl(evaluationId: string): string {
  return `${EVALUATIONS_URL}/${segment(evaluationId)}`;
}

export function buildAttemptUrl(evaluationId: string, attemptId: string): string {
  return `${buildEvaluationIntroUrl(evaluationId)}/attempts/${segment(attemptId)}`;
}

export function buildAttemptResultUrl(evaluationId: string, attemptId: string): string {
  return `${buildAttemptUrl(evaluationId, attemptId)}/result`;
}

/*
* Funcionalidad: Simulator routes
* Descripción: URL builders of the simulator feature: the catalog (/simulator), the running session console (/simulator/sessions/[sessionId]) and its result and replay pages. The route patterns are declared in the session route table (routes.config). Ids are URI-encoded. No dependencies. v1.1 (T8): the exam return targets of a result page, the student evaluations list and an exam attempt. These two routes belong to the evaluations feature; they are repeated here because importing the evaluations barrel would pull its pages into the simulator result chunk.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const SIMULATOR_URL = "/simulator";

export function buildSessionUrl(sessionId: string): string {
  return `${SIMULATOR_URL}/sessions/${encodeURIComponent(sessionId)}`;
}

export function buildSessionResultUrl(sessionId: string): string {
  return `${buildSessionUrl(sessionId)}/result`;
}

export function buildSessionReplayUrl(sessionId: string): string {
  return `${buildSessionUrl(sessionId)}/replay`;
}

/** Student evaluations list (evaluations feature route). */
export const EVALUATIONS_LIST_URL = "/evaluations";

/** Exam attempt player (evaluations feature route /evaluations/[evaluationId]/attempts/[attemptId]). */
export function buildExamAttemptUrl(evaluationId: string, attemptId: string): string {
  return `${EVALUATIONS_LIST_URL}/${encodeURIComponent(evaluationId)}/attempts/${encodeURIComponent(attemptId)}`;
}

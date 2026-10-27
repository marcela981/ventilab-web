/*
* Funcionalidad: Simulator routes
* Descripción: URL builders of the simulator feature: the catalog (/simulator), the running session console (/simulator/sessions/[sessionId]) and its result and replay pages. The route patterns are declared in the session route table (routes.config). Ids are URI-encoded. No dependencies. v1.1 (T8): the exam return targets of a result page, the student evaluations list and an exam attempt. These two routes belong to the evaluations feature; they are repeated here because importing the evaluations barrel would pull its pages into the simulator result chunk. v1.2 (W1 Bloque 1): SIMULATOR_URL ("Volver al simulador") is the Simular tab of the unified workspace, /simulador?tab=simular (the /simulator catalog page is gone); the session URLs keep /simulator/sessions/[sessionId] (EXAM and direct links unchanged).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/** Simular tab of the unified simulator workspace (/simulador). */
export const SIMULATOR_URL = "/simulador?tab=simular";

const SESSIONS_URL = "/simulator/sessions";

export function buildSessionUrl(sessionId: string): string {
  return `${SESSIONS_URL}/${encodeURIComponent(sessionId)}`;
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

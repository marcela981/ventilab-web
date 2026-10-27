/*
* Funcionalidad: Student space routes
* Descripción: URLs of the student space (/me, /me/notes, /me/grades) and local constants of the routes it links to in other features (learning section and lesson page, evaluation detail and attempt result, AI assistant conversation, simulator session, result and replay, lab reservations, notifications). Kept local because feature barrels are not tree-shaken: importing them for a route string would pull whole features into the /me chunk (precedent: notifications/application/config/notification-links.ts and simulator.routes.ts); a parity test compares them with the route constants of those features. No dependencies. v1.1 (B2 closure): lesson page route for the note deep links. v1.2 (B3.10): the unused STUDENT_HOME_URL constant is removed. v1.3 (W1 Bloque 1): the simulator home is the Simular tab of the unified workspace (/simulador?tab=simular); the session, result and replay URLs keep /simulator/sessions/[sessionId].
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const MY_NOTES_URL = "/me/notes";
export const MY_GRADES_URL = "/me/grades";

export const LEARN_HOME_URL = "/learn";
const EVALUATIONS_URL = "/evaluations";
const ASSISTANT_URL = "/assistant";
const SIMULATOR_URL = "/simulador?tab=simular";
const SIMULATION_SESSIONS_URL = "/simulator/sessions";
export const LAB_RESERVATIONS_URL = "/lab/reservations";
export const NOTIFICATIONS_URL = "/notifications";
export const EVALUATIONS_LIST_URL = EVALUATIONS_URL;
export const ASSISTANT_HOME_URL = ASSISTANT_URL;
export const SIMULATOR_HOME_URL = SIMULATOR_URL;

const segment = (value: string): string => encodeURIComponent(value);

export function buildSectionUrl(sectionId: string): string {
  return `${LEARN_HOME_URL}/${segment(sectionId)}`;
}

/** First page of a lesson in the learning viewer (mirrors learning buildLessonPageUrl with page 1). */
export function buildLessonUrl(moduleId: string, lessonId: string): string {
  return `${LEARN_HOME_URL}/modules/${segment(moduleId)}/lessons/${segment(lessonId)}/1`;
}

export function buildEvaluationUrl(evaluationId: string): string {
  return `${EVALUATIONS_URL}/${segment(evaluationId)}`;
}

export function buildAttemptResultUrl(evaluationId: string, attemptId: string): string {
  return `${buildEvaluationUrl(evaluationId)}/attempts/${segment(attemptId)}/result`;
}

export function buildConversationUrl(conversationId: string): string {
  return `${ASSISTANT_URL}/${segment(conversationId)}`;
}

export function buildSimulationSessionUrl(sessionId: string): string {
  return `${SIMULATION_SESSIONS_URL}/${segment(sessionId)}`;
}

export function buildSimulationResultUrl(sessionId: string): string {
  return `${buildSimulationSessionUrl(sessionId)}/result`;
}

export function buildSimulationReplayUrl(sessionId: string): string {
  return `${buildSimulationSessionUrl(sessionId)}/replay`;
}

/*
* Funcionalidad: Teacher dashboard routes
* Descripción: URLs of the teacher dashboard (/teacher with an optional ?groupId, /teacher/students/[userId] with the group it was opened from) and local constants of the routes it links to in other features (grading queue, grading of one attempt, evaluation results, simulation session replay). Kept local because feature barrels are not tree-shaken: importing them for a route string would pull whole features into the /teacher chunk (precedent: student-space.routes.ts). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const TEACHER_DASHBOARD_URL = "/teacher";
export const GRADING_URL = "/grading";

const segment = (value: string): string => encodeURIComponent(value);

export function buildTeacherDashboardUrl(groupId: string | null): string {
  return groupId ? `${TEACHER_DASHBOARD_URL}?groupId=${segment(groupId)}` : TEACHER_DASHBOARD_URL;
}

export function buildStudentDetailUrl(userId: string, groupId: string | null): string {
  const base = `${TEACHER_DASHBOARD_URL}/students/${segment(userId)}`;

  return groupId ? `${base}?groupId=${segment(groupId)}` : base;
}

export function buildGradingAttemptUrl(attemptId: string): string {
  return `${GRADING_URL}/attempts/${segment(attemptId)}`;
}

export function buildEvaluationResultsUrl(evaluationId: string): string {
  return `${GRADING_URL}/evaluations/${segment(evaluationId)}`;
}

export function buildSimulationReplayUrl(sessionId: string): string {
  return `/simulator/sessions/${segment(sessionId)}/replay`;
}

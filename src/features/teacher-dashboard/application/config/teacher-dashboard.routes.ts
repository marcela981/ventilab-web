/*
* Funcionalidad: Teacher dashboard routes
* Descripción: URLs of the teacher dashboard (/teacher with an optional ?tab and ?groupId, /teacher/students/[userId] with the group it was opened from) and local constants of the routes it links to in other features (grading queue, grading of one attempt, evaluation results, simulation session replay). Kept local because feature barrels are not tree-shaken: importing them for a route string would pull whole features into the /teacher chunk (precedent: student-space.routes.ts). No dependencies. v1.1 (Bloque 3): the pending link opens the Calificar tab of the staff hub (/evaluations?tab=calificar); attempt and results links keep their /grading routes. v1.2 (W1 Bloque 4): /teacher has the General and Grupo tabs (?tab=general|grupo): buildTeacherDashboardUrl carries the tab (with a group it opens Grupo, so the student detail's back link returns to the group tab); TEACHER_STUDENTS_URL (/teacher/students, the directory that replaces /panel/students).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const TEACHER_DASHBOARD_URL = "/teacher";
export const TEACHER_STUDENTS_URL = "/teacher/students";

export const TEACHER_DASHBOARD_TABS = ["general", "grupo"] as const;
export type TeacherDashboardTab = (typeof TEACHER_DASHBOARD_TABS)[number];

// The queue is the Calificar tab of the staff evaluation hub; attempts and results live under /grading.
export const GRADING_URL = "/evaluations?tab=calificar";
const GRADING_ROOT = "/grading";

const segment = (value: string): string => encodeURIComponent(value);

// A group opens the Grupo tab unless another tab is asked for; without group and tab, the default (General).
export function buildTeacherDashboardUrl(groupId: string | null, tab?: TeacherDashboardTab): string {
  const selectedTab = tab ?? (groupId ? "grupo" : null);
  const params = [
    ...(selectedTab ? [`tab=${selectedTab}`] : []),
    ...(groupId ? [`groupId=${segment(groupId)}`] : []),
  ];

  return params.length > 0 ? `${TEACHER_DASHBOARD_URL}?${params.join("&")}` : TEACHER_DASHBOARD_URL;
}

export function buildStudentDetailUrl(userId: string, groupId: string | null): string {
  const base = `${TEACHER_STUDENTS_URL}/${segment(userId)}`;

  return groupId ? `${base}?groupId=${segment(groupId)}` : base;
}

export function buildGradingAttemptUrl(attemptId: string): string {
  return `${GRADING_ROOT}/attempts/${segment(attemptId)}`;
}

export function buildEvaluationResultsUrl(evaluationId: string): string {
  return `${GRADING_ROOT}/evaluations/${segment(evaluationId)}`;
}

export function buildSimulationReplayUrl(sessionId: string): string {
  return `/simulator/sessions/${segment(sessionId)}/replay`;
}

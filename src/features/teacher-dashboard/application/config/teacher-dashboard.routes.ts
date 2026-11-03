/*
* Funcionalidad: Teacher dashboard routes
* Descripción: URLs of the teacher dashboard (/teacher with an optional ?tab and ?groupId, /teacher/students/[userId] with the group it was opened from) and local constants of the routes it links to in other features (grading queue, grading of one attempt, evaluation results, simulation session replay). Kept local because feature barrels are not tree-shaken: importing them for a route string would pull whole features into the /teacher chunk (precedent: student-space.routes.ts). No dependencies. v1.1 (Bloque 3): the pending link opens the Calificar tab of the staff hub (/evaluations?tab=calificar); attempt and results links keep their /grading routes. v1.2 (W1 Bloque 4): /teacher has the General and Grupo tabs (?tab=general|grupo): buildTeacherDashboardUrl carries the tab (with a group it opens Grupo, so the student detail's back link returns to the group tab); TEACHER_STUDENTS_URL (/teacher/students, the directory that replaces /panel/students). v1.3 (W3 Bloque 4): buildStudentDetailUrl takes an optional origin: `from=directory` (STUDENT_DETAIL_FROM_DIRECTORY) marks a detail opened from the students directory so its back link can return to /teacher/students (readStudentDetailOrigin parses it).
* Versión: 1.3
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

/** Value of `?from=` on a student detail opened from the students directory (its back link returns there). */
export const STUDENT_DETAIL_FROM_DIRECTORY = "directory";
export type StudentDetailOrigin = typeof STUDENT_DETAIL_FROM_DIRECTORY;

export function buildStudentDetailUrl(userId: string, groupId: string | null, from?: StudentDetailOrigin): string {
  const base = `${TEACHER_STUDENTS_URL}/${segment(userId)}`;
  const params = [
    ...(groupId ? [`groupId=${segment(groupId)}`] : []),
    ...(from ? [`from=${from}`] : []),
  ];

  return params.length > 0 ? `${base}?${params.join("&")}` : base;
}

/** Origin of a student detail from its Next query value (`router.query.from`); anything else gives null. */
export function readStudentDetailOrigin(value: string | string[] | undefined): StudentDetailOrigin | null {
  return value === STUDENT_DETAIL_FROM_DIRECTORY ? STUDENT_DETAIL_FROM_DIRECTORY : null;
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

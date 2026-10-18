/*
* Funcionalidad: Teacher dashboard service
* Descripción: API path constants of the teacher dashboard (TEACHER, ADMIN), read with useApiQuery: groups (`GET /api/groups?type=STUDENT`, already scoped by the backend), group dashboard (`GET /api/analytics/groups/{groupId}/dashboard`), evaluation stats (`GET /api/analytics/evaluations/{evaluationId}/stats`), student timeline (`GET /api/analytics/students/{userId}/timeline?from&to`), managed assignments (`GET /api/evaluation-assignments?groupId&state=ACTIVE`), grading queue (`GET /api/evaluation-grading/queue?groupId`), reservations calendar (`GET /api/reservations?from&to`), student header (`GET /api/users/students/{id}`), progress summary (`GET /api/progress/users/{userId}/summary`) and curriculum tree (`GET /api/curriculum/tree`, titles only). exportGroupCsv downloads `GET /api/analytics/groups/{groupId}/export.csv` through the shared text download helper. Depends on @shared/api-client. v1.1 (closure B2): grading queue count (`GET /api/evaluation-grading/queue/count?groupId`), a student's grades (`GET /api/evaluation-grading/students/{userId}/grades`) and simulation sessions (`GET /api/simulation/sessions/history?userId`); stats and calendar take `groupId`, the queue takes `studentId`.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGetText, saveTextFile } from "@shared/api-client/api-download";

export const GROUPS_PATH = "/api/groups";
export const GROUP_DASHBOARD_PATH = "/api/analytics/groups/{groupId}/dashboard";
export const GROUP_EXPORT_PATH = "/api/analytics/groups/{groupId}/export.csv";
export const EVALUATION_STATS_PATH = "/api/analytics/evaluations/{evaluationId}/stats";
export const STUDENT_TIMELINE_PATH = "/api/analytics/students/{userId}/timeline";
export const ASSIGNMENTS_PATH = "/api/evaluation-assignments";
export const GRADING_QUEUE_PATH = "/api/evaluation-grading/queue";
export const GRADING_QUEUE_COUNT_PATH = "/api/evaluation-grading/queue/count";
export const STUDENT_GRADES_PATH = "/api/evaluation-grading/students/{userId}/grades";
export const SIMULATION_SESSIONS_PATH = "/api/simulation/sessions/history";
export const RESERVATIONS_PATH = "/api/reservations";
export const STUDENT_PATH = "/api/users/students/{id}";
export const PROGRESS_SUMMARY_PATH = "/api/progress/users/{userId}/summary";
export const CURRICULUM_TREE_PATH = "/api/curriculum/tree";

/** Fallback file name when the browser cannot read Content-Disposition (CORS). */
export function exportFileName(groupName: string | null, groupId: string): string {
  const slug = (groupName ?? groupId)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `analitica-${slug || "grupo"}.csv`;
}

export async function exportGroupCsv(groupId: string, groupName: string | null): Promise<void> {
  const file = await apiGetText(GROUP_EXPORT_PATH, { params: { groupId }, timeout: "slow" });

  saveTextFile(file, exportFileName(groupName, groupId));
}

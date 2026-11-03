/*
* Funcionalidad: Student detail routes
* Descripción: URLs used by /teacher/students/[userId] (DISENO_BLOQUE4 §2.4): the back link (to the students directory /teacher/students when the page was opened from it, `?from=directory`; otherwise to the teacher dashboard as before, on the Grupo tab of ?groupId when present), the tab ids of the detail and the playback of a real ventilator recording (/lab/recordings/[reservationId], the recording id is the reservation id). Kept local for the same reason as teacher-dashboard.routes.ts (feature barrels are not tree-shaken). Depends on the teacher dashboard routes and the student detail entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { StudentDetailTab } from "../entities/student-detail.entity";
import { buildTeacherDashboardUrl, TEACHER_STUDENTS_URL } from "./teacher-dashboard.routes";

/** `?from=` value set by the students directory links. */
export const FROM_DIRECTORY = "directory";

export type StudentDetailBack = "directory" | "dashboard";

export function studentDetailBackOf(from: string | string[] | undefined): StudentDetailBack {
  return from === FROM_DIRECTORY ? "directory" : "dashboard";
}

export function buildStudentDetailBackUrl(back: StudentDetailBack, groupId: string | null): string {
  return back === "directory" ? TEACHER_STUDENTS_URL : buildTeacherDashboardUrl(groupId);
}

export const studentDetailTabId = (tab: StudentDetailTab): string => `student-detail-tab-${tab}`;
export const studentDetailPanelId = (tab: StudentDetailTab): string => `student-detail-panel-${tab}`;

export function buildRecordingPlaybackUrl(reservationId: string): string {
  return `/lab/recordings/${encodeURIComponent(reservationId)}`;
}

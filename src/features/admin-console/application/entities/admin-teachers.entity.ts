/*
* Funcionalidad: Admin teachers entity
* Descripción: Pure model of the Profesores tab of /admin/users (DISENO_BLOQUE4 §2.7; julio TeachersTab): the teacher row read from `GET /api/admin/teachers` (name, email, role, active student groups created or supervised, distinct students), the role label (a role outside the known ones is shown as returned) and the teachers search kept in the URL (?teacherSearch, trimmed, at most 100 characters) with its query writer that keeps the other keys. Depends on the admin console config and the admin users entity (queryWithout).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isUserRole, ROLE_LABELS } from "../config/admin-console.config";
import { queryWithout } from "./admin-users.entity";

export type AdminTeacherRow = {
  id: string
  name: string | null
  email: string
  role: string
  groups: { id: string, name: string }[]
  studentCount: number
};

export const TEACHER_SEARCH_KEY = "teacherSearch";
const TEACHER_SEARCH_MAX_LENGTH = 100;

type QueryValue = string | string[] | undefined;

export function teacherRoleLabel(role: string): string {
  return isUserRole(role) ? ROLE_LABELS[role] : role;
}

export function readTeacherSearch(query: Readonly<Record<string, QueryValue>>): string {
  const value = query[TEACHER_SEARCH_KEY];

  return typeof value === "string" ? value.trim().slice(0, TEACHER_SEARCH_MAX_LENGTH) : "";
}

/** The router query with the teachers search set to `search` (removed when empty); other keys are kept. */
export function withTeacherSearchQuery(
  query: Readonly<Record<string, QueryValue>>,
  search: string,
): Record<string, string | string[]> {
  const trimmed = search.trim();

  return { ...queryWithout(query, [TEACHER_SEARCH_KEY]), ...(trimmed ? { [TEACHER_SEARCH_KEY]: trimmed } : {}) };
}

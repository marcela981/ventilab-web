/*
* Funcionalidad: Admin users entity
* Descripción: Pure model of /admin/users: the filters kept in the URL (page, search, role, groupId, isActive) read from and written to the router query, the `GET /api/users` query they produce (name sort, page size), the user row and group option shapes, the effects of a role change as the backend applies them (leaving STUDENT removes the student groups, becoming STUDENT removes the teacher groups, the refresh tokens are revoked and a ROLE_CHANGED notification is sent) and the self-account guard (the backend refuses to change one's own role or status). No dependencies besides the admin console config. v1.1 (closure B2): the row carries `studentCode` and `isSuperadmin` from the API; lockedReason (superadmin first, then own account) and the student code rule of the backend (parseStudentCode: empty clears it, 1–32 letters, digits or hyphens) with its Spanish messages.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isUserRole, USERS_PAGE_SIZE } from "../config/admin-console.config";
import type { UserRole } from "../config/admin-console.config";

export type ActiveFilter = "" | "true" | "false";

export type AdminUserFilters = {
  page: number
  search: string
  role: UserRole | ""
  groupId: string
  isActive: ActiveFilter
};

export const NO_USER_FILTERS: AdminUserFilters = { page: 1, search: "", role: "", groupId: "", isActive: "" };

export type AdminUserRow = {
  id: string
  name: string | null
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  studentCode: string | null
  isSuperadmin: boolean
};

/** Backend rule of `PATCH /api/users/{id}/student-code`: trimmed, 1 to 32 letters, digits or hyphens. */
export const STUDENT_CODE_MAX_LENGTH = 32;
const STUDENT_CODE_PATTERN = /^[A-Za-z0-9-]+$/;

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const STUDENT_CODE_COPY = {
  invalid: `Usa de 1 a ${STUDENT_CODE_MAX_LENGTH} letras, números o guiones, sin espacios.`,
  inUse: "Código ya en uso",
} as const;

export type StudentCodeDraft = { value: string | null, error: string | null };

/** The code to send for the typed text: empty clears it (null); otherwise the trimmed code or the reason it is refused. */
export function parseStudentCode(text: string): StudentCodeDraft {
  const code = text.trim();

  if (code === "") {
    return { value: null, error: null };
  }

  return code.length <= STUDENT_CODE_MAX_LENGTH && STUDENT_CODE_PATTERN.test(code)
    ? { value: code, error: null }
    : { value: null, error: STUDENT_CODE_COPY.invalid };
}

export type GroupFilterOption = {
  id: string
  name: string
  type: "STUDENT" | "TEACHER"
};

export type AdminUsersQuery = {
  page: number
  limit: number
  sortBy: "name"
  sortOrder: "asc"
  search?: string
  role?: UserRole
  groupId?: string
  isActive?: boolean
};

type QueryValue = string | string[] | undefined;

function single(value: QueryValue): string {
  return typeof value === "string" ? value : "";
}

export function readUserFilters(query: Readonly<Record<string, QueryValue>>): AdminUserFilters {
  const page = Number.parseInt(single(query.page), 10);
  const role = single(query.role);
  const isActive = single(query.isActive);

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    search: single(query.search).trim(),
    role: isUserRole(role) ? role : "",
    groupId: single(query.groupId).trim(),
    isActive: isActive === "true" || isActive === "false" ? isActive : "",
  };
}

export function toUserFiltersQuery(filters: AdminUserFilters): Record<string, string> {
  const query: Record<string, string> = {};

  if (filters.page > 1) {
    query.page = String(filters.page);
  }

  if (filters.search) {
    query.search = filters.search;
  }

  if (filters.role) {
    query.role = filters.role;
  }

  if (filters.groupId) {
    query.groupId = filters.groupId;
  }

  if (filters.isActive) {
    query.isActive = filters.isActive;
  }

  return query;
}

export function hasUserFilters(filters: AdminUserFilters): boolean {
  return Boolean(filters.search || filters.role || filters.groupId || filters.isActive);
}

export function toAdminUsersQuery(filters: AdminUserFilters, limit: number = USERS_PAGE_SIZE): AdminUsersQuery {
  return {
    page: filters.page,
    limit,
    sortBy: "name",
    sortOrder: "asc",
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.groupId ? { groupId: filters.groupId } : {}),
    ...(filters.isActive ? { isActive: filters.isActive === "true" } : {}),
  };
}

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const ROLE_CHANGE_EFFECTS = {
  leavesStudentGroups: "Saldrá de todos sus grupos de estudiantes.",
  leavesTeacherGroups: "Saldrá de todos sus grupos de docentes.",
  sessionRefreshed: "Su sesión se renovará: el servidor cierra sus sesiones abiertas y deberá volver a ingresar con el nuevo rol.",
  notified: "Recibirá una notificación del cambio de rol.",
} as const;

export function roleChangeEffects(from: UserRole, to: UserRole): string[] {
  if (from === to) {
    return [];
  }

  const effects: string[] = [];

  if (from === "STUDENT") {
    effects.push(ROLE_CHANGE_EFFECTS.leavesStudentGroups);
  } else if (to === "STUDENT") {
    effects.push(ROLE_CHANGE_EFFECTS.leavesTeacherGroups);
  }

  effects.push(ROLE_CHANGE_EFFECTS.sessionRefreshed, ROLE_CHANGE_EFFECTS.notified);

  return effects;
}

export function isOwnAccount(row: AdminUserRow, sessionUserId: string | null | undefined): boolean {
  return Boolean(sessionUserId) && row.id === sessionUserId;
}

/** Why the role and status actions of a row are locked: the superadmin (`UserDTO.isSuperadmin`) or one's own account. */
export function lockedReason(row: AdminUserRow, sessionUserId: string | null | undefined): "superadmin" | "own" | null {
  if (row.isSuperadmin) {
    return "superadmin";
  }

  return isOwnAccount(row, sessionUserId) ? "own" : null;
}

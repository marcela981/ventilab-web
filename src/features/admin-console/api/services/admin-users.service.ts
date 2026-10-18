/*
* Funcionalidad: Admin users service
* Descripción: API paths and mutations of the user administration (ADMIN): the paginated users list (`GET /api/users?page&limit&search&role&groupId&isActive&sortBy&sortOrder`), the groups of the group filter (`GET /api/groups`, every group for an admin), the role change (`PATCH /api/users/{id}/role {role}`: the backend removes the groups that no longer fit, revokes the refresh tokens and notifies ROLE_CHANGED) and the account status change (`PATCH /api/users/{id}/status {isActive}`). The deprecated `/api/admin/users` alias is never used. Depends on @shared/api-client. v1.1 (closure B2): the search also matches the student code on the server; the student code change (`PATCH /api/users/{id}/student-code {studentCode}`, null clears it, 409 when another user has it).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPatch } from "@shared/api-client/api-request";
import type { UserRoleDTO } from "../dtos/admin-console.dto";

export const USERS_PATH = "/api/users";
export const GROUPS_PATH = "/api/groups";
export const USER_ROLE_PATH = "/api/users/{id}/role";
export const USER_STATUS_PATH = "/api/users/{id}/status";
export const USER_STUDENT_CODE_PATH = "/api/users/{id}/student-code";

export async function changeUserStudentCode(userId: string, studentCode: string | null): Promise<void> {
  await apiPatch(USER_STUDENT_CODE_PATH, { params: { id: userId }, body: { studentCode } });
}

export async function changeUserRole(userId: string, role: UserRoleDTO): Promise<void> {
  await apiPatch(USER_ROLE_PATH, { params: { id: userId }, body: { role } });
}

export async function changeUserStatus(userId: string, isActive: boolean): Promise<void> {
  await apiPatch(USER_STATUS_PATH, { params: { id: userId }, body: { isActive } });
}

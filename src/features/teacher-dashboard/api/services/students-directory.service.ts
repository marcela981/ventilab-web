/*
* Funcionalidad: Students directory service
* Descripción: Backend calls of the students directory (/teacher/students): the SWR keys read with useApiQuery (`GET /api/admin/students`, paginated, searchable by name, email or student code, sortable, `myGroups=true` for the caller's groups; `GET /api/admin/statistics`) and the two writes of "Conformar grupo" on the existing groups API: create a STUDENT group (`POST /api/groups`, returns its id) and add one student (`POST /api/groups/{id}/members`). DIRECTORY_INVALIDATED_PATHS lists the cached reads a new group changes. Default (fast) timeout; errors reject with ApiError. Depends on @shared/api-client and the students directory DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost } from "@shared/api-client/api-request";
import type { CreateGroupRequestDTO } from "../dtos/students-directory.dto";

export const ADMIN_STUDENTS_PATH = "/api/admin/students";
export const PLATFORM_STATISTICS_PATH = "/api/admin/statistics";
const GROUPS_PATH = "/api/groups";
const GROUP_MEMBERS_PATH = "/api/groups/{id}/members";

// A new group changes the directory "Grupos" column and every group list.
export const DIRECTORY_INVALIDATED_PATHS = [ADMIN_STUDENTS_PATH, GROUPS_PATH, "/api/groups/mine"] as const;

export async function createStudentGroup(body: Omit<CreateGroupRequestDTO, "type">): Promise<string> {
  const result = await apiPost(GROUPS_PATH, { body: { ...body, type: "STUDENT" } });

  return result.data.id;
}

export async function addStudentToGroup(groupId: string, userId: string): Promise<void> {
  await apiPost(GROUP_MEMBERS_PATH, { params: { id: groupId }, body: { userId } });
}

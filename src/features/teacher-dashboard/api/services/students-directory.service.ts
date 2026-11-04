/*
* Funcionalidad: Students directory service
* Descripción: Backend writes of the students directory (/teacher/students) (its reads, `GET /api/admin/students` and `GET /api/admin/statistics`, use the paths of the teacher dashboard service): the two writes of "Conformar grupo" on the existing groups API: create a STUDENT group (`POST /api/groups`, returns its id) and add one student (`POST /api/groups/{id}/members`). DIRECTORY_INVALIDATED_PATHS lists the cached reads a new group changes. Default (fast) timeout; errors reject with ApiError. Depends on @shared/api-client, the teacher dashboard service paths and the students directory DTOs.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost } from "@shared/api-client/api-request";
import type { CreateGroupRequestDTO } from "../dtos/students-directory.dto";
import { ADMIN_STUDENTS_PATH, GROUPS_PATH } from "./teacher-dashboard.service";

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

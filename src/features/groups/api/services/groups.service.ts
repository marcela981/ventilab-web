/*
* Funcionalidad: Groups service
* Descripción: Backend calls of the groups feature through the typed api-client: the SWR keys (paths) of the read endpoints used with useApiQuery (`GET /api/groups`, `/api/groups/mine`, `/api/groups/{id}`, `/api/groups/{id}/members`, `/api/groups/{id}/supervisions`, `/api/users` for the member search), GROUP_QUERY_PATHS (the keys every group mutation invalidates) and the mutations: create, update, delete or deactivate, add/remove member, assign/clear leader, add/remove supervision. Default (fast) timeout; errors reject with ApiError. Depends on @shared/api-client and the groups DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiDelete, apiPatch, apiPost } from "@shared/api-client/api-request";
import type {
  CreateGroupRequestDTO,
  DeleteGroupResultDTO,
  UpdateGroupRequestDTO,
} from "../dtos/groups.dto";

export const GROUPS_PATH = "/api/groups";
export const MY_GROUPS_PATH = "/api/groups/mine";
export const GROUP_PATH = "/api/groups/{id}";
export const GROUP_MEMBERS_PATH = "/api/groups/{id}/members";
export const GROUP_SUPERVISIONS_PATH = "/api/groups/{id}/supervisions";
export const USERS_PATH = "/api/users";

// Every group mutation can change any of these views (counts, leader, members, supervisions).
export const GROUP_QUERY_PATHS = [
  GROUPS_PATH,
  MY_GROUPS_PATH,
  GROUP_PATH,
  GROUP_MEMBERS_PATH,
  GROUP_SUPERVISIONS_PATH,
] as const;

export async function createGroup(body: CreateGroupRequestDTO): Promise<string> {
  const result = await apiPost(GROUPS_PATH, { body });

  return result.data.id;
}

export async function updateGroup(id: string, body: UpdateGroupRequestDTO): Promise<void> {
  await apiPatch(GROUP_PATH, { params: { id }, body });
}

export async function deleteGroup(id: string): Promise<DeleteGroupResultDTO["outcome"]> {
  const result = await apiDelete(GROUP_PATH, { params: { id } });

  return result.data.outcome;
}

export async function addGroupMember(id: string, userId: string): Promise<void> {
  await apiPost(GROUP_MEMBERS_PATH, { params: { id }, body: { userId } });
}

export async function removeGroupMember(id: string, userId: string): Promise<void> {
  await apiDelete("/api/groups/{id}/members/{userId}", { params: { id, userId } });
}

export async function setGroupLeader(id: string, userId: string | null): Promise<void> {
  await apiPatch("/api/groups/{id}/lead", { params: { id }, body: { userId } });
}

export async function addGroupSupervision(teacherGroupId: string, studentGroupId: string): Promise<void> {
  await apiPost(GROUP_SUPERVISIONS_PATH, { params: { id: teacherGroupId }, body: { studentGroupId } });
}

export async function removeGroupSupervision(teacherGroupId: string, studentGroupId: string): Promise<void> {
  await apiDelete("/api/groups/{id}/supervisions/{studentGroupId}", { params: { id: teacherGroupId, studentGroupId } });
}

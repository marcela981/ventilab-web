/*
* Funcionalidad: Reservation holders service
* Descripción: Paths and queries of the backend lists used to offer the reservation holders, all present in openapi/openapi.json: the caller's groups and memberships GET /api/groups/mine (groups:read_own, every role; a student books for a group only as its LEADER), the groups list GET /api/groups (groups:read, staff; teachers get the student groups they created or supervise, admins every group) filtered to active groups (student groups for teachers) and the users list GET /api/users (users:list) searched by name, email or id for admins. Hooks read them through useApiQuery. Depends on the lab DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { GroupsQueryDTO, UsersQueryDTO } from "../dtos/lab.dto";

export const MY_GROUPS_PATH = "/api/groups/mine";
export const GROUPS_PATH = "/api/groups";
export const USERS_PATH = "/api/users";

export const MY_GROUPS_PERMISSION = "groups:read_own";
export const GROUPS_PERMISSION = "groups:read";
export const USERS_PERMISSION = "users:list";

export const USER_SEARCH_LIMIT = 20;
/** Shortest search term sent to GET /api/users. */
export const USER_SEARCH_MIN_LENGTH = 2;

export function groupsQuery(studentGroupsOnly: boolean): GroupsQueryDTO {
  return studentGroupsOnly ? { isActive: "true", type: "STUDENT" } : { isActive: "true" };
}

export function usersQuery(search: string): UsersQueryDTO {
  return { search: search.trim(), limit: USER_SEARCH_LIMIT, isActive: true, sortBy: "name", sortOrder: "asc" };
}

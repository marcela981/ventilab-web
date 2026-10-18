/*
* Funcionalidad: Groups DTOs
* Descripción: Request and response types of the groups endpoints, taken from the generated OpenAPI schema: list (`GET /api/groups` -> GroupDTO[]), own groups (`GET /api/groups/mine` -> MyGroupsDTO), detail (`GET /api/groups/{id}` -> GroupDetailDTO), members, supervisions, create/update/delete, add member, leader and supervision bodies, and the users list used to search members (`GET /api/users` -> UserDTO[]). Types only. v1.1 (B3.10): unused aliases removed (AddGroupMemberRequestDTO, SetGroupLeaderRequestDTO, AddGroupSupervisionRequestDTO).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type GroupDTO = Schemas["GroupDTO"];

export type GroupDetailDTO = Schemas["GroupDetailDTO"];

export type GroupMemberDTO = Schemas["GroupMemberDTO"];

export type GroupPersonDTO = Schemas["GroupPersonDTO"];

export type MyGroupsDTO = Schemas["MyGroupsDTO"];

export type GroupSupervisionDTO = Schemas["GroupSupervisionDTO"];

export type CreateGroupRequestDTO = Schemas["CreateGroupDTO"];

export type UpdateGroupRequestDTO = Schemas["UpdateGroupDTO"];

export type DeleteGroupResultDTO = Schemas["DeleteGroupResultDTO"];

export type UserDTO = Schemas["UserDTO"];

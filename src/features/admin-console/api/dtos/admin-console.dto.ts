/*
* Funcionalidad: Admin console DTOs
* Descripción: Response types of the endpoints read by the admin console, taken from the generated OpenAPI schema: users (`GET /api/users`, UserDTO without any superadmin flag), groups for the user filter (`GET /api/groups`), platform settings (`GET /api/platform-settings`, PlatformSettingDTO with free-form limits and no field types) and the AI providers of the system status (`GET /api/system/status`, components.aiProviders.providers[].configured). Types only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type UserDTO = Schemas["UserDTO"];
export type UserRoleDTO = UserDTO["role"];
export type GroupDTO = Schemas["GroupDTO"];
export type PlatformSettingDTO = Schemas["PlatformSettingDTO"];
export type PlatformSettingCategoryDTO = PlatformSettingDTO["category"];
export type SystemStatusDTO = Schemas["SystemStatusDTO"];
export type AiProviderStatusDTO = Schemas["AiProviderStatusDTO"];

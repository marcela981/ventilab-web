/*
* Funcionalidad: Profile DTOs
* Descripción: Request and response types of the own-profile endpoints used by the profile page, taken from the generated OpenAPI schema: `GET /api/users/me` -> UserDTO, `PATCH /api/users/me` <- UpdateMeDTO, `PUT`/`DELETE /api/users/me/avatar` -> UserDTO and `POST /api/auth/change-password` <- ChangePasswordDTO -> LoginResponseDTO (new token pair). Types only. v1.1 (Bloque 4, W7): avatar and change-password types.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

export type UserDTO = components["schemas"]["UserDTO"];

export type UpdateMeRequestDTO = components["schemas"]["UpdateMeDTO"];

export type ChangePasswordRequestDTO = components["schemas"]["ChangePasswordDTO"];

export type ChangePasswordResponseDTO = components["schemas"]["LoginResponseDTO"];

/*
* Funcionalidad: Profile DTOs
* Descripción: Request and response types of the own-profile endpoints used by the profile page (`GET /api/users/me` -> UserDTO, `PATCH /api/users/me` <- UpdateMeDTO with optional `name` and `image`), taken from the generated OpenAPI schema. Types only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

export type UserDTO = components["schemas"]["UserDTO"];

export type UpdateMeRequestDTO = components["schemas"]["UpdateMeDTO"];

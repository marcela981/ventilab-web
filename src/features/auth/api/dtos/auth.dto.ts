/*
* Funcionalidad: Auth DTOs
* Descripción: Request and response types of the backend auth endpoints used by the login page (`POST /api/auth/login`, `POST /api/auth/google`), taken from the generated OpenAPI schema. Types only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

export type LoginRequestDTO = components["schemas"]["LoginDTO"];

export type GoogleLoginRequestDTO = components["schemas"]["GoogleLoginDTO"];

export type LoginResponseDTO = components["schemas"]["LoginResponseDTO"];

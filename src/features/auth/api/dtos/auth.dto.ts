/*
* Funcionalidad: Auth DTOs
* Descripción: Request and response types of the backend auth endpoints used by the login and register pages (`POST /api/auth/login`, `POST /api/auth/google`, `POST /api/auth/register`), taken from the generated OpenAPI schema. v1.1 (B3.4, D4): RegisterRequestDTO. Types only. v1.2 (B3.10): unused aliases removed (GoogleLoginRequestDTO).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

export type LoginRequestDTO = components["schemas"]["LoginDTO"];

export type LoginResponseDTO = components["schemas"]["LoginResponseDTO"];

export type RegisterRequestDTO = components["schemas"]["RegisterDTO"];

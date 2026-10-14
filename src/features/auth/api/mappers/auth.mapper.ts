/*
* Funcionalidad: Auth mappers
* Descripción: Pure mappers between the login form entities and the auth DTOs: credentials to the login request (email trimmed, password untouched) and the login response to the token pair the shared session stores. Depends on the auth DTOs, the auth entities and the session entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { SessionTokens } from "@shared/session";
import type { LoginCredentials } from "../../application/entities/auth.entity";
import type { LoginRequestDTO, LoginResponseDTO } from "../dtos/auth.dto";

export function toLoginRequest(credentials: LoginCredentials): LoginRequestDTO {
  return { email: credentials.email.trim(), password: credentials.password };
}

export function toSessionTokens(response: LoginResponseDTO): SessionTokens {
  return { accessToken: response.accessToken, refreshToken: response.refreshToken };
}

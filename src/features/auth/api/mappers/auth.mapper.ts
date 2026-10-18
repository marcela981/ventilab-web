/*
* Funcionalidad: Auth mappers
* Descripción: Pure mappers between the auth form entities and the auth DTOs: credentials to the login request (email trimmed, password untouched), the login response to the token pair the shared session stores and, v1.1 (B3.4, D4), the registration data to the register request (name and email trimmed, password untouched, confirmation not sent) and to the credentials of the login that follows it. Depends on the auth DTOs, the auth entities and the session entities.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { SessionTokens } from "@shared/session";
import type { LoginCredentials } from "../../application/entities/auth.entity";
import type { RegistrationData } from "../../application/entities/register.entity";
import type { LoginRequestDTO, LoginResponseDTO, RegisterRequestDTO } from "../dtos/auth.dto";

export function toLoginRequest(credentials: LoginCredentials): LoginRequestDTO {
  return { email: credentials.email.trim(), password: credentials.password };
}

export function toSessionTokens(response: LoginResponseDTO): SessionTokens {
  return { accessToken: response.accessToken, refreshToken: response.refreshToken };
}

export function toRegisterRequest(registration: RegistrationData): RegisterRequestDTO {
  return { name: registration.name.trim(), email: registration.email.trim(), password: registration.password };
}

export function toRegisteredCredentials(registration: RegistrationData): LoginCredentials {
  return { email: registration.email, password: registration.password };
}

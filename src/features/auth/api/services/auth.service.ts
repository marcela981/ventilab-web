/*
* Funcionalidad: Auth service
* Descripción: Backend calls of the login and register pages through the typed api-client: local login (`POST /api/auth/login`), Google sign-in with a Google Identity Services ID token (`POST /api/auth/google`) and student self-registration (`POST /api/auth/register`, answers `data: null`; the page logs in afterwards). The three use the slow timeout (backend cold start: login and Google through SLOW_ROUTES, register per call). Errors reject with ApiError. Logout and session loading belong to @shared/session. v1.1 (B3.4, D4): registerAccount. Depends on @shared/api-client, the auth DTOs and mappers.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost } from "@shared/api-client/api-request";
import type { LoginCredentials } from "../../application/entities/auth.entity";
import type { RegistrationData } from "../../application/entities/register.entity";
import type { LoginResponseDTO } from "../dtos/auth.dto";
import { toLoginRequest, toRegisterRequest } from "../mappers/auth.mapper";

export async function loginWithPassword(credentials: LoginCredentials): Promise<LoginResponseDTO> {
  const { data } = await apiPost("/api/auth/login", { body: toLoginRequest(credentials) });

  return data;
}

export async function loginWithGoogle(idToken: string): Promise<LoginResponseDTO> {
  const { data } = await apiPost("/api/auth/google", { body: { idToken } });

  return data;
}

export async function registerAccount(registration: RegistrationData): Promise<void> {
  await apiPost("/api/auth/register", { body: toRegisterRequest(registration), timeout: "slow" });
}

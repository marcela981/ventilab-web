/*
* Funcionalidad: Auth service
* Descripción: Backend calls of the login page through the typed api-client: local login (`POST /api/auth/login`) and Google sign-in with a Google Identity Services ID token (`POST /api/auth/google`). Both routes use the slow timeout (SLOW_ROUTES, backend cold start). Errors reject with ApiError. Logout and session loading belong to @shared/session. Depends on @shared/api-client, the auth DTOs and mappers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost } from "@shared/api-client/api-request";
import type { LoginCredentials } from "../../application/entities/auth.entity";
import type { LoginResponseDTO } from "../dtos/auth.dto";
import { toLoginRequest } from "../mappers/auth.mapper";

export async function loginWithPassword(credentials: LoginCredentials): Promise<LoginResponseDTO> {
  const { data } = await apiPost("/api/auth/login", { body: toLoginRequest(credentials) });

  return data;
}

export async function loginWithGoogle(idToken: string): Promise<LoginResponseDTO> {
  const { data } = await apiPost("/api/auth/google", { body: { idToken } });

  return data;
}

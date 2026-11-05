/*
* Funcionalidad: Session entities
* Descripción: Session types derived from the generated OpenAPI schema: SessionUser (`AuthUserDTO` returned by `GET /api/auth/me`), Role (backend enum), Permission (strings embedded in the access token and echoed by `/me`), the session status, the token pair stored by establishSession and the `user:role-changed` socket payload. Types and the role list only; depends on api-client generated types. v1.1: (Ajustes D4): SessionUser carries the optional appearance preference of AuthUserDTO (themeMode, themePalette).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type AuthUserDTO = components["schemas"]["AuthUserDTO"];

// The appearance preference is optional: an older backend (or a cached snapshot) may not send it.
export type SessionUser = Omit<AuthUserDTO, "themeMode" | "themePalette"> & Partial<Pick<AuthUserDTO, "themeMode" | "themePalette">>;

export type MeResponse = components["schemas"]["MeResponseDTO"];

export type Role = SessionUser["role"];

export type Permission = MeResponse["permissions"][number];

export const ROLES: readonly Role[] = ["STUDENT", "TEACHER", "ADMIN"];

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export type SessionTokens = {
  accessToken: string
  refreshToken: string
};

export type RoleChangedEvent = {
  userId: string
  previousRole: Role
  newRole: Role
};

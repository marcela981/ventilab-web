/*
* Funcionalidad: Session context
* Descripción: React context and value type shared by AuthProvider, useSession and the route guards: status, user, role, permissions, last load error, role/permission checks and the session actions (establishSession, signOut, reloadSession, handleRoleChanged). Depends on react and session entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import type { Permission, Role, RoleChangedEvent, SessionStatus, SessionTokens, SessionUser } from "./session.entity";

export type SessionContextValue = {
  status: SessionStatus
  user: SessionUser | null
  role: Role | null
  permissions: readonly Permission[]
  error: ApiError | null
  hasRole: (...roles: Role[]) => boolean
  hasPermission: (permission: Permission) => boolean
  establishSession: (tokens: SessionTokens) => Promise<SessionUser>
  signOut: () => Promise<void>
  reloadSession: () => Promise<SessionUser | null>
  handleRoleChanged: (event: RoleChangedEvent) => Promise<boolean>
};

export const SessionContext = createContext<SessionContextValue | null>(null);

/*
* Funcionalidad: Session context
* Descripción: React context and value type shared by AuthProvider, useSession and the route guards: status, user, role, permissions, last load error, role/permission checks and the session actions (establishSession, signOut, reloadSession, handleRoleChanged). v1.1 (T9): `signedOut` is true after a voluntary signOut until the next session, so guards can send the user to a clean login; optional so test doubles may omit it. Depends on react and session entities. v1.2 (B3.7): `expired` is true after the api-client reported the session as expired until the next session, so guards can show the "session expired" notice on the login; optional like `signedOut`.
* Versión: 1.2
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
  signedOut?: boolean
  expired?: boolean
  hasRole: (...roles: Role[]) => boolean
  hasPermission: (permission: Permission) => boolean
  establishSession: (tokens: SessionTokens) => Promise<SessionUser>
  signOut: () => Promise<void>
  reloadSession: () => Promise<SessionUser | null>
  handleRoleChanged: (event: RoleChangedEvent) => Promise<boolean>
};

export const SessionContext = createContext<SessionContextValue | null>(null);

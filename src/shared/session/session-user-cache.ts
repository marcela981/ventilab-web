/*
* Funcionalidad: Session user cache
* Descripción: Persisted snapshot (localStorage `ventilab_session_user`) of the backend session user returned by `GET /api/auth/me`. AuthProvider writes it on every authenticated load and removes it when the session ends. It exists for the legacy coexistence period: legacy pages decide whether a user is signed in synchronously at page load (before /me answers), so the legacy authService reads this snapshot to recognise users who signed in through the new login. New code reads the user from useSession, never from here. Depends on session entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ROLES } from "./session.entity";
import type { Role, SessionUser } from "./session.entity";

export const SESSION_USER_KEY = "ventilab_session_user";

function isSessionUser(value: unknown): value is SessionUser {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<Record<keyof SessionUser, unknown>>;

  return typeof candidate.id === "string"
    && typeof candidate.email === "string"
    && ROLES.includes(candidate.role as Role);
}

export function readCachedSessionUser(): SessionUser | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(SESSION_USER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    return isSessionUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedSessionUser(user: SessionUser): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    }
  } catch {
    // Storage unavailable: legacy pages simply do not see the backend session.
  }
}

export function clearCachedSessionUser(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_USER_KEY);
    }
  } catch {
    // Storage unavailable: nothing was cached.
  }
}

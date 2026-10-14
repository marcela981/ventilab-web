/*
* Funcionalidad: Login returnTo resolution
* Descripción: Reads the route to return to after login from the query: `returnTo` (new guards) or the legacy `returnUrl` (legacy withAuth) and `callbackUrl` (legacy/NextAuth redirects). Every candidate goes through the session sanitizeReturnTo, so only same-origin relative paths outside /auth/ are accepted (no open redirect). Depends on @shared/session.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { RETURN_TO_PARAM, sanitizeReturnTo } from "@shared/session";

export type LoginQuery = Readonly<Record<string, string | string[] | undefined>>;

const RETURN_TO_KEYS = [RETURN_TO_PARAM, "returnUrl", "callbackUrl"] as const;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveReturnTo(query: LoginQuery): string | null {
  for (const key of RETURN_TO_KEYS) {
    const safe = sanitizeReturnTo(firstValue(query[key]));

    if (safe) {
      return safe;
    }
  }

  return null;
}

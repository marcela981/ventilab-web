/*
* Funcionalidad: HTTP timeout categories
* Descripción: `fast` (8 s) and `slow` (60 s) timeout categories and the SLOW_ROUTES registry: every route on the backend cold-start path (database / Supabase wake-up) defaults to slow. A per-call category always wins. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type TimeoutCategory = "fast" | "slow";

export const TIMEOUTS: Record<TimeoutCategory, number> = {
  fast: 8_000,
  slow: 60_000,
};

export const SLOW_ROUTES: readonly RegExp[] = [
  /^\/api\/auth\/(login|google|refresh|me)$/,
  /^\/health(\/ready)?$/,
  /^\/api\/users\/me$/,
];

function pathnameOf(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0] ?? "";

  return withoutQuery.replace(/^[a-z]+:\/\/[^/]+/i, "") || "/";
}

export function isSlowRoute(url: string): boolean {
  const pathname = pathnameOf(url);

  return SLOW_ROUTES.some((pattern) => pattern.test(pathname));
}

export function resolveTimeout(url: string | undefined, category?: TimeoutCategory): number {
  if (category) {
    return TIMEOUTS[category];
  }

  return url && isSlowRoute(url) ? TIMEOUTS.slow : TIMEOUTS.fast;
}

/*
* Funcionalidad: HTTP timeout categories
* Descripción: `fast` (8 s) and `slow` (60 s) timeout categories and the SLOW_ROUTES registry: every route on the backend cold-start path (database / Supabase wake-up) defaults to slow. A per-call category always wins. No dependencies. v1.1 (W3, Bloque 2): GET /api/curriculum/tree and /api/progress/summary are slow routes (cold start of the /learn Currículo tab).
* Versión: 1.1
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
  // Learning (W3, Bloque 2): the /learn Currículo tab is the first screen a student opens after signing in.
  /^\/api\/curriculum\/tree$/,
  /^\/api\/progress\/summary$/,
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

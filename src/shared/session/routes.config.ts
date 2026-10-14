/*
* Funcionalidad: Route table
* Descripción: Typed route table keyed by Next pathname pattern (`access: public | authenticated`, optional `roles`), the login path, the default landing route per role and an open-redirect safe `returnTo` helper that only accepts same-origin relative paths outside `/auth/`. The table lists the current pages as data; legacy pages keep their own guards. v1.1 (T9 follow-up): isPathAllowedForRole checks a concrete path (dynamic segments, query/hash ignored, static routes first) against the table, and resolvePostLoginRoute falls back to the role home when the returnTo route is not allowed for the role (the target page would bounce the user). v1.2 (T11a): /my-group (STUDENT only) and /groups (TEACHER, ADMIN) of the groups feature. Depends on session entities.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { Role } from "./session.entity";

export type RouteAccess = "public" | "authenticated";

export type RouteConfig = {
  access: RouteAccess
  roles?: readonly Role[]
};

export const LOGIN_PATH = "/auth/login";

export const RETURN_TO_PARAM = "returnTo";

const STAFF: readonly Role[] = ["TEACHER", "ADMIN"];
const ADMIN_ONLY: readonly Role[] = ["ADMIN"];
const STUDENT_ONLY: readonly Role[] = ["STUDENT"];

export const ROUTES = {
  "/": { access: "authenticated" },
  "/auth/login": { access: "public" },
  "/auth/register": { access: "public" },
  "/auth/forgot-password": { access: "public" },
  "/auth/error": { access: "public" },
  "/auth/access-denied": { access: "public" },
  "/dashboard": { access: "authenticated" },
  "/profile": { access: "authenticated" },
  "/my-group": { access: "authenticated", roles: STUDENT_ONLY },
  "/groups": { access: "authenticated", roles: STAFF },
  "/achievements": { access: "authenticated" },
  "/flashcards": { access: "authenticated" },
  "/search": { access: "authenticated" },
  "/simulador": { access: "authenticated" },
  "/teaching": { access: "authenticated" },
  "/teaching/[moduleId]/[lessonId]": { access: "authenticated" },
  "/evaluation": { access: "authenticated" },
  "/evaluation/[activityId]": { access: "authenticated" },
  "/evaluation/manage": { access: "authenticated", roles: STAFF },
  "/evaluation/manage/new": { access: "authenticated", roles: STAFF },
  "/evaluation/manage/[activityId]/edit": { access: "authenticated", roles: STAFF },
  "/evaluation/grade": { access: "authenticated", roles: STAFF },
  "/evaluation/grade/[activityId]": { access: "authenticated", roles: STAFF },
  "/admin/search-analytics": { access: "authenticated", roles: STAFF },
  "/panel": { access: "authenticated", roles: STAFF },
  "/panel/students": { access: "authenticated", roles: STAFF },
  "/panel/students/[id]": { access: "authenticated", roles: STAFF },
  "/panel/admin": { access: "authenticated", roles: ADMIN_ONLY },
  "/panel/settings": { access: "authenticated", roles: ADMIN_ONLY },
} as const satisfies Record<string, RouteConfig>;

export type RoutePath = keyof typeof ROUTES;

export const DEFAULT_ROUTE_BY_ROLE: Record<Role, RoutePath> = {
  STUDENT: "/dashboard",
  TEACHER: "/panel",
  ADMIN: "/panel",
};

export function findRoute(pathname: string): RouteConfig | null {
  return Object.prototype.hasOwnProperty.call(ROUTES, pathname) ? ROUTES[pathname as RoutePath] : null;
}

const PROBE_ORIGIN = "http://returnto.invalid";

// Browsers treat "\" as "/" and drop tabs/newlines, so "/\evil.com" or "/\n/evil.com" can escape the origin.
const UNSAFE_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

export function sanitizeReturnTo(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  if (UNSAFE_CHARACTERS.test(value) || /%(0[0-9a-f]|1[0-9a-f]|5c)/i.test(value)) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(value, PROBE_ORIGIN);
  } catch {
    return null;
  }

  if (parsed.origin !== PROBE_ORIGIN || parsed.pathname === LOGIN_PATH || parsed.pathname.startsWith("/auth/")) {
    return null;
  }

  return value;
}

export function buildLoginUrl(returnTo?: string | null): string {
  const safe = sanitizeReturnTo(returnTo);

  return safe ? `${LOGIN_PATH}?${RETURN_TO_PARAM}=${encodeURIComponent(safe)}` : LOGIN_PATH;
}

function patternMatches(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split("/");
  const pathSegments = pathname.split("/");

  return patternSegments.length === pathSegments.length
    && patternSegments.every((segment, index) => segment === pathSegments[index]
      || (segment.startsWith("[") && segment.endsWith("]") && pathSegments[index] !== ""));
}

// Role check of a concrete path ("/panel/students/abc?tab=1"). Paths outside the table are allowed:
// their own page decides.
export function isPathAllowedForRole(path: string, role: Role): boolean {
  const { pathname } = new URL(path, PROBE_ORIGIN);
  // A static route ("/evaluation/manage") wins over a dynamic one ("/evaluation/[activityId]").
  const pattern = findRoute(pathname) ? pathname : Object.keys(ROUTES).find((key) => patternMatches(key, pathname));
  const route: RouteConfig | null = pattern ? findRoute(pattern) : null;

  return !route?.roles || route.roles.includes(role);
}

// A returnTo the role cannot open would be bounced by that page's guard (back to login or to
// another page), so it falls back to the role home.
export function resolvePostLoginRoute(returnTo: unknown, role: Role): string {
  const safe = sanitizeReturnTo(returnTo);

  return safe && isPathAllowedForRole(safe, role) ? safe : DEFAULT_ROUTE_BY_ROLE[role];
}

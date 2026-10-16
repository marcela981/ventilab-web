/*
* Funcionalidad: Route table
* Descripción: Typed route table keyed by Next pathname pattern (`access: public | authenticated`, optional `roles`), the login path, the default landing route per role and an open-redirect safe `returnTo` helper that only accepts same-origin relative paths outside `/auth/`. The table lists the current pages as data; legacy pages keep their own guards. v1.1 (T9 follow-up): isPathAllowedForRole checks a concrete path (dynamic segments, query/hash ignored, static routes first) against the table, and resolvePostLoginRoute falls back to the role home when the returnTo route is not allowed for the role (the target page would bounce the user). v1.2 (T11a): /my-group (STUDENT only) and /groups (TEACHER, ADMIN) of the groups feature. v1.3 (T11b): /groups/[groupId] (TEACHER, ADMIN). v1.4 (T0 learning): learning routes /learn, /learn/[sectionId], /learn/modules/[moduleId] and the lesson page viewer for every authenticated role (teachers and admins use them as preview), the module print view and the content-editor routes /content, /content/pages/[pageId] for TEACHER and ADMIN. v1.5 (S0 evaluations): student evaluation routes /evaluations, /evaluations/[evaluationId] and its attempt and result pages for every authenticated role; authoring (/evaluations/manage/**) and grading (/grading/**) routes for TEACHER and ADMIN. The legacy /evaluation* routes stay declared until they redirect (R1). v1.6 (R1 evaluations): the legacy /evaluation/** pages now only redirect to the new routes; their entries stay declared with the same roles so a legacy returnTo keeps its role check (a student is not sent to a staff-only redirect). v1.7 (A1 ai-chat): the AI assistant routes /assistant and /assistant/[conversationId] for every authenticated role (the backend requires ai-tutor:use, minimum STUDENT). v1.8 (T5 simulation): the simulator routes /simulator, /simulator/sessions/[sessionId] and its result and replay pages for every authenticated role (the backend requires simulation:read/control, minimum STUDENT); the legacy /simulador stays declared. v1.9 (T11 simulation): the case editor routes /simulator/cases, /simulator/cases/new and /simulator/cases/[id]/edit for TEACHER and ADMIN (the backend requires clinical-cases:manage, minimum TEACHER). Depends on session entities.
* Versión: 1.9
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
  "/groups/[groupId]": { access: "authenticated", roles: STAFF },
  "/achievements": { access: "authenticated" },
  "/flashcards": { access: "authenticated" },
  "/search": { access: "authenticated" },
  "/simulador": { access: "authenticated" },
  "/simulator": { access: "authenticated" },
  "/simulator/sessions/[sessionId]": { access: "authenticated" },
  "/simulator/sessions/[sessionId]/result": { access: "authenticated" },
  "/simulator/sessions/[sessionId]/replay": { access: "authenticated" },
  "/simulator/cases": { access: "authenticated", roles: STAFF },
  "/simulator/cases/new": { access: "authenticated", roles: STAFF },
  "/simulator/cases/[id]/edit": { access: "authenticated", roles: STAFF },
  "/learn": { access: "authenticated" },
  "/learn/[sectionId]": { access: "authenticated" },
  "/learn/modules/[moduleId]": { access: "authenticated" },
  "/learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber]": { access: "authenticated" },
  "/learn/modules/[moduleId]/print": { access: "authenticated", roles: STAFF },
  "/content": { access: "authenticated", roles: STAFF },
  "/content/pages/[pageId]": { access: "authenticated", roles: STAFF },
  "/teaching": { access: "authenticated" },
  "/teaching/[moduleId]/[lessonId]": { access: "authenticated" },
  // Legacy routes: thin redirects to /evaluations, /evaluations/manage and /grading (R1).
  "/evaluation": { access: "authenticated" },
  "/evaluation/[activityId]": { access: "authenticated" },
  "/evaluation/manage": { access: "authenticated", roles: STAFF },
  "/evaluation/manage/new": { access: "authenticated", roles: STAFF },
  "/evaluation/manage/[activityId]/edit": { access: "authenticated", roles: STAFF },
  "/evaluation/grade": { access: "authenticated", roles: STAFF },
  "/evaluation/grade/[activityId]": { access: "authenticated", roles: STAFF },
  "/evaluations": { access: "authenticated" },
  "/evaluations/[evaluationId]": { access: "authenticated" },
  "/evaluations/[evaluationId]/attempts/[attemptId]": { access: "authenticated" },
  "/evaluations/[evaluationId]/attempts/[attemptId]/result": { access: "authenticated" },
  "/evaluations/manage": { access: "authenticated", roles: STAFF },
  "/evaluations/manage/new": { access: "authenticated", roles: STAFF },
  "/evaluations/manage/[evaluationId]/edit": { access: "authenticated", roles: STAFF },
  "/evaluations/manage/[evaluationId]/assignments": { access: "authenticated", roles: STAFF },
  "/grading": { access: "authenticated", roles: STAFF },
  "/grading/attempts/[attemptId]": { access: "authenticated", roles: STAFF },
  "/grading/evaluations/[evaluationId]": { access: "authenticated", roles: STAFF },
  "/assistant": { access: "authenticated" },
  "/assistant/[conversationId]": { access: "authenticated" },
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

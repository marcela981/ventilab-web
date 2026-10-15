/*
* Funcionalidad: Route table tests
* Descripción: Open-redirect safety of the returnTo helper (rejects protocol-relative, absolute, javascript: and auth-page targets), login URL building, route lookup by Next pathname pattern and the default landing route per role. v1.1 (T9 follow-up): role access of concrete paths (dynamic segments, query strings) and the post-login fallback to the role home when the returnTo route is not allowed for the role. v1.2 (T11a): /my-group is student-only and /groups is staff-only. v1.3 (T11b): /groups/[groupId] is staff-only. v1.4 (T0 learning): learning routes for every role, module print view and content-editor routes for staff only. v1.5 (S0 evaluations): student evaluation routes for every role, authoring and grading routes for staff only. Depends on vitest and routes.config.
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  buildLoginUrl,
  DEFAULT_ROUTE_BY_ROLE,
  findRoute,
  LOGIN_PATH,
  isPathAllowedForRole,
  resolvePostLoginRoute,
  sanitizeReturnTo,
} from "./routes.config";

describe("sanitizeReturnTo", () => {
  it.each([
    "//evil.com",
    "//evil.com/path",
    "https://evil.com",
    "http://evil.com/teaching",
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "/\\evil.com",
    "\\\\evil.com",
    " //evil.com",
    "/%0a//evil.com\n",
    "teaching",
    "",
    "/auth/login",
    "/auth/login?returnTo=/profile",
  ])("rejects %j", (value) => {
    expect(sanitizeReturnTo(value)).toBeNull();
  });

  it("rejects non-string values", () => {
    expect(sanitizeReturnTo(undefined)).toBeNull();
    expect(sanitizeReturnTo(["/profile"])).toBeNull();
  });

  it.each(["/profile", "/teaching/module-1/lesson-2?tab=quiz#top", "/"])("accepts %j", (value) => {
    expect(sanitizeReturnTo(value)).toBe(value);
  });
});

describe("buildLoginUrl", () => {
  it("encodes a safe returnTo", () => {
    expect(buildLoginUrl("/teaching/m1/l2?tab=a")).toBe(`${LOGIN_PATH}?returnTo=%2Fteaching%2Fm1%2Fl2%3Ftab%3Da`);
  });

  it("drops an unsafe returnTo", () => {
    expect(buildLoginUrl("https://evil.com")).toBe(LOGIN_PATH);
  });
});

describe("resolvePostLoginRoute", () => {
  it("prefers a safe returnTo", () => {
    expect(resolvePostLoginRoute("/profile", "STUDENT")).toBe("/profile");
  });

  it("falls back to the role landing route", () => {
    expect(resolvePostLoginRoute("//evil.com", "TEACHER")).toBe(DEFAULT_ROUTE_BY_ROLE.TEACHER);
  });

  it("falls back to the role landing route when the returnTo route is not allowed for the role", () => {
    expect(resolvePostLoginRoute("/panel/students/abc?tab=1", "STUDENT")).toBe(DEFAULT_ROUTE_BY_ROLE.STUDENT);
    expect(resolvePostLoginRoute("/panel/admin", "TEACHER")).toBe(DEFAULT_ROUTE_BY_ROLE.TEACHER);
    expect(resolvePostLoginRoute("/panel/students/abc?tab=1", "TEACHER")).toBe("/panel/students/abc?tab=1");
  });
});

describe("isPathAllowedForRole", () => {
  it("matches dynamic segments and ignores the query string", () => {
    expect(isPathAllowedForRole("/evaluation/grade/a1?x=1", "STUDENT")).toBe(false);
    expect(isPathAllowedForRole("/evaluation/grade/a1?x=1", "ADMIN")).toBe(true);
    expect(isPathAllowedForRole("/teaching/m1/l2#step", "STUDENT")).toBe(true);
  });

  it("prefers a static route over a dynamic one with the same shape", () => {
    expect(isPathAllowedForRole("/evaluation/manage", "STUDENT")).toBe(false);
    expect(isPathAllowedForRole("/evaluation/a1", "STUDENT")).toBe(true);
  });

  it("allows paths that are not in the route table (their own page decides)", () => {
    expect(isPathAllowedForRole("/unknown/page", "STUDENT")).toBe(true);
  });
});

describe("learning and content-editor routes", () => {
  it("lets every role open the learning viewer and only staff open print and the content editor", () => {
    for (const role of ["STUDENT", "TEACHER", "ADMIN"] as const) {
      expect(isPathAllowedForRole("/learn", role)).toBe(true);
      expect(isPathAllowedForRole("/learn/section-1", role)).toBe(true);
      expect(isPathAllowedForRole("/learn/modules/m1", role)).toBe(true);
      expect(isPathAllowedForRole("/learn/modules/m1/lessons/l1/2", role)).toBe(true);
    }

    expect(isPathAllowedForRole("/learn/modules/m1/print", "STUDENT")).toBe(false);
    expect(isPathAllowedForRole("/learn/modules/m1/print", "TEACHER")).toBe(true);
    expect(isPathAllowedForRole("/content", "STUDENT")).toBe(false);
    expect(isPathAllowedForRole("/content/pages/p1", "STUDENT")).toBe(false);
    expect(isPathAllowedForRole("/content/pages/p1", "ADMIN")).toBe(true);
  });
});

describe("evaluation routes", () => {
  it("lets every role open the student evaluation pages", () => {
    for (const role of ["STUDENT", "TEACHER", "ADMIN"] as const) {
      expect(isPathAllowedForRole("/evaluations", role)).toBe(true);
      expect(isPathAllowedForRole("/evaluations/e1", role)).toBe(true);
      expect(isPathAllowedForRole("/evaluations/e1/attempts/a1", role)).toBe(true);
      expect(isPathAllowedForRole("/evaluations/e1/attempts/a1/result", role)).toBe(true);
    }
  });

  it("restricts authoring and grading to teachers and admins", () => {
    const staffPaths = [
      "/evaluations/manage",
      "/evaluations/manage/new",
      "/evaluations/manage/e1/edit",
      "/evaluations/manage/e1/assignments",
      "/grading",
      "/grading/attempts/a1",
      "/grading/evaluations/e1",
    ];

    for (const path of staffPaths) {
      expect(isPathAllowedForRole(path, "STUDENT")).toBe(false);
      expect(isPathAllowedForRole(path, "TEACHER")).toBe(true);
      expect(isPathAllowedForRole(path, "ADMIN")).toBe(true);
    }
  });
});

describe("findRoute", () => {
  it("finds a route by its Next pathname pattern", () => {
    expect(findRoute("/panel/admin")).toMatchObject({ access: "authenticated", roles: ["ADMIN"] });
    expect(findRoute(LOGIN_PATH)).toMatchObject({ access: "public" });
  });

  it("restricts /my-group to students and /groups to teachers and admins", () => {
    expect(findRoute("/my-group")).toMatchObject({ access: "authenticated", roles: ["STUDENT"] });
    expect(findRoute("/groups")).toMatchObject({ access: "authenticated", roles: ["TEACHER", "ADMIN"] });
    expect(isPathAllowedForRole("/my-group", "TEACHER")).toBe(false);
    expect(isPathAllowedForRole("/groups?type=STUDENT", "STUDENT")).toBe(false);
    expect(isPathAllowedForRole("/groups", "ADMIN")).toBe(true);
  });

  it("restricts the group detail to teachers and admins", () => {
    expect(findRoute("/groups/[groupId]")).toMatchObject({ access: "authenticated", roles: ["TEACHER", "ADMIN"] });
    expect(isPathAllowedForRole("/groups/g1", "TEACHER")).toBe(true);
    expect(isPathAllowedForRole("/groups/g1?tab=members", "ADMIN")).toBe(true);
    expect(isPathAllowedForRole("/groups/g1", "STUDENT")).toBe(false);
  });

  it("returns null for unknown paths", () => {
    expect(findRoute("/does-not-exist")).toBeNull();
  });

  it("only lands each role on a route that role can access", () => {
    for (const [role, path] of Object.entries(DEFAULT_ROUTE_BY_ROLE)) {
      const roles = findRoute(path)?.roles;

      expect(roles === undefined || roles.includes(role as keyof typeof DEFAULT_ROUTE_BY_ROLE)).toBe(true);
    }
  });
});

/*
* Funcionalidad: Navigation config tests
* Descripción: Verifies that every nav item points to an existing route of routes.config that its roles can reach, that items are filtered by role, and that the active item is the longest matching route. v1.1 (T11a): students get /my-group, teachers and admins get /groups. v1.2 (T0 learning): every role gets /learn, only teachers and admins get /content. v1.3 (S0 evaluations): every role gets /evaluations, only teachers and admins get /evaluations/manage and /grading, the legacy /evaluation items are gone and /evaluations/manage wins over /evaluations as the active item. v1.4 (G1 grading): only "Calificar" names a badge key (gradingPending). v1.5 (A1 ai-chat): every role gets "Asistente IA" (/assistant), active on its conversation pages. Depends on vitest and the session route table.
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { findRoute } from "@shared/session/routes.config";
import { findActiveHref, getNavItems, NAV_ITEMS } from "./nav.config";

describe("NAV_ITEMS", () => {
  it.each(NAV_ITEMS.map((item) => [item.href, item]))("%s exists and is reachable by its roles", (_href, item) => {
    const route = findRoute(item.href);

    expect(route).not.toBeNull();
    expect(item.roles.length).toBeGreaterThan(0);

    for (const role of item.roles) {
      expect(route?.roles === undefined || route.roles.includes(role)).toBe(true);
    }
  });
});

describe("getNavItems", () => {
  it("returns nothing without a role", () => {
    expect(getNavItems(null)).toEqual([]);
  });

  it("gives students the learning routes and no staff routes", () => {
    const hrefs = getNavItems("STUDENT").map((item) => item.href);

    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/profile");
    expect(hrefs).toContain("/my-group");
    expect(hrefs).not.toContain("/groups");
    expect(hrefs.some((href) => href.startsWith("/panel"))).toBe(false);
  });

  it("gives teachers the panel but not the admin routes", () => {
    const hrefs = getNavItems("TEACHER").map((item) => item.href);

    expect(hrefs).toContain("/panel");
    expect(hrefs).toContain("/panel/students");
    expect(hrefs).not.toContain("/panel/admin");
    expect(hrefs).not.toContain("/dashboard");
    expect(hrefs).toContain("/groups");
    expect(hrefs).not.toContain("/my-group");
  });

  it("gives admins the admin routes", () => {
    const hrefs = getNavItems("ADMIN").map((item) => item.href);

    expect(hrefs).toContain("/panel/admin");
    expect(hrefs).toContain("/panel/settings");
    expect(hrefs).toContain("/groups");
    expect(hrefs).not.toContain("/my-group");
  });
});

describe("learning navigation", () => {
  it("shows Aprender to every role and Contenido to staff only", () => {
    expect(getNavItems("STUDENT").map((item) => item.href)).toEqual(expect.arrayContaining(["/learn"]));
    expect(getNavItems("STUDENT").map((item) => item.href)).not.toContain("/content");
    expect(getNavItems("TEACHER").map((item) => item.href)).toEqual(expect.arrayContaining(["/learn", "/content"]));
    expect(getNavItems("ADMIN").map((item) => item.href)).toEqual(expect.arrayContaining(["/learn", "/content"]));
  });
});

describe("assistant navigation", () => {
  it("shows Asistente IA to every role and keeps it active on a conversation page", () => {
    for (const role of ["STUDENT", "TEACHER", "ADMIN"] as const) {
      const items = getNavItems(role);

      expect(items.find((item) => item.href === "/assistant")?.label).toBe("Asistente IA");
      expect(findActiveHref(items, "/assistant/c1")).toBe("/assistant");
    }
  });
});

describe("evaluations navigation", () => {
  it("shows Evaluaciones to every role and the authoring and grading items to staff only", () => {
    const student = getNavItems("STUDENT").map((item) => item.href);

    expect(student).toContain("/evaluations");
    expect(student).not.toContain("/evaluations/manage");
    expect(student).not.toContain("/grading");

    for (const role of ["TEACHER", "ADMIN"] as const) {
      expect(getNavItems(role).map((item) => item.href)).toEqual(expect.arrayContaining(["/evaluations", "/evaluations/manage", "/grading"]));
    }
  });

  it("drops the legacy evaluation items", () => {
    expect(NAV_ITEMS.some((item) => item.href.startsWith("/evaluation/") || item.href === "/evaluation")).toBe(false);
  });

  it("marks the authoring item active on its pages and Evaluaciones on the student pages", () => {
    const items = getNavItems("TEACHER");

    expect(findActiveHref(items, "/evaluations/manage/[evaluationId]/edit")).toBe("/evaluations/manage");
    expect(findActiveHref(items, "/evaluations/[evaluationId]")).toBe("/evaluations");
    expect(findActiveHref(items, "/grading/attempts/[attemptId]")).toBe("/grading");
  });
});

describe("findActiveHref", () => {
  const items = getNavItems("ADMIN");

  it("prefers the longest matching route", () => {
    expect(findActiveHref(items, "/panel/students/[id]")).toBe("/panel/students");
    expect(findActiveHref(items, "/panel")).toBe("/panel");
  });

  it("does not match a sibling prefix", () => {
    expect(findActiveHref(items, "/panelx")).toBeNull();
  });
});

describe("navigation badges", () => {
  it("only Calificar carries the gradingPending badge key", () => {
    const withBadges = NAV_ITEMS.filter((item) => item.badgeKey !== undefined);

    expect(withBadges.map((item) => [item.href, item.badgeKey])).toEqual([["/grading", "gradingPending"]]);
  });
});

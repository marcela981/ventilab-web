/*
* Funcionalidad: Navigation config tests
* Descripción: Verifies that every nav item points to an existing route of routes.config that its roles can reach, that items are filtered by role, and that the active item is the longest matching route. v1.1 (T11a): students get /my-group, teachers and admins get /groups. v1.2 (T0 learning): every role gets /learn, only teachers and admins get /content. v1.3 (S0 evaluations): every role gets /evaluations, only teachers and admins get /evaluations/manage and /grading, the legacy /evaluation items are gone and /evaluations/manage wins over /evaluations as the active item. v1.4 (G1 grading): only "Calificar" names a badge key (gradingPending). v1.5 (A1 ai-chat): every role gets "Asistente IA" (/assistant), active on its conversation pages. v1.6 (T5 simulation): every role gets "Simulador" (/simulator), active on its session pages. v1.7 (T11 simulation): only teachers and admins get "Casos clínicos" (/simulator/cases), which wins over /simulator as the active item on the case editor pages. v1.8 (T13 simulation): the legacy /simulador is "Ventilador real", so students see exactly one "Simulador" (/simulator). Depends on vitest and the session route table. v1.9 (T12 ventilator-lab): the legacy /simulador
  "Ventilador real" item is replaced by "Laboratorio" (/lab, every role, device indicator), active on every lab page. v1.10 (O5 operation): final navigation per role (student starts at /me with Mis notas and Mis calificaciones and no admin items; teacher starts at /teacher and sees Estado del sistema but no admin-only item; admin sees everything, the Administración section contiguous at the end), no legacy /dashboard or /panel* items, the notificationsUnread badge on Notificaciones.
* Versión: 1.10
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { findRoute } from "@shared/session/routes.config";
import { ADMIN_SECTION, findActiveHref, getNavItems, NAV_ITEMS } from "./nav.config";

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

  it("gives students their space first and no staff or admin routes", () => {
    const hrefs = getNavItems("STUDENT").map((item) => item.href);

    expect(hrefs[0]).toBe("/me");
    expect(hrefs).toEqual(expect.arrayContaining(["/me/notes", "/me/grades", "/notifications", "/profile", "/my-group"]));
    expect(hrefs).not.toContain("/groups");
    expect(hrefs).not.toContain("/teacher");
    expect(hrefs.some((href) => href.startsWith("/admin"))).toBe(false);
  });

  it("gives teachers the teacher dashboard first and the system status but not the admin-only routes", () => {
    const hrefs = getNavItems("TEACHER").map((item) => item.href);

    expect(hrefs[0]).toBe("/teacher");
    expect(hrefs).toEqual(expect.arrayContaining(["/groups", "/grading", "/notifications", "/admin/status"]));
    expect(hrefs).not.toContain("/admin/users");
    expect(hrefs).not.toContain("/admin/settings");
    expect(hrefs).not.toContain("/me");
    expect(hrefs).not.toContain("/my-group");
  });

  it("gives admins every staff and admin route", () => {
    const hrefs = getNavItems("ADMIN").map((item) => item.href);

    expect(hrefs[0]).toBe("/teacher");
    expect(hrefs).toEqual(expect.arrayContaining([
      "/groups",
      "/grading",
      "/notifications",
      "/admin/users",
      "/admin/settings",
      "/admin/audit",
      "/admin/ai",
      "/admin/research",
      "/admin/status",
    ]));
    expect(hrefs).not.toContain("/me");
  });

  it("drops the legacy items replaced by the migration (/dashboard, /panel*)", () => {
    expect(NAV_ITEMS.some((item) => item.href === "/dashboard" || item.href === "/panel" || item.href.startsWith("/panel/"))).toBe(false);
  });

  it("keeps the Administración section contiguous at the end", () => {
    const sections = NAV_ITEMS.map((item) => item.section ?? null);
    const first = sections.indexOf(ADMIN_SECTION);

    expect(first).toBeGreaterThan(0);
    expect(sections.slice(first).every((section) => section === ADMIN_SECTION)).toBe(true);
    expect(NAV_ITEMS.filter((item) => item.href.startsWith("/admin/")).every((item) => item.section === ADMIN_SECTION)).toBe(true);
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

describe("simulator navigation", () => {
  it("shows Simulador (/simulator) to every role and keeps it active on the session pages", () => {
    for (const role of ["STUDENT", "TEACHER", "ADMIN"] as const) {
      const items = getNavItems(role);

      expect(items.find((item) => item.href === "/simulator")?.label).toBe("Simulador");
      expect(findActiveHref(items, "/simulator/sessions/[sessionId]/replay")).toBe("/simulator");
    }
  });

  it("has a single Simulador item: the legacy /simulador entry is gone (T12 ventilator-lab)", () => {
    for (const role of ["STUDENT", "TEACHER", "ADMIN"] as const) {
      const items = getNavItems(role);

      expect(items.filter((item) => item.label === "Simulador").map((item) => item.href)).toEqual(["/simulator"]);
      expect(items.some((item) => item.href === "/simulador")).toBe(false);
    }
  });
});

describe("lab navigation (T12 ventilator-lab)", () => {
  it("shows Laboratorio (/lab) with the device indicator to every role, active on every lab page", () => {
    for (const role of ["STUDENT", "TEACHER", "ADMIN"] as const) {
      const items = getNavItems(role);
      const lab = items.find((item) => item.href === "/lab");

      expect(lab).toMatchObject({ label: "Laboratorio", indicator: "ventilatorDevice" });
      for (const page of ["/lab", "/lab/reservations", "/lab/live", "/lab/recordings/[recordingId]"]) {
        expect(findActiveHref(items, page)).toBe("/lab");
      }
    }
  });

  it("gives the indicator to the lab item only", () => {
    expect(NAV_ITEMS.filter((item) => item.indicator !== undefined).map((item) => item.href)).toEqual(["/lab"]);
  });
});

describe("case editor navigation", () => {
  it("shows Casos clínicos (/simulator/cases) to teachers and admins only, active on the editor pages", () => {
    expect(getNavItems("STUDENT").map((item) => item.href)).not.toContain("/simulator/cases");

    for (const role of ["TEACHER", "ADMIN"] as const) {
      const items = getNavItems(role);

      expect(items.find((item) => item.href === "/simulator/cases")?.label).toBe("Casos clínicos");
      expect(findActiveHref(items, "/simulator/cases/[id]/edit")).toBe("/simulator/cases");
      expect(findActiveHref(items, "/simulator/sessions/[sessionId]")).toBe("/simulator");
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
    expect(findActiveHref(items, "/teacher/students/[userId]")).toBe("/teacher");
    expect(findActiveHref(items, "/evaluations/manage/new")).toBe("/evaluations/manage");
    expect(findActiveHref(getNavItems("STUDENT"), "/me/notes")).toBe("/me/notes");
    expect(findActiveHref(getNavItems("STUDENT"), "/me")).toBe("/me");
  });

  it("does not match a sibling prefix", () => {
    expect(findActiveHref(items, "/teacherx")).toBeNull();
  });
});

describe("navigation badges", () => {
  it("Calificar carries gradingPending and Notificaciones notificationsUnread", () => {
    const withBadges = NAV_ITEMS.filter((item) => item.badgeKey !== undefined);

    expect(withBadges.map((item) => [item.href, item.badgeKey])).toEqual([
      ["/grading", "gradingPending"],
      ["/notifications", "notificationsUnread"],
    ]);
  });
});

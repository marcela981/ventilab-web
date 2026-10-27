/*
* Funcionalidad: Navigation config tests
* Descripción: Verifies that every nav item points to an existing route of routes.config that its roles can reach, that items are filtered by role, and that the active item is the longest matching route. v1.1 (T11a): students get /my-group, teachers and admins get /groups. v1.2 (T0 learning): every role gets /learn, only teachers and admins get /content. v1.3 (S0 evaluations): every role gets /evaluations, only teachers and admins get /evaluations/manage and /grading, the legacy /evaluation items are gone and /evaluations/manage wins over /evaluations as the active item. v1.4 (G1 grading): only "Calificar" names a badge key (gradingPending). v1.5 (A1 ai-chat): every role gets "Asistente IA" (/assistant), active on its conversation pages. v1.6 (T5 simulation): every role gets "Simulador" (/simulator), active on its session pages. v1.7 (T11 simulation): only teachers and admins get "Casos clínicos" (/simulator/cases), which wins over /simulator as the active item on the case editor pages. v1.8 (T13 simulation): the legacy /simulador is "Ventilador real", so students see exactly one "Simulador" (/simulator). Depends on vitest and the session route table. v1.9 (T12 ventilator-lab): the legacy /simulador
  "Ventilador real" item is replaced by "Laboratorio" (/lab, every role, device indicator), active on every lab page. v1.10 (O5 operation): final navigation per role (student starts at /me with Mis notas and Mis calificaciones and no admin items; teacher starts at /teacher and sees Estado del sistema but no admin-only item; admin sees everything, the Administración section contiguous at the end), no legacy /dashboard or /panel* items, the notificationsUnread badge on Notificaciones. v1.11 (W1 Bloque 1): short side menu in exact order per role (Simulador /simulador, Enseñanza, Evaluación; staff add the Panel docente section; admins add the Administración section); the student space, assistant, notifications and profile are out of it; Simulador carries the device indicator and stays active on the session and lab pages (activePrefixes, Next patterns and concrete paths) while Casos clínicos wins on the case editor; only Calificar keeps a badge.
* Versión: 1.11
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { findRoute } from "@shared/session/routes.config";
import type { Role } from "@shared/session/session.entity";
import { ADMIN_SECTION, findActiveHref, getNavItems, NAV_ITEMS, STAFF_SECTION } from "./nav.config";

const ROLES: readonly Role[] = ["STUDENT", "TEACHER", "ADMIN"];

describe("NAV_ITEMS", () => {
  it.each(NAV_ITEMS.map((item) => [item.href, item]))("%s exists and is reachable by its roles", (_href, item) => {
    const route = findRoute(item.href);

    expect(route).not.toBeNull();
    expect(item.roles.length).toBeGreaterThan(0);

    for (const role of item.roles) {
      expect(route?.roles === undefined || route.roles.includes(role)).toBe(true);
    }
  });

  it("declares active prefixes that are routes of the route table", () => {
    for (const item of NAV_ITEMS) {
      for (const prefix of item.activePrefixes ?? []) {
        expect(findRoute(prefix), prefix).not.toBeNull();
      }
    }
  });
});

describe("getNavItems (W1 short menu)", () => {
  it("returns nothing without a role", () => {
    expect(getNavItems(null)).toEqual([]);
  });

  it("gives students exactly Simulador, Enseñanza and Evaluación", () => {
    expect(getNavItems("STUDENT").map((item) => [item.label, item.href])).toEqual([
      ["Simulador", "/simulador"],
      ["Enseñanza", "/learn"],
      ["Evaluación", "/evaluations"],
    ]);
  });

  it("gives teachers the three items and the Panel docente section, in order", () => {
    expect(getNavItems("TEACHER").map((item) => [item.label, item.section ?? null])).toEqual([
      ["Simulador", null],
      ["Enseñanza", null],
      ["Evaluación", null],
      ["Resumen", STAFF_SECTION],
      ["Grupos", STAFF_SECTION],
      ["Contenido", STAFF_SECTION],
      ["Gestionar evaluaciones", STAFF_SECTION],
      ["Casos clínicos", STAFF_SECTION],
      ["Calificar", STAFF_SECTION],
      ["Estado del sistema", STAFF_SECTION],
    ]);
  });

  it("gives admins the teacher menu plus the Administración section, in order", () => {
    expect(getNavItems("ADMIN").map((item) => [item.label, item.href, item.section ?? null])).toEqual([
      ["Simulador", "/simulador", null],
      ["Enseñanza", "/learn", null],
      ["Evaluación", "/evaluations", null],
      ["Resumen", "/teacher", STAFF_SECTION],
      ["Grupos", "/groups", STAFF_SECTION],
      ["Contenido", "/content", STAFF_SECTION],
      ["Gestionar evaluaciones", "/evaluations/manage", STAFF_SECTION],
      ["Casos clínicos", "/simulator/cases", STAFF_SECTION],
      ["Calificar", "/grading", STAFF_SECTION],
      ["Estado del sistema", "/admin/status", STAFF_SECTION],
      ["Usuarios", "/admin/users", ADMIN_SECTION],
      ["Configuración", "/admin/settings", ADMIN_SECTION],
      ["Auditoría", "/admin/audit", ADMIN_SECTION],
      ["Analítica de IA", "/admin/ai", ADMIN_SECTION],
      ["Investigación", "/admin/research", ADMIN_SECTION],
    ]);
  });

  it("keeps each section contiguous", () => {
    for (const role of ROLES) {
      const sections = getNavItems(role).map((item) => item.section ?? null);
      const opened = sections.filter((section, index) => index === 0 || section !== sections[index - 1]);

      expect(new Set(opened).size).toBe(opened.length);
    }
  });

  it("moves the student space, the assistant, notifications and the profile out of the side menu", () => {
    const hrefs: readonly string[] = NAV_ITEMS.map((item) => item.href);

    for (const href of ["/me", "/me/notes", "/me/grades", "/my-group", "/assistant", "/notifications", "/profile", "/lab", "/simulator"]) {
      expect(hrefs).not.toContain(href);
    }
  });

  it("drops the legacy items replaced by the migration (/dashboard, /panel*, /evaluation*)", () => {
    expect(NAV_ITEMS.some((item) => item.href === "/dashboard" || item.href === "/panel" || item.href.startsWith("/panel/"))).toBe(false);
    expect(NAV_ITEMS.some((item) => item.href.startsWith("/evaluation/") || item.href === "/evaluation")).toBe(false);
  });
});

describe("Simulador item", () => {
  it("carries the ventilator device indicator, the only one", () => {
    expect(NAV_ITEMS.filter((item) => item.indicator !== undefined).map((item) => [item.href, item.indicator])).toEqual([
      ["/simulador", "ventilatorDevice"],
    ]);
  });

  it.each([
    "/simulador",
    "/simulator/sessions/[sessionId]",
    "/simulator/sessions/[sessionId]/result",
    "/simulator/sessions/[sessionId]/replay",
    "/simulator/sessions/x/replay",
    "/lab/reservations",
    "/lab/recordings",
    "/lab/recordings/[recordingId]",
    "/lab/recordings/x",
  ])("is active on %s for every role", (pathname) => {
    for (const role of ROLES) {
      expect(findActiveHref(getNavItems(role), pathname)).toBe("/simulador");
    }
  });
});

describe("findActiveHref", () => {
  const admin = getNavItems("ADMIN");

  it("lets Casos clínicos win on the case editor pages", () => {
    expect(findActiveHref(admin, "/simulator/cases")).toBe("/simulator/cases");
    expect(findActiveHref(admin, "/simulator/cases/[id]/edit")).toBe("/simulator/cases");
    expect(findActiveHref(admin, "/simulator/cases/x/edit")).toBe("/simulator/cases");
  });

  it("prefers the longest matching route", () => {
    expect(findActiveHref(admin, "/teacher/students/[userId]")).toBe("/teacher");
    expect(findActiveHref(admin, "/evaluations/manage/new")).toBe("/evaluations/manage");
    expect(findActiveHref(admin, "/evaluations/[evaluationId]")).toBe("/evaluations");
    expect(findActiveHref(admin, "/grading/attempts/[attemptId]")).toBe("/grading");
    expect(findActiveHref(getNavItems("STUDENT"), "/learn/modules/m1")).toBe("/learn");
  });

  it("marks nothing on a page outside the side menu", () => {
    expect(findActiveHref(getNavItems("STUDENT"), "/me/notes")).toBeNull();
    expect(findActiveHref(getNavItems("STUDENT"), "/simulator/cases/x/edit")).toBeNull();
  });

  it("does not match a sibling prefix or a shorter path", () => {
    expect(findActiveHref(admin, "/teacherx")).toBeNull();
    expect(findActiveHref(admin, "/laboratory")).toBeNull();
    expect(findActiveHref(admin, "/simulator/sessions")).toBeNull();
  });
});

describe("navigation badges", () => {
  it("only Calificar carries a badge (gradingPending); notifications live in the bell", () => {
    expect(NAV_ITEMS.filter((item) => item.badgeKey !== undefined).map((item) => [item.href, item.badgeKey])).toEqual([
      ["/grading", "gradingPending"],
    ]);
  });
});

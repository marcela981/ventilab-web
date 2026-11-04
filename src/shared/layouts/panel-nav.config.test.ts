/*
* Funcionalidad: Staff panel navigation config tests
* Descripción: Verifies that every panel item points to an existing route of routes.config that its roles can reach, the exact items per role (teachers: the seven staff items and Estado del sistema; admins: plus Usuarios, Configuración, Auditoría, Analítica de IA and Investigación), the contiguous "Administración" section, the badge and indicator keys, the active item on the panel pages (Estudiantes on the student detail, Evaluaciones on the grading screens) and that "Volver a la plataforma" points to a route. Depends on vitest and the session route table.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { findRoute } from "@shared/session/routes.config";
import { findActiveHref } from "./nav.config";
import { getPanelNavItems, PANEL_ADMIN_SECTION, PANEL_BACK_HREF, PANEL_NAV_ITEMS } from "./panel-nav.config";

const STAFF_ITEMS = [
  ["Dashboard", "/teacher"],
  ["Estudiantes", "/teacher/students"],
  ["Grupos", "/groups"],
  ["Contenido", "/content"],
  ["Casos clínicos", "/simulator/cases"],
  ["Evaluaciones", "/evaluations"],
  ["Laboratorio", "/teacher/lab"],
  ["Estado del sistema", "/admin/status"],
];

describe("PANEL_NAV_ITEMS", () => {
  it.each(PANEL_NAV_ITEMS.map((item) => [item.href, item]))("%s exists and is reachable by its roles", (_href, item) => {
    const route = findRoute(item.href);

    expect(route).not.toBeNull();
    expect(item.roles.length).toBeGreaterThan(0);

    for (const role of item.roles) {
      expect(route?.roles === undefined || route.roles.includes(role)).toBe(true);
    }

    for (const prefix of item.activePrefixes ?? []) {
      expect(findRoute(prefix), prefix).not.toBeNull();
    }
  });

  it("returns to an existing platform route", () => {
    expect(findRoute(PANEL_BACK_HREF)).not.toBeNull();
    expect(PANEL_BACK_HREF).toBe("/simulador");
  });

  it("carries the grading badge on Evaluaciones and the device indicator on Laboratorio only", () => {
    expect(PANEL_NAV_ITEMS.filter((item) => item.badgeKey).map((item) => [item.href, item.badgeKey])).toEqual([["/evaluations", "gradingPending"]]);
    expect(PANEL_NAV_ITEMS.filter((item) => item.indicator).map((item) => [item.href, item.indicator])).toEqual([["/teacher/lab", "ventilatorDevice"]]);
  });
});

describe("getPanelNavItems", () => {
  it("returns nothing without a role and nothing for students", () => {
    expect(getPanelNavItems(null)).toEqual([]);
    expect(getPanelNavItems("STUDENT")).toEqual([]);
  });

  it("gives teachers the staff items and the read-only system status", () => {
    expect(getPanelNavItems("TEACHER").map((item) => [item.label, item.href])).toEqual(STAFF_ITEMS);
  });

  it("gives admins the staff items plus the administration items, in order", () => {
    expect(getPanelNavItems("ADMIN").map((item) => [item.label, item.href])).toEqual([
      ...STAFF_ITEMS,
      ["Usuarios", "/admin/users"],
      ["Configuración", "/admin/settings"],
      ["Auditoría", "/admin/audit"],
      ["Analítica de IA", "/admin/ai"],
      ["Investigación", "/admin/research"],
    ]);
  });

  it("keeps the Administración section contiguous at the end", () => {
    const sections = getPanelNavItems("ADMIN").map((item) => item.section ?? null);
    const first = sections.indexOf(PANEL_ADMIN_SECTION);

    expect(first).toBeGreaterThan(0);
    expect(sections.slice(first).every((section) => section === PANEL_ADMIN_SECTION)).toBe(true);
  });
});

describe("active panel item", () => {
  const admin = getPanelNavItems("ADMIN");

  it.each([
    ["/teacher", "/teacher"],
    ["/teacher/students", "/teacher/students"],
    ["/teacher/students/[userId]", "/teacher/students"],
    ["/teacher/lab", "/teacher/lab"],
    ["/groups/[groupId]", "/groups"],
    ["/content/pages/[pageId]", "/content"],
    ["/simulator/cases/[id]/edit", "/simulator/cases"],
    ["/evaluations/manage/new", "/evaluations"],
    ["/grading/attempts/[attemptId]", "/evaluations"],
    ["/admin/status", "/admin/status"],
    ["/admin/users", "/admin/users"],
  ])("on %s is %s", (pathname, href) => {
    expect(findActiveHref(admin, pathname)).toBe(href);
  });
});

/*
* Funcionalidad: Navigation config tests
* Descripción: Verifies that every nav item points to an existing route of routes.config that its roles can reach, that items are filtered by role, and that the active item is the longest matching route. Depends on vitest and the session route table.
* Versión: 1.0
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
    expect(hrefs.some((href) => href.startsWith("/panel"))).toBe(false);
  });

  it("gives teachers the panel but not the admin routes", () => {
    const hrefs = getNavItems("TEACHER").map((item) => item.href);

    expect(hrefs).toContain("/panel");
    expect(hrefs).toContain("/panel/students");
    expect(hrefs).not.toContain("/panel/admin");
    expect(hrefs).not.toContain("/dashboard");
  });

  it("gives admins the admin routes", () => {
    const hrefs = getNavItems("ADMIN").map((item) => item.href);

    expect(hrefs).toContain("/panel/admin");
    expect(hrefs).toContain("/panel/settings");
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

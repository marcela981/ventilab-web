/*
* Funcionalidad: User menu config tests
* Descripción: The user menu links by role in exact order (students: Mi resumen, Mis notas, Mis calificaciones, Mi grupo, Perfil; teachers and admins: Perfil; nothing without a role) and every link is a route of the route table its roles can reach. Depends on vitest and the session route table. v0.2 (Bloque 5, D7): "Mi resumen" uses SpaceDashboard, so it no longer shares the Dashboard icon of "Simulador Virtual". v0.3 (Bloque 5, D12): students get "Perfil" first.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DashboardIcon from "@mui/icons-material/Dashboard";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import { describe, expect, it } from "vitest";
import { findRoute } from "@shared/session/routes.config";
import { getUserMenuItems, USER_MENU_ITEMS } from "./user-menu.config";

describe("USER_MENU_ITEMS", () => {
  it.each(USER_MENU_ITEMS.map((item) => [item.href, item]))("%s exists and is reachable by its roles", (_href, item) => {
    const route = findRoute(item.href);

    expect(route).not.toBeNull();
    for (const role of item.roles) {
      expect(route?.roles === undefined || route.roles.includes(role)).toBe(true);
    }
  });
});

describe("getUserMenuItems", () => {
  it("returns nothing without a role", () => {
    expect(getUserMenuItems(null)).toEqual([]);
  });

  it("gives \"Mi resumen\" the SpaceDashboard icon, not the Dashboard of the simulator item (D7)", () => {
    const summary = getUserMenuItems("STUDENT").find((item) => item.href === "/me");

    expect(summary?.icon).toBe(SpaceDashboardIcon);
    expect(USER_MENU_ITEMS.some((item) => item.icon === DashboardIcon)).toBe(false);
  });

  it("gives students the profile first, then their space and their group, in order (D12)", () => {
    expect(getUserMenuItems("STUDENT").map((item) => [item.label, item.href])).toEqual([
      ["Perfil", "/profile"],
      ["Mi resumen", "/me"],
      ["Mis notas", "/me/notes"],
      ["Mis calificaciones", "/me/grades"],
      ["Mi grupo", "/my-group"],
    ]);
  });

  it.each(["TEACHER", "ADMIN"] as const)("gives a %s only the profile", (role) => {
    expect(getUserMenuItems(role).map((item) => [item.label, item.href])).toEqual([["Perfil", "/profile"]]);
  });
});

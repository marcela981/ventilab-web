/*
* Funcionalidad: Admin users entity tests
* Descripción: The URL filters of /admin/users (read with defaults and invalid values dropped, written without empty keys), the `GET /api/users` query they produce, the role change effects as the backend applies them and the own-account guard. Depends on vitest and the admin users entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  isOwnAccount,
  NO_USER_FILTERS,
  readUserFilters,
  ROLE_CHANGE_EFFECTS,
  roleChangeEffects,
  toAdminUsersQuery,
  toUserFiltersQuery,
} from "./admin-users.entity";

describe("admin users filters", () => {
  it("reads the URL query and drops invalid values", () => {
    expect(readUserFilters({})).toEqual(NO_USER_FILTERS);
    expect(readUserFilters({ page: "3", search: " ana ", role: "TEACHER", groupId: "g1", isActive: "false" })).toEqual({
      page: 3,
      search: "ana",
      role: "TEACHER",
      groupId: "g1",
      isActive: "false",
    });
    expect(readUserFilters({ page: "-1", role: "ROOT", isActive: "maybe" })).toEqual(NO_USER_FILTERS);
  });

  it("writes only the non-default filters back to the URL", () => {
    expect(toUserFiltersQuery({ ...NO_USER_FILTERS, role: "ADMIN" })).toEqual({ role: "ADMIN" });
    expect(toUserFiltersQuery({ ...NO_USER_FILTERS, page: 2, isActive: "true" })).toEqual({ page: "2", isActive: "true" });
  });

  it("builds the users list query", () => {
    expect(toAdminUsersQuery({ page: 2, search: "ana", role: "STUDENT", groupId: "g1", isActive: "false" }, 20)).toEqual({
      page: 2,
      limit: 20,
      sortBy: "name",
      sortOrder: "asc",
      search: "ana",
      role: "STUDENT",
      groupId: "g1",
      isActive: false,
    });
  });
});

describe("role change effects", () => {
  it("lists the group removal of the role that is left, the session refresh and the notification", () => {
    expect(roleChangeEffects("STUDENT", "TEACHER")).toEqual([
      ROLE_CHANGE_EFFECTS.leavesStudentGroups,
      ROLE_CHANGE_EFFECTS.sessionRefreshed,
      ROLE_CHANGE_EFFECTS.notified,
    ]);
    expect(roleChangeEffects("TEACHER", "STUDENT")[0]).toBe(ROLE_CHANGE_EFFECTS.leavesTeacherGroups);
    expect(roleChangeEffects("TEACHER", "ADMIN")).toEqual([ROLE_CHANGE_EFFECTS.sessionRefreshed, ROLE_CHANGE_EFFECTS.notified]);
    expect(roleChangeEffects("ADMIN", "ADMIN")).toEqual([]);
  });

  it("recognises the signed-in admin's own account", () => {
    const row = { id: "admin-1", name: null, email: "a@x", role: "ADMIN" as const, isActive: true, createdAt: "" };

    expect(isOwnAccount(row, "admin-1")).toBe(true);
    expect(isOwnAccount(row, "other")).toBe(false);
    expect(isOwnAccount(row, null)).toBe(false);
  });
});

/*
* Funcionalidad: Admin users entity tests
* Descripción: The URL filters of /admin/users (read with defaults and invalid values dropped, written without empty keys), the `GET /api/users` query they produce, the role change effects as the backend applies them and the own-account guard. Depends on vitest and the admin users entity. v1.1 (closure B2): the locked reason (superadmin from the API flag first, then own account) and the student code rule.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  isOwnAccount,
  lockedReason,
  NO_USER_FILTERS,
  parseStudentCode,
  readUserFilters,
  ROLE_CHANGE_EFFECTS,
  roleChangeEffects,
  STUDENT_CODE_COPY,
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
    const row = { id: "admin-1", name: null, email: "a@x", role: "ADMIN" as const, isActive: true, createdAt: "", studentCode: null, isSuperadmin: false };

    expect(isOwnAccount(row, "admin-1")).toBe(true);
    expect(isOwnAccount(row, "other")).toBe(false);
    expect(isOwnAccount(row, null)).toBe(false);
    expect(lockedReason(row, "admin-1")).toBe("own");
    expect(lockedReason(row, "other")).toBeNull();
    expect(lockedReason({ ...row, isSuperadmin: true }, "admin-1")).toBe("superadmin");
  });

  it("parses a student code with the backend rule", () => {
    expect(parseStudentCode("  2026-0001 ")).toEqual({ value: "2026-0001", error: null });
    expect(parseStudentCode("   ")).toEqual({ value: null, error: null });
    expect(parseStudentCode("con espacio").error).toBe(STUDENT_CODE_COPY.invalid);
    expect(parseStudentCode("a".repeat(33)).error).toBe(STUDENT_CODE_COPY.invalid);
    expect(parseStudentCode("a".repeat(32)).value).toHaveLength(32);
  });
});

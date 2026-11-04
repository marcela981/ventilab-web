/*
* Funcionalidad: Students directory entity tests
* Descripción: Verifies the URL state of /teacher/students (lenient parsing of ?page ?q ?sort ?scope, defaults left out when written back, round trip), the `GET /api/admin/students` query it maps to (myGroups only for "Mis grupos"), the sort toggle, the selection key and the directory load error message (403 names the directory). Depends on vitest, the shared API error and the students directory entity.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import {
  DIRECTORY_ERROR_COPY,
  directorySelectionKey,
  getDirectoryErrorMessage,
  readDirectoryState,
  rowDisplayName,
  toAdminStudentsQuery,
  toDirectoryQuery,
  toggleDirectorySort,
} from "./students-directory.entity";

const DEFAULT_DIRECTORY_STATE = { page: 1, q: "", sort: { key: "name", direction: "asc" }, scope: "all" } as const;

describe("readDirectoryState", () => {
  it("gives the defaults for an empty or invalid query", () => {
    expect(readDirectoryState({})).toEqual(DEFAULT_DIRECTORY_STATE);
    expect(readDirectoryState({ page: "0", sort: "email", scope: "everyone", q: ["a", "b"] })).toEqual(DEFAULT_DIRECTORY_STATE);
    expect(readDirectoryState({ page: "2.5" }).page).toBe(1);
  });

  it("reads page, trimmed search, sort and scope", () => {
    expect(readDirectoryState({ page: "3", q: "  ana ", sort: "-progress", scope: "mine" })).toEqual({
      page: 3,
      q: "ana",
      sort: { key: "progress", direction: "desc" },
      scope: "mine",
    });
    expect(readDirectoryState({ sort: "-name" }).sort).toEqual({ key: "name", direction: "desc" });
  });
});

describe("toDirectoryQuery", () => {
  it("leaves the defaults out", () => {
    expect(toDirectoryQuery(DEFAULT_DIRECTORY_STATE)).toEqual({});
  });

  it("round-trips a non-default state", () => {
    const state = { page: 2, q: "2026-0001", sort: { key: "progress", direction: "asc" }, scope: "mine" } as const;

    expect(toDirectoryQuery(state)).toEqual({ page: "2", q: "2026-0001", sort: "progress", scope: "mine" });
    expect(readDirectoryState(toDirectoryQuery(state))).toEqual(state);
  });
});

describe("toAdminStudentsQuery", () => {
  it("asks the server for one sorted page without empty filters", () => {
    expect(toAdminStudentsQuery(DEFAULT_DIRECTORY_STATE)).toEqual({ page: 1, limit: 25, sortBy: "name", sortOrder: "asc" });
  });

  it("sends the search and myGroups only for Mis grupos", () => {
    expect(toAdminStudentsQuery({ ...DEFAULT_DIRECTORY_STATE, q: "ana", scope: "mine" })).toMatchObject({ search: "ana", myGroups: "true" });
  });
});

describe("toggleDirectorySort", () => {
  it("flips the active column and starts a new one with its own direction", () => {
    expect(toggleDirectorySort({ key: "name", direction: "asc" }, "name")).toEqual({ key: "name", direction: "desc" });
    expect(toggleDirectorySort({ key: "name", direction: "asc" }, "progress")).toEqual({ key: "progress", direction: "desc" });
    expect(toggleDirectorySort({ key: "progress", direction: "desc" }, "name")).toEqual({ key: "name", direction: "asc" });
  });
});

describe("directorySelectionKey", () => {
  it("changes with page, search, sort and scope", () => {
    const base = directorySelectionKey(DEFAULT_DIRECTORY_STATE);

    expect(directorySelectionKey({ ...DEFAULT_DIRECTORY_STATE })).toBe(base);
    expect(directorySelectionKey({ ...DEFAULT_DIRECTORY_STATE, page: 2 })).not.toBe(base);
    expect(directorySelectionKey({ ...DEFAULT_DIRECTORY_STATE, q: "a" })).not.toBe(base);
    expect(directorySelectionKey({ ...DEFAULT_DIRECTORY_STATE, scope: "mine" })).not.toBe(base);
    expect(directorySelectionKey({ ...DEFAULT_DIRECTORY_STATE, sort: { key: "name", direction: "desc" } })).not.toBe(base);
  });
});

describe("rowDisplayName", () => {
  it("falls back to the email", () => {
    expect(rowDisplayName({ name: "Ana", email: "a@x" })).toBe("Ana");
    expect(rowDisplayName({ name: "  ", email: "a@x" })).toBe("a@x");
    expect(rowDisplayName({ name: null, email: "a@x" })).toBe("a@x");
  });
});

describe("getDirectoryErrorMessage", () => {
  it("names the directory on a 403", () => {
    expect(getDirectoryErrorMessage(new ApiError({ code: "auth.forbidden", message: "x", status: 403 }))).toBe(DIRECTORY_ERROR_COPY.forbidden);
  });

  it("uses the dashboard messages otherwise", () => {
    expect(getDirectoryErrorMessage(new ApiError({ code: "internal", message: "x", status: 500 }))).toMatch(/error en el servidor/);
  });
});

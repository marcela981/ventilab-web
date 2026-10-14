/*
* Funcionalidad: Group entity tests
* Descripción: Verifies the client-side filters of the group list (text over name, description, period, parent, leader and creator ignoring case and accents; type; active state), the page slicing and the display name of a person. v1.1 (T11b): student limit parsing, draft validation, the management rule per role and the member search exclusion. Depends on vitest and the group entity.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  canManageGroup,
  EMPTY_GROUP_DRAFT,
  EMPTY_GROUP_FILTERS,
  excludeMembers,
  filterGroups,
  paginate,
  parseStudentLimit,
  personName,
  toGroupDraft,
  validateGroupDraft,
} from "./group.entity";
import type { Group } from "./group.entity";

function makeGroup(overrides: Partial<Group>): Group {
  return {
    id: "g",
    name: "Grupo",
    description: null,
    type: "STUDENT",
    depth: 0,
    parentGroupId: null,
    parentGroupName: null,
    isActive: true,
    maxStudents: null,
    semester: null,
    academicYear: null,
    leader: null,
    creator: null,
    membersCount: 0,
    subGroupsCount: 0,
    ...overrides,
  };
}

const groups: Group[] = [
  makeGroup({ id: "a", name: "Cardiología", semester: "2026-2" }),
  makeGroup({ id: "b", name: "Docentes UCI", type: "TEACHER" }),
  makeGroup({ id: "c", name: "Neumología", isActive: false, leader: { id: "s1", name: "Luis Gómez", email: "luis@ventylab.demo" } }),
  makeGroup({ id: "d", name: "Subgrupo A", parentGroupName: "Medicina 2026" }),
];

const ids = (list: readonly Group[]) => list.map((group) => group.id);

describe("filterGroups", () => {
  it("returns every group with the empty filters", () => {
    expect(ids(filterGroups(groups, EMPTY_GROUP_FILTERS))).toEqual(["a", "b", "c", "d"]);
  });

  it("matches text ignoring case and accents in name, period, parent and leader", () => {
    expect(ids(filterGroups(groups, { ...EMPTY_GROUP_FILTERS, text: "CARDIOLOGIA" }))).toEqual(["a"]);
    expect(ids(filterGroups(groups, { ...EMPTY_GROUP_FILTERS, text: "2026-2" }))).toEqual(["a"]);
    expect(ids(filterGroups(groups, { ...EMPTY_GROUP_FILTERS, text: " medicina " }))).toEqual(["d"]);
    expect(ids(filterGroups(groups, { ...EMPTY_GROUP_FILTERS, text: "gomez" }))).toEqual(["c"]);
  });

  it("filters by type and by active state together", () => {
    expect(ids(filterGroups(groups, { ...EMPTY_GROUP_FILTERS, type: "TEACHER" }))).toEqual(["b"]);
    expect(ids(filterGroups(groups, { ...EMPTY_GROUP_FILTERS, status: "inactive" }))).toEqual(["c"]);
    expect(ids(filterGroups(groups, { text: "", type: "STUDENT", status: "active" }))).toEqual(["a", "d"]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 23 }, (_, index) => index);

  it("slices the requested page", () => {
    expect(paginate(items, 0, 10)).toHaveLength(10);
    expect(paginate(items, 2, 10)).toEqual([20, 21, 22]);
  });

  it("returns nothing past the last page", () => {
    expect(paginate(items, 3, 10)).toEqual([]);
  });
});

describe("personName", () => {
  it("uses the name, then the email, then a placeholder", () => {
    expect(personName({ name: " Ana Torres ", email: "ana@ventylab.demo" })).toBe("Ana Torres");
    expect(personName({ name: null, email: "ana@ventylab.demo" })).toBe("ana@ventylab.demo");
    expect(personName({ name: "  " })).toBe("Sin nombre");
  });
});

describe("parseStudentLimit", () => {
  it("accepts an empty value (no limit) and positive integers", () => {
    expect(parseStudentLimit(" ")).toEqual({ valid: true, value: null });
    expect(parseStudentLimit(" 30 ")).toEqual({ valid: true, value: 30 });
  });

  it.each(["abc", "12.5", "0", "-3", "1e3"])("rejects %j", (value) => {
    expect(parseStudentLimit(value)).toEqual({ valid: false });
  });
});

describe("validateGroupDraft", () => {
  it("requires a name and a valid student limit", () => {
    expect(validateGroupDraft({ ...EMPTY_GROUP_DRAFT, name: "  ", maxStudents: "12.5" })).toEqual({
      name: "Escribe el nombre del grupo.",
      maxStudents: "El límite de estudiantes debe ser un número entero mayor que 0.",
    });
    expect(validateGroupDraft({ ...EMPTY_GROUP_DRAFT, name: "UCI", maxStudents: "" })).toEqual({});
  });

  it("builds the draft of an existing group", () => {
    expect(toGroupDraft(makeGroup({ name: "UCI", maxStudents: 12, semester: "2026-2" }))).toEqual({
      name: "UCI",
      description: "",
      semester: "2026-2",
      academicYear: "",
      maxStudents: "12",
      type: "STUDENT",
    });
  });
});

describe("canManageGroup", () => {
  it("lets admins manage every group and teachers only student groups", () => {
    expect(canManageGroup(makeGroup({ type: "TEACHER" }), "ADMIN")).toBe(true);
    expect(canManageGroup(makeGroup({ type: "STUDENT" }), "TEACHER")).toBe(true);
    expect(canManageGroup(makeGroup({ type: "TEACHER" }), "TEACHER")).toBe(false);
    expect(canManageGroup(makeGroup({ type: "STUDENT" }), "STUDENT")).toBe(false);
    expect(canManageGroup(makeGroup({ type: "STUDENT" }), null)).toBe(false);
  });
});

describe("excludeMembers", () => {
  it("drops the users that already belong to the group", () => {
    const users = [
      { id: "s1", name: "Luis", email: "luis@ventylab.demo", role: "STUDENT" as const },
      { id: "s2", name: "Eva", email: "eva@ventylab.demo", role: "STUDENT" as const },
    ];

    expect(excludeMembers(users, [{ userId: "s1" }]).map((user) => user.id)).toEqual(["s2"]);
  });
});

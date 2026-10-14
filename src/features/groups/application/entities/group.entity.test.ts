/*
* Funcionalidad: Group entity tests
* Descripción: Verifies the client-side filters of the group list (text over name, description, period, parent, leader and creator ignoring case and accents; type; active state), the page slicing and the display name of a person. Depends on vitest and the group entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { EMPTY_GROUP_FILTERS, filterGroups, paginate, personName } from "./group.entity";
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

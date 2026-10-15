/*
* Funcionalidad: Content reorder tests
* Descripción: Unit tests of the pure reorder logic: moving one id inside a sibling list, applying an optimistic id order to nodes (unknown nodes kept at the end) and the batch reorder request of every sibling group (sections {ids}, levels {levelIds}, modules/lessons/pages {parentId, ids}). Depends on vitest.
* Versión: 1.0 (C2)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { applyOrder, moveId, reorderRequest } from "./content-reorder";

describe("moveId", () => {
  it("moves an id from one index to another", () => {
    expect(moveId(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveId(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("returns a copy for an out-of-range move", () => {
    const ids = ["a", "b"];

    expect(moveId(ids, 0, 5)).toEqual(["a", "b"]);
    expect(moveId(ids, 0, 5)).not.toBe(ids);
  });
});

describe("applyOrder", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("sorts the items by the given order and keeps unknown ones at the end", () => {
    expect(applyOrder(items, ["c", "a"]).map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("returns the items untouched without an order", () => {
    expect(applyOrder(items, undefined)).toBe(items);
  });
});

describe("reorderRequest", () => {
  it("builds the per-parent batch body of each group", () => {
    expect(reorderRequest({ kind: "sections" }, ["s2", "s1"])).toEqual({ path: "/api/sections/reorder", body: { ids: ["s2", "s1"] } });
    expect(reorderRequest({ kind: "levels", sectionId: "s1" }, ["b", "a"])).toEqual({ path: "/api/levels/reorder", body: { levelIds: ["b", "a"] } });
    expect(reorderRequest({ kind: "modules", levelId: "lv1" }, ["m2", "m1"])).toEqual({ path: "/api/modules/reorder", body: { levelId: "lv1", ids: ["m2", "m1"] } });
    expect(reorderRequest({ kind: "lessons", moduleId: "m1" }, ["l2"])).toEqual({ path: "/api/lessons/reorder", body: { moduleId: "m1", ids: ["l2"] } });
    expect(reorderRequest({ kind: "pages", lessonId: "l1" }, ["p2", "p1"])).toEqual({ path: "/api/pages/reorder", body: { lessonId: "l1", ids: ["p2", "p1"] } });
  });
});

/*
* Funcionalidad: Student space entity tests
* Descripción: Pure rules of the student space: module options in curriculum order (all sections plus unsectioned levels, or one section), the notes page query with the server-side filters, grouping of a notes page by module (curriculum rank, title from the tree) and lesson (API order, title from the note) with a trailing group for notes without module, the grade type and module filters (row selection only) and the grade module options and the labels fallback. Depends on vitest and the student space entities. v1.1 (B1 closure): the note fixture carries the new label fields. v1.2 (B2 closure): notes grouped by their API labels, notes query filters, grade module filter.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { CurriculumLevel, CurriculumTree, Note } from "@features/learning";
import { ALL_MODULES, filterGrades, filterGradesByType, hasGradesWithoutModule, listGradeModules, NO_MODULE } from "./my-grade.entity";
import type { MyGrade } from "./my-grade.entity";
import { groupNotesByModule, hasNotesFilters, listModuleOptions, NO_NOTES_FILTERS, toNotesQuery } from "./my-notes.entity";
import { EVALUATION_TYPE_LABELS, labelOf } from "./student-space-labels";

function level(id: string, sectionId: string | null, moduleIds: string[]): CurriculumLevel {
  return {
    id,
    title: id,
    description: null,
    order: 1,
    sectionId,
    locked: false,
    completed: false,
    missingPrerequisites: [],
    modules: moduleIds.map((moduleId, index) => ({
      id: moduleId,
      title: `Módulo ${moduleId}`,
      description: null,
      order: index + 1,
      lessonCount: 1,
      locked: false,
      completed: false,
      missingPrerequisites: [],
    })),
  };
}

const TREE: CurriculumTree = {
  sections: [
    { id: "s1", title: "Fundamentos", description: null, order: 1, levels: [level("lv1", "s1", ["m1", "m2"])] },
    { id: "s2", title: "Avanzado", description: null, order: 2, levels: [level("lv2", "s2", ["m3"])] },
  ],
  unsectionedLevels: [level("lv9", null, ["m9"])],
};

function note(id: string, lessonId: string, moduleId: string | null, lessonTitle: string | null = `Lección ${lessonId}`): Note {
  return { id, lessonId, pageId: null, moduleId, lessonTitle, pageTitle: null, content: {}, createdAt: "", updatedAt: "" };
}

describe("listModuleOptions", () => {
  it("lists every module in curriculum order", () => {
    expect(listModuleOptions(TREE).map((option) => [option.id, option.sectionId])).toEqual([["m1", "s1"], ["m2", "s1"], ["m3", "s2"], ["m9", null]]);
  });

  it("narrows the modules to one section", () => {
    expect(listModuleOptions(TREE, "s2").map((option) => option.id)).toEqual(["m3"]);
  });
});

describe("toNotesQuery", () => {
  it("asks for a one-based page, newest first, without filters", () => {
    expect(toNotesQuery(2, 25)).toEqual({ page: 3, limit: 25, sortOrder: "desc" });
  });

  it("sends the trimmed search and the selected filters only", () => {
    expect(toNotesQuery(0, 10, { search: "  peep ", moduleId: "m1", lessonId: "l1", pageId: null }))
      .toEqual({ page: 1, limit: 10, sortOrder: "desc", search: "peep", moduleId: "m1", lessonId: "l1" });
    expect(toNotesQuery(0, 10, { ...NO_NOTES_FILTERS, search: "   ", pageId: "p2" })).toEqual({ page: 1, limit: 10, sortOrder: "desc", pageId: "p2" });
  });

  it("knows when a filter is active", () => {
    expect(hasNotesFilters(NO_NOTES_FILTERS)).toBe(false);
    expect(hasNotesFilters({ ...NO_NOTES_FILTERS, search: " " })).toBe(false);
    expect(hasNotesFilters({ ...NO_NOTES_FILTERS, search: "x" })).toBe(true);
    expect(hasNotesFilters({ ...NO_NOTES_FILTERS, moduleId: "m1" })).toBe(true);
  });
});

describe("groupNotesByModule", () => {
  it("groups by module rank with the tree title and by lesson in API order", () => {
    const notes = [note("a", "l3", "m1"), note("b", "l1", "m2"), note("c", "lx", null, null), note("d", "l2", "m2"), note("e", "l1", "m2")];
    const groups = groupNotesByModule(notes, listModuleOptions(TREE));

    expect(groups.map((group) => [group.moduleId, group.moduleTitle])).toEqual([["m1", "Módulo m1"], ["m2", "Módulo m2"], [null, null]]);
    expect(groups[1]?.lessons.map((item) => [item.lessonId, item.lessonTitle])).toEqual([["l1", "Lección l1"], ["l2", "Lección l2"]]);
    expect(groups[1]?.lessons[0]?.notes.map((item) => item.id)).toEqual(["b", "e"]);
    expect(groups[2]).toEqual({ moduleId: null, moduleTitle: null, lessons: [{ lessonId: "lx", lessonTitle: null, moduleId: null, notes: [notes[2]] }] });
  });

  it("puts modules missing from the curriculum after the known ones, without a title", () => {
    const groups = groupNotesByModule([note("a", "l1", "zz"), note("b", "l2", "m3")], listModuleOptions(TREE));

    expect(groups.map((group) => [group.moduleId, group.moduleTitle])).toEqual([["m3", "Módulo m3"], ["zz", null]]);
  });
});

describe("grade filters", () => {
  const grade = (attemptId: string, evaluationType: MyGrade["evaluationType"], moduleId: string | null, moduleTitle: string | null): MyGrade => ({
    attemptId,
    attemptNumber: 1,
    evaluationId: "ev",
    evaluationTitle: "Ev",
    evaluationType,
    moduleId,
    moduleTitle,
    grade: 4,
    passed: true,
    publishedAt: "",
    score: null,
    maxScore: null,
  });
  const grades = [grade("a", "EXAM", "m2", "Modos"), grade("b", "QUIZ", "m1", "Fisiología"), grade("c", "EXAM", null, null), grade("d", "QUIZ", "m2", "Modos")];

  it("selects the rows of one type", () => {
    expect(filterGradesByType(grades, "EXAM").map((item) => item.attemptId)).toEqual(["a", "c"]);
  });

  it("keeps every row for all types and modules", () => {
    expect(filterGrades(grades, { type: "ALL", module: ALL_MODULES })).toHaveLength(4);
  });

  it("selects the rows of one module, or the ones without module, combined with the type", () => {
    expect(filterGrades(grades, { type: "ALL", module: "m2" }).map((item) => item.attemptId)).toEqual(["a", "d"]);
    expect(filterGrades(grades, { type: "QUIZ", module: "m2" }).map((item) => item.attemptId)).toEqual(["d"]);
    expect(filterGrades(grades, { type: "ALL", module: NO_MODULE }).map((item) => item.attemptId)).toEqual(["c"]);
  });

  it("lists the distinct modules by title and detects grades without module", () => {
    expect(listGradeModules(grades)).toEqual([{ id: "m1", title: "Fisiología" }, { id: "m2", title: "Modos" }]);
    expect(hasGradesWithoutModule(grades)).toBe(true);
    expect(hasGradesWithoutModule(grades.filter((item) => item.moduleId !== null))).toBe(false);
  });
});

describe("labelOf", () => {
  it("translates known values and shows unknown ones as they come", () => {
    expect(labelOf(EVALUATION_TYPE_LABELS, "WORKSHOP")).toBe("Taller");
    expect(labelOf(EVALUATION_TYPE_LABELS, "OTHER")).toBe("OTHER");
  });
});

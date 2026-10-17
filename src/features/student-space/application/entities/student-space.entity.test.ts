/*
* Funcionalidad: Student space entity tests
* Descripción: Pure rules of the student space: module options in curriculum order (all sections plus unsectioned levels, or one section), the notes page query, grouping of a notes page by module (curriculum rank) and lesson (lesson order) with a trailing group for unresolved lessons, the grade type filter (row selection only) and the labels fallback. Depends on vitest and the student space entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { CurriculumLevel, CurriculumTree, Note } from "@features/learning";
import { filterGradesByType } from "./my-grade.entity";
import type { MyGrade } from "./my-grade.entity";
import { groupNotesByModule, listModuleOptions, toModuleRanks, toNotesQuery } from "./my-notes.entity";
import type { NoteLessonInfo } from "./my-notes.entity";
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

function note(id: string, lessonId: string): Note {
  return { id, lessonId, pageId: null, content: {}, createdAt: "", updatedAt: "" };
}

function lesson(lessonId: string, lessonOrder: number, moduleId: string): NoteLessonInfo {
  return { lessonId, lessonTitle: `Lección ${lessonId}`, lessonOrder, moduleId, moduleTitle: `Módulo ${moduleId}` };
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
  it("asks for a one-based page, newest first", () => {
    expect(toNotesQuery(2, 25)).toEqual({ page: 3, limit: 25, sortOrder: "desc" });
  });
});

describe("groupNotesByModule", () => {
  it("groups by module rank and lesson order and keeps the API order of notes", () => {
    const notes = [note("a", "l3"), note("b", "l1"), note("c", "lx"), note("d", "l2"), note("e", "l1")];
    const lessons = { l1: lesson("l1", 2, "m2"), l2: lesson("l2", 1, "m2"), l3: lesson("l3", 1, "m1") };
    const groups = groupNotesByModule(notes, lessons, toModuleRanks(listModuleOptions(TREE)));

    expect(groups.map((group) => group.moduleId)).toEqual(["m1", "m2", null]);
    expect(groups[1]?.lessons.map((item) => item.lessonId)).toEqual(["l2", "l1"]);
    expect(groups[1]?.lessons[1]?.notes.map((item) => item.id)).toEqual(["b", "e"]);
    expect(groups[2]).toEqual({ moduleId: null, moduleTitle: null, lessons: [{ lessonId: "lx", lesson: null, notes: [note("c", "lx")] }] });
  });

  it("puts modules missing from the curriculum after the known ones", () => {
    const groups = groupNotesByModule([note("a", "l1"), note("b", "l2")], { l1: lesson("l1", 1, "zz"), l2: lesson("l2", 1, "m3") }, toModuleRanks(listModuleOptions(TREE)));

    expect(groups.map((group) => group.moduleId)).toEqual(["m3", "zz"]);
  });
});

describe("filterGradesByType", () => {
  const grade = (attemptId: string, evaluationType: MyGrade["evaluationType"]): MyGrade => ({
    attemptId,
    attemptNumber: 1,
    evaluationId: "ev",
    evaluationTitle: "Ev",
    evaluationType,
    grade: 4,
    passed: true,
    publishedAt: "",
    score: null,
    maxScore: null,
  });
  const grades = [grade("a", "EXAM"), grade("b", "QUIZ"), grade("c", "EXAM")];

  it("selects the rows of one type", () => {
    expect(filterGradesByType(grades, "EXAM").map((item) => item.attemptId)).toEqual(["a", "c"]);
  });

  it("keeps every row for all types", () => {
    expect(filterGradesByType(grades, "ALL")).toHaveLength(3);
  });
});

describe("labelOf", () => {
  it("translates known values and shows unknown ones as they come", () => {
    expect(labelOf(EVALUATION_TYPE_LABELS, "WORKSHOP")).toBe("Taller");
    expect(labelOf(EVALUATION_TYPE_LABELS, "OTHER")).toBe("OTHER");
  });
});

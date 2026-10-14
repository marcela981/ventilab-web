/*
* Funcionalidad: Curriculum mapper tests
* Descripción: Unit tests of the curriculum DTO -> entity mapper: sections, levels and modules are sorted by `order`, lock state and missing prerequisites are kept as the backend sends them, and module lessons are sorted by order. Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { lessonDto, treeDto } from "../../application/pages/learning-test-helpers";
import { toCurriculumTree, toLessonPages, toLessonSummaries } from "./curriculum.mapper";

describe("toCurriculumTree", () => {
  it("sorts every level of the tree by order and keeps the lock state", () => {
    const tree = toCurriculumTree(treeDto());

    expect(tree.sections.map((section) => section.id)).toEqual(["s1", "s2"]);
    expect(tree.sections[0]?.levels.map((level) => level.id)).toEqual(["lv1", "lv2"]);
    expect(tree.sections[0]?.levels[0]?.modules.map((module) => module.id)).toEqual(["m1", "m2"]);

    const locked = tree.sections[0]?.levels[1];

    expect(locked?.locked).toBe(true);
    expect(locked?.missingPrerequisites).toEqual([{ id: "lv1", title: "Nivel básico" }]);
    expect(tree.unsectionedLevels.map((level) => level.id)).toEqual(["lv9"]);
  });
});

describe("toLessonSummaries", () => {
  it("sorts lessons by order and keeps id, title and page count", () => {
    const lessons = toLessonSummaries([lessonDto("l2", 2, 1), lessonDto("l1", 1, 3)]);

    expect(lessons).toEqual([
      { id: "l1", title: "Lección l1", order: 1, pageCount: 3 },
      { id: "l2", title: "Lección l2", order: 2, pageCount: 1 },
    ]);
  });
});

describe("toLessonPages", () => {
  it("sorts the Pages of a lesson by order, so the 1-based position is the pageNumber", () => {
    const page = (id: string, order: number) => ({
      id,
      title: `Página ${id}`,
      order,
      difficulty: "BEGINNER",
      estimatedMinutes: null,
      hasRequiredQuiz: false,
      learningObjectives: [],
      legacyJsonId: null,
      legacyLessonId: null,
      lessonId: "l1",
      slug: id,
      status: "PUBLISHED" as const,
      type: "LESSON",
    });

    expect(toLessonPages([page("p2", 5), page("p1", 1)]).map((item) => item.id)).toEqual(["p1", "p2"]);
  });
});

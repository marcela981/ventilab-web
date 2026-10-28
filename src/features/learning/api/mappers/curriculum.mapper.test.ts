/*
* Funcionalidad: Curriculum mapper tests
* Descripción: Unit tests of the curriculum DTO -> entity mapper: sections, levels and modules are sorted by `order`, lock state and missing prerequisites are kept as the backend sends them, and module lessons are sorted by order. v1.1 (L3): toPageContent keeps the active blocks sorted by order and the Page owners. Depends on vitest. v1.2 (W4, Bloque 2): the section slug, level track and node status are kept. v1.3 (W5, Bloque 2): toPageContent keeps the module title and level id; toLessonLock.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { lessonDto, pageDetailDto, pageSectionDto, treeDto, treeLevelDto, treeModuleDto } from "../../application/pages/learning-test-helpers";
import { toCurriculumTree, toLessonLock, toLessonPages, toLessonSummaries, toPageContent } from "./curriculum.mapper";

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

  it("keeps the section slug, the level track and the status of every node", () => {
    const dto = treeDto();

    dto.unsectionedLevels = [treeLevelDto("lv9", 1, null, [treeModuleDto("m9", 1, { status: "DRAFT", lessonCount: 0 })], { track: "ventylab", status: "DRAFT" })];

    const tree = toCurriculumTree(dto);

    expect(tree.sections[0]).toMatchObject({ id: "s1", slug: "s1", status: "PUBLISHED" });
    expect(tree.unsectionedLevels[0]).toMatchObject({ track: "ventylab", status: "DRAFT" });
    expect(tree.unsectionedLevels[0]?.modules[0]).toMatchObject({ status: "DRAFT", lessonCount: 0 });
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

describe("toPageContent", () => {
  it("keeps the active blocks sorted by order with the Page owners", () => {
    const dto = pageDetailDto("p1", "l1", "m2", [
      pageSectionDto("b2", 2, "Segundo", { title: "Teoría", mediaUrl: "https://cdn/x.png" }),
      pageSectionDto("hidden", 0, "Inactivo", { isActive: false }),
      pageSectionDto("b1", 1, "Primero"),
    ]);
    const page = toPageContent(dto);

    expect(page).toMatchObject({ id: "p1", title: "Página p1", lessonId: "l1", moduleId: "m2", moduleTitle: "Módulo m2", levelId: "lv1" });
    expect(page.blocks.map((block) => block.id)).toEqual(["b1", "b2"]);
    expect(page.blocks[1]).toMatchObject({ type: "TEXT", title: "Teoría", mediaUrl: "https://cdn/x.png", mediaId: null });
  });
});

describe("toLessonLock", () => {
  it("is null when the lesson is allowed", () => {
    expect(toLessonLock({ allowed: true, reason: null, missing: [] })).toBeNull();
  });

  it("keeps the reason and the missing lessons in order", () => {
    expect(toLessonLock({ allowed: false, reason: "previous_lesson_incomplete", missing: [{ lessonId: "l1", title: "Uno" }] }))
      .toEqual({ reason: "previous_lesson_incomplete", missing: [{ lessonId: "l1", title: "Uno" }] });
    expect(toLessonLock({ allowed: false, reason: "module_locked", missing: [] })).toEqual({ reason: "module_locked", missing: [] });
  });
});

/*
* Funcionalidad: Progress mapper tests
* Descripción: Unit tests of the progress DTO -> entity mapper: backend percentages and counts are kept as sent (no frontend recalculation), the summary and section progress are indexed by id, and a lesson counts as completed when the backend says so by pages or otherwise. Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { lessonProgressDto, moduleProgressDto, progressItem } from "../../application/pages/learning-test-helpers";
import { toModuleProgress, toProgressSummary, toSectionProgress } from "./progress.mapper";

describe("progress mapper", () => {
  it("keeps the backend values of the summary and indexes them by id", () => {
    const summary = toProgressSummary({
      ...progressItem(33, 1, 3),
      sections: [{ sectionId: "s1", completedLevels: 0, totalLevels: 2, ...progressItem(33.3, 1, 3) }],
      levels: [{ levelId: "lv1", sectionId: "s1", completedModules: 0, totalModules: 1, ...progressItem(50, 1, 2) }],
      modules: [{ moduleId: "m1", levelId: "lv1", ...progressItem(100, 2, 2) }],
    });

    expect(summary.overall).toEqual({ percentage: 33, completedLessons: 1, totalLessons: 3, completed: false });
    expect(summary.sections.get("s1")?.percentage).toBe(33.3);
    expect(summary.levels.get("lv1")?.completedLessons).toBe(1);
    expect(summary.modules.get("m1")?.completed).toBe(true);
  });

  it("indexes the level progress of a section", () => {
    const section = toSectionProgress({
      sectionId: "s1",
      completedLevels: 0,
      totalLevels: 1,
      ...progressItem(10, 1, 10),
      levels: [{ levelId: "lv1", sectionId: "s1", completedModules: 0, totalModules: 1, ...progressItem(20, 1, 5) }],
    });

    expect(section.overall.percentage).toBe(10);
    expect(section.levels.get("lv1")?.percentage).toBe(20);
  });

  it("maps the lessons of the module progress", () => {
    const moduleProgress = toModuleProgress(moduleProgressDto("m1", 50, [
      lessonProgressDto("l1", 1, 1),
      { lessonId: "l2", viewedPages: 0, totalPages: 1, completedByPages: false, completed: true },
    ]));

    expect(moduleProgress.overall.percentage).toBe(50);
    expect(moduleProgress.lessons).toEqual([
      { lessonId: "l1", viewedPages: 1, totalPages: 1, completed: true },
      { lessonId: "l2", viewedPages: 0, totalPages: 1, completed: true },
    ]);
  });
});

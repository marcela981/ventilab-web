/*
* Funcionalidad: Curriculum view selector tests
* Descripción: Unit tests of the pure Currículo selectors (W4, Bloque 2): the three accordions in the July order with level-prerequisitos by id, ventylab by track and everything else in Mecánica (curriculum order kept; drafts only for staff; archived never); the accordion `?section=` resolves to (key, July alias, track, level id, section id or slug, unknown); the module card states (coming_soon, completed, locked by module or level, in-progress, available; staff never locked nor coming soon); the level lock text (previous level or none named → "Completa el nivel anterior…", otherwise the missing titles); the level module progress and status. Depends on vitest, the curriculum mapper and the learning test helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { toCurriculumTree } from "../../api/mappers/curriculum.mapper";
import { seededTreeDto, treeLevelDto, treeModuleDto } from "../pages/learning-test-helpers";
import type { CurriculumLevel, CurriculumModule } from "./curriculum.entity";
import {
  canOpenModule,
  groupLevelsIntoAccordions,
  isComingSoon,
  LEVEL_LOCK_COPY,
  levelLockText,
  levelModuleProgress,
  levelStatus,
  moduleCardState,
  resolveAccordionKey,
} from "./curriculum-view.entity";

const tree = toCurriculumTree(seededTreeDto());

const ids = (levels: CurriculumLevel[]) => levels.map((level) => level.id);

function moduleOf(overrides: Partial<CurriculumModule> = {}): CurriculumModule {
  return {
    id: "m",
    title: "Módulo",
    description: null,
    order: 1,
    lessonCount: 2,
    status: "PUBLISHED",
    locked: false,
    completed: false,
    missingPrerequisites: [],
    ...overrides,
  };
}

const progress = (completedLessons: number, totalLessons: number) => ({
  percentage: totalLessons ? Math.floor((completedLessons / totalLessons) * 100) : 0,
  completedLessons,
  totalLessons,
  completed: totalLessons > 0 && completedLessons >= totalLessons,
});

describe("groupLevelsIntoAccordions", () => {
  it("splits the levels into VentyLab, Prerequisitos and Mecánica in curriculum order", () => {
    const groups = groupLevelsIntoAccordions(tree, false);

    expect(ids(groups.ventylab)).toEqual(["ventylab-principiante"]);
    expect(ids(groups.prerrequisitos)).toEqual(["level-prerequisitos"]);
    expect(ids(groups.mecanica)).toEqual(["level-beginner", "level-intermedio"]);
  });

  it("shows drafts to staff only and never archived content", () => {
    const dto = seededTreeDto();

    dto.unsectionedLevels = [
      treeLevelDto("archived", 1, null, [], { status: "ARCHIVED" }),
      treeLevelDto("unknown-track", 2, null, [treeModuleDto("old", 1, { status: "ARCHIVED" }), treeModuleDto("new", 2)], { track: "otro" }),
    ];

    const withExtras = toCurriculumTree(dto);
    const staff = groupLevelsIntoAccordions(withExtras, true);
    const student = groupLevelsIntoAccordions(withExtras, false);

    expect(ids(staff.ventylab)).toEqual(["ventylab-principiante", "ventylab-borrador"]);
    expect(ids(student.mecanica)).toEqual(["level-beginner", "level-intermedio", "unknown-track"]);
    expect(student.mecanica[2]?.modules.map((module) => module.id)).toEqual(["new"]);
    expect([...ids(staff.mecanica), ...ids(staff.prerrequisitos)]).not.toContain("archived");
  });
});

describe("resolveAccordionKey", () => {
  it.each([
    ["ventylab", "ventylab"],
    ["prerrequisitos", "prerrequisitos"],
    ["prerequisitos", "prerrequisitos"],
    ["MECANICA", "mecanica"],
    ["level-prerequisitos", "prerrequisitos"],
    ["level-intermedio", "mecanica"],
    ["ventylab-principiante", "ventylab"],
    ["section-ventylab", "ventylab"],
    ["section-mecanica", "mecanica"],
  ])("opens %s in %s", (value, expected) => {
    expect(resolveAccordionKey(value, tree)).toBe(expected);
  });

  it("falls back to null (the default accordion) for anything else", () => {
    expect(resolveAccordionKey("ghost", tree)).toBeNull();
    expect(resolveAccordionKey(undefined, tree)).toBeNull();
    expect(resolveAccordionKey(["mecanica"], tree)).toBeNull();
    expect(resolveAccordionKey("section-mecanica", null)).toBeNull();
  });

  it("uses the first level of a section whose slug is not an accordion key", () => {
    const dto = seededTreeDto();
    const section = dto.sections[0];

    if (section) {
      section.slug = "plataforma";
    }

    expect(resolveAccordionKey("plataforma", toCurriculumTree(dto))).toBe("ventylab");
  });
});

describe("moduleCardState", () => {
  it("derives the five states for a student", () => {
    const student = { levelLocked: false, isStaff: false };

    expect(moduleCardState({ ...student, module: moduleOf({ lessonCount: 0 }), progress: null })).toBe("coming_soon");
    expect(moduleCardState({ ...student, module: moduleOf({ completed: true }), progress: null })).toBe("completed");
    expect(moduleCardState({ ...student, module: moduleOf(), progress: progress(2, 2) })).toBe("completed");
    expect(moduleCardState({ ...student, module: moduleOf({ locked: true }), progress: null })).toBe("locked");
    expect(moduleCardState({ ...student, levelLocked: true, module: moduleOf(), progress: null })).toBe("locked");
    expect(moduleCardState({ ...student, module: moduleOf(), progress: progress(1, 3) })).toBe("in-progress");
    expect(moduleCardState({ ...student, module: moduleOf(), progress: progress(0, 3) })).toBe("available");
  });

  it("never locks staff nor marks their modules as coming soon", () => {
    const staff = { levelLocked: true, isStaff: true, progress: null };

    expect(moduleCardState({ ...staff, module: moduleOf({ locked: true }) })).toBe("available");
    expect(moduleCardState({ ...staff, module: moduleOf({ lessonCount: 0 }) })).toBe("available");
  });

  it("only treats a published module without lessons as coming soon and only opens navigable states", () => {
    expect(isComingSoon(moduleOf({ lessonCount: 0 }))).toBe(true);
    expect(isComingSoon(moduleOf({ lessonCount: 0, status: "DRAFT" }))).toBe(false);
    expect(["completed", "in-progress", "available", "locked", "coming_soon"].map((state) => canOpenModule(state as never)))
      .toEqual([true, true, true, false, false]);
  });
});

describe("levelLockText", () => {
  const [beginner, intermediate] = groupLevelsIntoAccordions(tree, false).mecanica;

  it("asks to complete the previous level when that is what is missing", () => {
    expect(intermediate && levelLockText(intermediate, beginner ?? null)).toBe(LEVEL_LOCK_COPY.previousLevel);
    expect(beginner && levelLockText({ ...beginner, locked: true, missingPrerequisites: [] }, null)).toBe("Completa el nivel anterior para desbloquear");
  });

  it("names the missing prerequisites otherwise", () => {
    const locked = beginner && { ...beginner, locked: true, missingPrerequisites: [{ id: "level-prerequisitos", title: "Prerequisitos" }, { id: "x", title: "Otro" }] };

    expect(locked && levelLockText(locked, null)).toBe("Para desbloquear este nivel, completa: Prerequisitos, Otro");
    expect(beginner && levelLockText(beginner, null)).toBeNull();
  });
});

describe("level progress and status", () => {
  const beginner = groupLevelsIntoAccordions(tree, false).mecanica[0] as CurriculumLevel;

  it("counts completed modules over the visible ones and prefers the backend percentage", () => {
    const done = (module: CurriculumModule) => module.completed;

    expect(levelModuleProgress(beginner, null, done)).toEqual({ completedModules: 1, totalModules: 3, percentage: 33 });
    expect(levelModuleProgress(beginner, progress(5, 10), done)).toEqual({ completedModules: 1, totalModules: 3, percentage: 50 });
  });

  it("derives the July level status", () => {
    const value = (completedModules: number, totalModules: number, percentage: number) => ({ completedModules, totalModules, percentage });

    expect(levelStatus({ ...beginner, locked: true }, value(0, 3, 0), false)).toBe("locked");
    expect(levelStatus({ ...beginner, locked: true }, value(0, 3, 0), true)).toBe("not-started");
    expect(levelStatus(beginner, value(3, 3, 100), false)).toBe("completed");
    expect(levelStatus(beginner, value(1, 3, 33), false)).toBe("in-progress");
  });
});

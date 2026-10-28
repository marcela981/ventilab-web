/*
* Funcionalidad: Curriculum entity tests
* Descripción: Unit tests of the curriculum tree helpers: locating a section, level and module (with their parents, for the breadcrumb and the locks), resolving the links of missing prerequisites (levels link to their section anchor, modules to their page, unknown references have no link) and picking the module for "Continuar donde quedé" (first unlocked, not completed module in curriculum order; preview ignores locks). v1.1 (L3): excludeModuleId skips the module just completed. Depends on vitest. v1.2 (W3, Bloque 2): level prerequisite links point at the Currículo tab.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { CurriculumLevel, CurriculumModule, CurriculumTree } from "./curriculum.entity";
import {
  findNextModule,
  findSection,
  levelPrerequisiteLinks,
  locateLevel,
  locateModule,
  modulePrerequisiteLinks,
} from "./curriculum.entity";

function moduleOf(id: string, overrides: Partial<CurriculumModule> = {}): CurriculumModule {
  return {
    id,
    title: `Módulo ${id}`,
    description: null,
    order: 1,
    lessonCount: 2,
    locked: false,
    completed: false,
    missingPrerequisites: [],
    ...overrides,
  };
}

function levelOf(id: string, sectionId: string | null, modules: CurriculumModule[], overrides: Partial<CurriculumLevel> = {}): CurriculumLevel {
  return {
    id,
    title: `Nivel ${id}`,
    description: null,
    order: 1,
    sectionId,
    locked: false,
    completed: false,
    missingPrerequisites: [],
    modules,
    ...overrides,
  };
}

const tree: CurriculumTree = {
  sections: [
    {
      id: "s1",
      title: "Fundamentos",
      description: null,
      order: 1,
      levels: [
        levelOf("lv1", "s1", [moduleOf("m1", { completed: true }), moduleOf("m2", { locked: true })]),
        levelOf("lv2", "s1", [moduleOf("m3")], { locked: true, missingPrerequisites: [{ id: "lv1", title: "Nivel lv1" }] }),
      ],
    },
  ],
  unsectionedLevels: [levelOf("lv9", null, [moduleOf("m9")])],
};

describe("curriculum locators", () => {
  it("finds a section by id", () => {
    expect(findSection(tree, "s1")?.title).toBe("Fundamentos");
    expect(findSection(tree, "missing")).toBeNull();
  });

  it("locates a level with its section, and unsectioned levels without one", () => {
    expect(locateLevel(tree, "lv2")?.section?.id).toBe("s1");
    expect(locateLevel(tree, "lv9")).toEqual({ section: null, level: tree.unsectionedLevels[0] });
    expect(locateLevel(tree, "nope")).toBeNull();
  });

  it("locates a module with its level and section", () => {
    const location = locateModule(tree, "m3");

    expect(location?.module.id).toBe("m3");
    expect(location?.level.id).toBe("lv2");
    expect(location?.section?.id).toBe("s1");
    expect(locateModule(tree, "m9")?.section).toBeNull();
    expect(locateModule(tree, "nope")).toBeNull();
  });
});

describe("prerequisite links", () => {
  it("links missing levels to their section anchor and leaves unknown ones without link", () => {
    const links = levelPrerequisiteLinks(tree, [
      { id: "lv1", title: "Nivel lv1" },
      { id: "lv9", title: "Nivel lv9" },
      { id: "ghost", title: "Oculto" },
    ]);

    expect(links).toEqual([
      { id: "lv1", title: "Nivel lv1", href: "/learn?tab=curriculo&section=lv1#level-lv1" },
      { id: "lv9", title: "Nivel lv9", href: "/learn?tab=curriculo&section=lv9#level-lv9" },
      { id: "ghost", title: "Oculto", href: null },
    ]);
  });

  it("links missing modules to their module page when the tree knows them", () => {
    expect(modulePrerequisiteLinks(tree, [{ id: "m1", title: "Módulo m1" }, { id: "ghost", title: "Oculto" }])).toEqual([
      { id: "m1", title: "Módulo m1", href: "/learn/modules/m1" },
      { id: "ghost", title: "Oculto", href: null },
    ]);
  });
});

describe("findNextModule", () => {
  it("returns the first unlocked, not completed module in curriculum order", () => {
    // m1 completed, m2 locked, lv2 (m3) locked -> the unsectioned m9.
    expect(findNextModule(tree, { ignoreLocks: false })?.id).toBe("m9");
  });

  it("ignores locks in preview mode", () => {
    expect(findNextModule(tree, { ignoreLocks: true })?.id).toBe("m2");
  });

  it("skips the excluded module (the one just completed, before the backend marks it)", () => {
    expect(findNextModule(tree, { ignoreLocks: true, excludeModuleId: "m2" })?.id).not.toBe("m2");
  });

  it("returns null when everything is completed", () => {
    const done: CurriculumTree = { sections: [], unsectionedLevels: [levelOf("lv", null, [moduleOf("x", { completed: true })])] };

    expect(findNextModule(done, { ignoreLocks: false })).toBeNull();
  });
});

/*
* Funcionalidad: Content tree mapper tests
* Descripción: Unit tests of the editor tree composition: sections in order with their levels (sectionId from /api/levels), levels without a known section under "Sin sección", modules and lessons in order, ancestors (title and status) carried down, lessons without children (lazy pages) and the page summaries of a lesson. Depends on vitest and the content editor test helpers.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { contentFixture, pageSummaryDto, sectionDto } from "../../application/pages/content-editor-test-helpers";
import { composeContentTree, toPageNodes } from "./content-tree.mapper";

describe("composeContentTree", () => {
  it("nests levels under their sections and keeps the rest unsectioned", () => {
    const { sections, levels, tree } = contentFixture();
    const result = composeContentTree(sections, levels, tree);

    expect(result.sections.map((section) => section.title)).toEqual(["Fundamentos", "Avanzado"]);
    expect(result.sections[0]?.children.map((level) => level.title)).toEqual(["Nivel básico"]);
    expect(result.sections[1]?.children.map((level) => level.title)).toEqual(["Nivel experto"]);
    expect(result.unsectionedLevels.map((level) => level.id)).toEqual(["lv9"]);
  });

  it("orders modules and lessons and carries the ancestors down", () => {
    const { sections, levels, tree } = contentFixture();
    const level = composeContentTree(sections, levels, tree).sections[0]?.children[0];
    const moduleNode = level?.children[0];
    const lesson = moduleNode?.children[0];

    expect(level?.children.map((item) => item.title)).toEqual(["Mecánica ventilatoria", "Modos"]);
    expect(moduleNode?.children.map((item) => item.title)).toEqual(["Presiones", "Volumen corriente"]);
    expect(lesson?.ancestors.map((ancestor) => `${ancestor.kind}:${ancestor.id}:${ancestor.status}`)).toEqual([
      "section:s1:PUBLISHED",
      "level:lv1:PUBLISHED",
      "module:m1:PUBLISHED",
    ]);
    expect(lesson?.children).toEqual([]);
  });

  it("treats a level whose section is unknown as unsectioned", () => {
    const { levels, tree } = contentFixture();
    const result = composeContentTree([sectionDto("s1", 1, "Fundamentos")], levels, tree);

    expect(result.unsectionedLevels.map((level) => level.id)).toEqual(["lv2", "lv9"]);
  });
});

describe("toPageNodes", () => {
  it("orders the pages and puts the lesson at the end of their ancestors", () => {
    const { sections, levels, tree } = contentFixture();
    const lesson = composeContentTree(sections, levels, tree).sections[0]?.children[0]?.children[0]?.children[0];

    if (!lesson) {
      throw new Error("fixture lesson missing");
    }

    const pages = toPageNodes([pageSummaryDto("p2", "l1", 2, "Segunda"), pageSummaryDto("p1", "l1", 1, "Primera", "DRAFT")], lesson);

    expect(pages.map((page) => `${page.id}:${page.status}`)).toEqual(["p1:DRAFT", "p2:PUBLISHED"]);
    expect(pages[0]?.ancestors.at(-1)).toEqual({ kind: "lesson", id: "l1", title: "Presiones", status: "PUBLISHED" });
  });
});

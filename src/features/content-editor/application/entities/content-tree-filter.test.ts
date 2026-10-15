/*
* Funcionalidad: Content tree filter tests
* Descripción: Unit tests of the editor tree filters: text matches titles ignoring case and accents and keeps the ancestors of every match (expanded), the status filter keeps nodes with that status plus their ancestors, both filters combine, and an inactive filter returns the tree untouched. Depends on vitest, the tree mapper and the content editor test helpers.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { composeContentTree } from "../../api/mappers/content-tree.mapper";
import { contentFixture } from "../pages/content-editor-test-helpers";
import type { ContentNode } from "./content-node.entity";
import { filterNodes, isFilterActive, NO_FILTER } from "./content-tree-filter";

function sections(): ContentNode[] {
  const { sections: sectionDtos, levels, tree } = contentFixture();

  return composeContentTree(sectionDtos, levels, tree).sections;
}

function titles(nodes: ContentNode[]): string[] {
  return nodes.flatMap((node) => [node.title, ...titles(node.children)]);
}

describe("filterNodes", () => {
  it("returns the same nodes when no filter is active", () => {
    const nodes = sections();
    const result = filterNodes(nodes, NO_FILTER);

    expect(isFilterActive(NO_FILTER)).toBe(false);
    expect(result.nodes).toBe(nodes);
    expect(result.expandedKeys.size).toBe(0);
  });

  it("matches titles ignoring case and accents and keeps the ancestors expanded", () => {
    const result = filterNodes(sections(), { text: "mecanica", status: "ALL" });

    expect(titles(result.nodes)).toEqual(["Fundamentos", "Nivel básico", "Mecánica ventilatoria"]);
    expect([...result.expandedKeys].sort()).toEqual(["level:lv1", "section:s1"]);
  });

  it("keeps the nodes with the selected status and their ancestors", () => {
    const result = filterNodes(sections(), { text: "", status: "DRAFT" });

    expect(titles(result.nodes)).toEqual(["Fundamentos", "Nivel básico", "Modos", "Avanzado", "Nivel experto", "Destete"]);
  });

  it("combines text and status", () => {
    expect(titles(filterNodes(sections(), { text: "modos", status: "PUBLISHED" }).nodes)).toEqual([]);
    expect(titles(filterNodes(sections(), { text: "  PRESIONES ", status: "PUBLISHED" }).nodes)).toEqual([
      "Fundamentos",
      "Nivel básico",
      "Mecánica ventilatoria",
      "Presiones",
    ]);
  });
});

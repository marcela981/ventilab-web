/*
* Funcionalidad: Content node deep link tests
* Descripción: Unit tests of the /content?node= helpers (W6, Bloque 2): only `level:<id>` and `module:<id>` parse (the id keeps any later colon); the expansion keys are the node's ancestors plus the node, null for a node the tree does not have; the row element id. Depends on vitest, the content tree mapper and the content editor test helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { composeContentTree } from "../../api/mappers/content-tree.mapper";
import { contentFixture } from "../pages/content-editor-test-helpers";
import { nodeDomId, nodeLinkExpansion, parseNodeParam } from "./content-node-link";

const { sections, levels, tree: teachingTree } = contentFixture();
const tree = composeContentTree(sections, levels, teachingTree);

describe("parseNodeParam", () => {
  it("parses level and module links", () => {
    expect(parseNodeParam("level:lv1")).toEqual({ kind: "level", id: "lv1" });
    expect(parseNodeParam("module:m:1")).toEqual({ kind: "module", id: "m:1" });
  });

  it.each([undefined, null, "", "lv1", ":lv1", "level:", "lesson:l1", "page:p1", "section:s1", ["level:lv1"]])("rejects %j", (value) => {
    expect(parseNodeParam(value)).toBeNull();
  });
});

describe("nodeLinkExpansion", () => {
  it("expands the ancestors and the node", () => {
    expect(nodeLinkExpansion(tree, { kind: "module", id: "m1" })).toEqual(["section:s1", "level:lv1", "module:m1"]);
    expect(nodeLinkExpansion(tree, { kind: "level", id: "lv9" })).toEqual(["level:lv9"]);
  });

  it("returns null for a node the tree does not have", () => {
    expect(nodeLinkExpansion(tree, { kind: "module", id: "ghost" })).toBeNull();
  });

  it("names the row element of a node", () => {
    expect(nodeDomId({ kind: "module", id: "m1" })).toBe("content-node-module:m1");
  });
});

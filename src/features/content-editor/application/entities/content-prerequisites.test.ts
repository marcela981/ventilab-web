/*
* Funcionalidad: Content prerequisites entity tests
* Descripción: Unit tests of the prerequisite rules of the content editor: which node kinds have prerequisites, the candidate options of a level (other levels grouped by section, "Sin sección" last) and of a module (other modules grouped by level), always excluding the node itself; the bounded breadth-first search over dependents that finds which selected prerequisite already depends on the edited node (shortest chain, null when none is reachable or the visit budget runs out); and the Spanish cycle message naming that dependency and the chain. Depends on vitest and the content prerequisites and node entities.
* Versión: 1.0 (C3)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it, vi } from "vitest";
import type { ContentNode, ContentTree, NodeKind } from "./content-node.entity";
import { cycleMessage, findCycleChain, hasPrerequisites, prerequisiteOptions } from "./content-prerequisites";
import type { DependencyRef } from "./content-prerequisites";

function node(kind: NodeKind, id: string, title: string, children: ContentNode[] = []): ContentNode {
  return { kind, id, title, status: "PUBLISHED", order: 0, description: null, slug: null, ancestors: [], children };
}

const tree: ContentTree = {
  sections: [
    node("section", "s1", "Fundamentos", [
      node("level", "lv1", "Nivel básico", [node("module", "m1", "Mecánica"), node("module", "m2", "Modos")]),
    ]),
    node("section", "s2", "Avanzado", [node("level", "lv2", "Nivel experto", [node("module", "m3", "Destete")])]),
  ],
  unsectionedLevels: [node("level", "lv9", "Nivel libre")],
};

describe("hasPrerequisites", () => {
  it("is true only for levels and modules", () => {
    expect((["section", "level", "module", "lesson", "page"] as const).filter((kind) => hasPrerequisites(kind))).toEqual(["level", "module"]);
  });
});

describe("prerequisiteOptions", () => {
  it("lists the other levels grouped by section, without the level itself", () => {
    expect(prerequisiteOptions(tree, { kind: "level", id: "lv1" })).toEqual([
      { id: "lv2", title: "Nivel experto", group: "Avanzado" },
      { id: "lv9", title: "Nivel libre", group: "Sin sección" },
    ]);
  });

  it("lists the other modules grouped by level, without the module itself", () => {
    expect(prerequisiteOptions(tree, { kind: "module", id: "m1" })).toEqual([
      { id: "m2", title: "Modos", group: "Nivel básico" },
      { id: "m3", title: "Destete", group: "Nivel experto" },
    ]);
  });
});

describe("findCycleChain", () => {
  // Dependents (who requires whom): m1 <- m2 <- m3, m1 <- m4.
  const dependents: Record<string, DependencyRef[]> = {
    m1: [{ id: "m2", title: "Modos" }, { id: "m4", title: "Ventilación" }],
    m2: [{ id: "m3", title: "Destete" }],
    m3: [],
    m4: [],
  };
  const edited: DependencyRef = { id: "m1", title: "Mecánica" };

  it("returns the chain from the selected prerequisite down to the edited node", async() => {
    const chain = await findCycleChain(edited, ["m9", "m3"], (id) => Promise.resolve(dependents[id] ?? []));

    expect(chain?.map((ref) => ref.title)).toEqual(["Destete", "Modos", "Mecánica"]);
  });

  it("returns null when no selected prerequisite depends on the edited node", async() => {
    expect(await findCycleChain(edited, ["m9"], (id) => Promise.resolve(dependents[id] ?? []))).toBeNull();
  });

  it("stops after the visit budget", async() => {
    const lookup = vi.fn((id: string) => Promise.resolve(dependents[id] ?? []));

    expect(await findCycleChain(edited, ["m3"], lookup, 1)).toBeNull();
    expect(lookup).toHaveBeenCalledTimes(1);
  });
});

describe("cycleMessage", () => {
  it("names the selected dependency, the edited node and the chain", () => {
    const chain = [{ id: "m3", title: "Destete" }, { id: "m2", title: "Modos" }, { id: "m1", title: "Mecánica" }];

    expect(cycleMessage(chain)).toBe(
      "Se formaría un ciclo: «Destete» ya depende de «Mecánica» (Destete → Modos → Mecánica). Quita «Destete» de la selección.",
    );
  });
});

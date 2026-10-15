/*
* Funcionalidad: Content prerequisites entity
* Descripción: Prerequisite rules of the content editor (levels and modules only; lessons and pages have none in the backend). prerequisiteOptions lists the candidates of the prerequisites editor from the composed tree: other levels grouped by section title ("Sin sección" last) or other modules grouped by level title, in tree order and never the node itself. findCycleChain explains a 409 circular dependency (the backend answers only the code, without the offending dependency): a bounded breadth-first search over the DEPENDENTS of the edited node (who requires it, directly or transitively) stops at the first selected prerequisite it reaches and returns the chain selected → … → edited node (the shortest one), or null when none is reached within the visit budget. cycleMessage turns that chain into the Spanish message. Pure functions; the dependents lookup is injected. Depends on the content node entity.
* Versión: 1.0 (C3)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ContentNode, ContentTree, NodeKind } from "./content-node.entity";

export type PrerequisiteKind = Extract<NodeKind, "level" | "module">;

export type PrerequisiteOption = {
  id: string
  title: string
  group: string
};

export type DependencyRef = {
  id: string
  title: string
};

export type DependentsLookup = (id: string) => Promise<DependencyRef[]>;

// TODO(i18n): move to a content-editor namespace in src/i18n.
export const UNSECTIONED_GROUP_LABEL = "Sin sección";
export const OTHER_GROUP_LABEL = "Otros";

// Each lookup is one request; the curriculum has a handful of levels and a few dozen modules.
export const CYCLE_SEARCH_MAX_VISITS = 50;

export function hasPrerequisites(kind: NodeKind): kind is PrerequisiteKind {
  return kind === "level" || kind === "module";
}

function levelGroups(tree: ContentTree): { group: string, levels: ContentNode[] }[] {
  return [
    ...tree.sections.map((section) => ({ group: section.title, levels: section.children })),
    { group: UNSECTIONED_GROUP_LABEL, levels: tree.unsectionedLevels },
  ];
}

export function prerequisiteOptions(tree: ContentTree, node: { kind: PrerequisiteKind, id: string }): PrerequisiteOption[] {
  const groups = levelGroups(tree);

  if (node.kind === "level") {
    return groups.flatMap(({ group, levels }) => levels
      .filter((level) => level.id !== node.id)
      .map((level) => ({ id: level.id, title: level.title, group })));
  }

  return groups.flatMap(({ levels }) => levels).flatMap((level) => level.children
    .filter((module) => module.id !== node.id)
    .map((module) => ({ id: module.id, title: module.title, group: level.title })));
}

// Breadth-first over "who requires X": reaching a selected id S means S already depends on the edited node,
// so making S a prerequisite of it closes a cycle. `previous` points one step closer to the edited node.
export async function findCycleChain(
  edited: DependencyRef,
  selectedIds: readonly string[],
  dependentsOf: DependentsLookup,
  maxVisits: number = CYCLE_SEARCH_MAX_VISITS,
): Promise<DependencyRef[] | null> {
  const selected = new Set(selectedIds);
  const previous = new Map<string, DependencyRef>();
  const refs = new Map<string, DependencyRef>([[edited.id, edited]]);
  const queue: string[] = [edited.id];
  let visits = 0;

  while (queue.length > 0 && visits < maxVisits) {
    const current = queue.shift() as string;
    const currentRef = refs.get(current) as DependencyRef;

    visits += 1;

    for (const dependent of await dependentsOf(current)) {
      if (refs.has(dependent.id)) {
        continue;
      }

      refs.set(dependent.id, dependent);
      previous.set(dependent.id, currentRef);

      if (selected.has(dependent.id)) {
        const chain: DependencyRef[] = [dependent];
        let step = previous.get(dependent.id);

        while (step) {
          chain.push(step);
          step = previous.get(step.id);
        }

        return chain;
      }

      queue.push(dependent.id);
    }
  }

  return null;
}

// chain = [selected prerequisite, …, edited node], as returned by findCycleChain.
export function cycleMessage(chain: readonly DependencyRef[]): string {
  const first = chain[0]?.title ?? "";
  const last = chain[chain.length - 1]?.title ?? "";
  const path = chain.map((ref) => ref.title).join(" → ");

  return `Se formaría un ciclo: «${first}» ya depende de «${last}» (${path}). Quita «${first}» de la selección.`;
}

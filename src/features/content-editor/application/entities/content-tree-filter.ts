/*
* Funcionalidad: Content tree filter
* Descripción: Filters of the editor tree. A node matches when its title contains the search text (trimmed, ignoring case and accents) and its status equals the selected one ("ALL" = any). filterNodes keeps every matching node and every ancestor of a match, prunes the rest, and returns the keys of the kept ancestors so the page shows them expanded while the filter is active. An inactive filter returns the same nodes. Lesson pages are lazy, so a page title is only matched once its lesson has been expanded (the pages list applies nodeMatches itself). Pure functions; depends on the content node entity.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { nodeKey } from "./content-node.entity";
import type { ContentNode, ContentStatus } from "./content-node.entity";

export type StatusFilter = ContentStatus | "ALL";

export type TreeFilter = {
  text: string
  status: StatusFilter
};

export const NO_FILTER: TreeFilter = { text: "", status: "ALL" };

export type FilterResult = {
  nodes: ContentNode[]
  // Kept only because a descendant matches: shown expanded while the filter is active.
  expandedKeys: ReadonlySet<string>
};

export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function isFilterActive(filter: TreeFilter): boolean {
  return normalizeText(filter.text) !== "" || filter.status !== "ALL";
}

export function nodeMatches(node: Pick<ContentNode, "title" | "status">, filter: TreeFilter): boolean {
  const text = normalizeText(filter.text);

  return (filter.status === "ALL" || node.status === filter.status) && (text === "" || normalizeText(node.title).includes(text));
}

function prune(nodes: readonly ContentNode[], filter: TreeFilter, expandedKeys: Set<string>): ContentNode[] {
  const kept: ContentNode[] = [];

  for (const node of nodes) {
    const children = prune(node.children, filter, expandedKeys);

    if (children.length > 0) {
      expandedKeys.add(nodeKey(node));
    }

    if (children.length > 0 || nodeMatches(node, filter)) {
      kept.push({ ...node, children });
    }
  }

  return kept;
}

export function filterNodes(nodes: ContentNode[], filter: TreeFilter): FilterResult {
  if (!isFilterActive(filter)) {
    return { nodes, expandedKeys: new Set() };
  }

  const expandedKeys = new Set<string>();

  return { nodes: prune(nodes, filter, expandedKeys), expandedKeys };
}

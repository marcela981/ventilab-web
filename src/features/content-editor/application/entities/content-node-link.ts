/*
* Funcionalidad: Content node deep link
* Descripción: Pure helpers of the /content?node=<kind>:<id> deep link (W6, Bloque 2; DISENO_BLOQUE2 §2.13): the learning "Editar en el CMS" links point at a level or a module. parseNodeParam accepts `level:<id>` and `module:<id>` (the id is everything after the first colon; anything else gives null). nodeLinkExpansion finds the node in the composed tree and returns the expansion keys (`kind:id`, the same keys as the tree expansion state) of its ancestors and of the node itself, or null when the node is not in the tree. nodeDomId is the element id of a node row (scroll and focus target). Depends on the content node entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ContentNode, ContentTree, NodeKind } from "./content-node.entity";
import { nodeKey } from "./content-node.entity";

type LinkableKind = Extract<NodeKind, "level" | "module">;

export type NodeLink = {
  kind: LinkableKind
  id: string
};

const LINKABLE_KINDS: readonly string[] = ["level", "module"];

/** Node of a `?node=` query value; null for anything but `level:<id>` or `module:<id>`. */
export function parseNodeParam(value: unknown): NodeLink | null {
  if (typeof value !== "string") {
    return null;
  }

  const separator = value.indexOf(":");
  const kind = value.slice(0, separator);
  const id = value.slice(separator + 1);

  return separator > 0 && id.length > 0 && LINKABLE_KINDS.includes(kind) ? { kind: kind as LinkableKind, id } : null;
}

function findNode(nodes: readonly ContentNode[], link: NodeLink): ContentNode | null {
  for (const node of nodes) {
    if (node.kind === link.kind && node.id === link.id) {
      return node;
    }

    const found = findNode(node.children, link);

    if (found) {
      return found;
    }
  }

  return null;
}

/** Expansion keys that reveal the node (its ancestors) and its children (the node itself), or null when it is unknown. */
export function nodeLinkExpansion(tree: ContentTree, link: NodeLink): string[] | null {
  const node = findNode([...tree.sections, ...tree.unsectionedLevels], link);

  return node ? [...node.ancestors.map(nodeKey), nodeKey(node)] : null;
}

export function nodeDomId(node: Pick<ContentNode, "kind" | "id">): string {
  return `content-node-${nodeKey(node)}`;
}

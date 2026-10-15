/*
* Funcionalidad: Content reorder
* Descripción: Pure reorder logic of the editor tree. moveId moves one id inside a sibling list (drag and drop source/destination indexes); applyOrder shows an optimistic id order over the nodes of a group (nodes missing from the order stay at the end); reorderRequest builds the per-parent batch call of each sibling group: PUT /api/sections/reorder {ids}, /api/levels/reorder {levelIds}, /api/modules/reorder {levelId, ids}, /api/lessons/reorder {moduleId, ids}, /api/pages/reorder {lessonId, ids}. The client always sends the whole sibling list of one parent. BACKEND GAP: there is no move between parents, so only reordering inside the same parent is offered. Depends on the content node entity.
* Versión: 1.0 (C2)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { SiblingGroup } from "./content-node.entity";

export function moveId(ids: readonly string[], from: number, to: number): string[] {
  const next = [...ids];

  if (from < 0 || from >= ids.length || to < 0 || to >= ids.length) {
    return next;
  }

  const [moved] = next.splice(from, 1);

  if (moved !== undefined) {
    next.splice(to, 0, moved);
  }

  return next;
}

export function applyOrder<T extends { id: string }>(items: readonly T[], order: readonly string[] | undefined): readonly T[] {
  if (!order) {
    return items;
  }

  const position = new Map(order.map((id, index) => [id, index]));

  return [...items].sort((left, right) => (position.get(left.id) ?? order.length) - (position.get(right.id) ?? order.length));
}

export type ReorderRequest =
  | { path: "/api/sections/reorder", body: { ids: string[] } }
  | { path: "/api/levels/reorder", body: { levelIds: string[] } }
  | { path: "/api/modules/reorder", body: { levelId: string, ids: string[] } }
  | { path: "/api/lessons/reorder", body: { moduleId: string, ids: string[] } }
  | { path: "/api/pages/reorder", body: { lessonId: string, ids: string[] } };

export function reorderRequest(group: SiblingGroup, ids: readonly string[]): ReorderRequest {
  const list = [...ids];

  switch (group.kind) {
    case "sections":
      return { path: "/api/sections/reorder", body: { ids: list } };
    case "levels":
      return { path: "/api/levels/reorder", body: { levelIds: list } };
    case "modules":
      return { path: "/api/modules/reorder", body: { levelId: group.levelId, ids: list } };
    case "lessons":
      return { path: "/api/lessons/reorder", body: { moduleId: group.moduleId, ids: list } };
    case "pages":
      return { path: "/api/pages/reorder", body: { lessonId: group.lessonId, ids: list } };
  }
}

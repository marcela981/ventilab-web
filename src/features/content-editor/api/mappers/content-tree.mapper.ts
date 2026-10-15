/*
* Funcionalidad: Content tree mapper
* Descripción: Composes the editor tree Sección > Nivel > Módulo > Lección from three backend reads, because the backend has no full editor tree (BACKEND GAP): GET /api/sections (sections in order), GET /api/levels (the only read that carries each level's sectionId) and GET /api/teaching/tree (every level with its modules and lessons, all statuses, no sections and no pages). A level whose sectionId is missing or unknown goes under "Sin sección". Every node carries its ancestors (kind, id, title, status) so the editor can warn when publishing under a hidden parent. Pages are not part of the composed tree: toPageNodes maps the page summaries of one lesson (GET /api/pages?lessonId=) when that lesson is expanded. Siblings are sorted by their `order`. Depends on the content editor DTOs and the content node entity.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type {
  LevelDTO,
  PageSummaryDTO,
  SectionDTO,
  TreeLessonDTO,
  TreeLevelDTO,
  TreeModuleDTO,
} from "../dtos/content-editor.dto";
import { toAncestorRef } from "../../application/entities/content-node.entity";
import type { AncestorRef, ContentNode, ContentTree } from "../../application/entities/content-node.entity";

function byOrder<T extends { order: number }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order);
}

function childAncestors(parent: ContentNode): AncestorRef[] {
  return [...parent.ancestors, toAncestorRef(parent)];
}

function toLessonNode(lesson: TreeLessonDTO, ancestors: AncestorRef[]): ContentNode {
  return {
    kind: "lesson",
    id: lesson.id,
    title: lesson.title,
    status: lesson.status,
    order: lesson.order,
    description: null,
    slug: lesson.slug,
    ancestors,
    children: [],
  };
}

function toModuleNode(module: TreeModuleDTO, ancestors: AncestorRef[]): ContentNode {
  const node: ContentNode = {
    kind: "module",
    id: module.id,
    title: module.title,
    status: module.status,
    order: module.order,
    description: module.description,
    slug: null,
    ancestors,
    children: [],
  };

  node.children = byOrder(module.lessons).map((lesson) => toLessonNode(lesson, childAncestors(node)));

  return node;
}

function toLevelNode(level: TreeLevelDTO, ancestors: AncestorRef[]): ContentNode {
  const node: ContentNode = {
    kind: "level",
    id: level.id,
    title: level.title,
    status: level.status,
    order: level.order,
    description: level.description,
    slug: null,
    ancestors,
    children: [],
  };

  node.children = byOrder(level.modules).map((module) => toModuleNode(module, childAncestors(node)));

  return node;
}

function toSectionNode(section: SectionDTO): ContentNode {
  return {
    kind: "section",
    id: section.id,
    title: section.title,
    status: section.status,
    order: section.order,
    description: section.description,
    slug: section.slug,
    ancestors: [],
    children: [],
  };
}

export function composeContentTree(sections: readonly SectionDTO[], levels: readonly LevelDTO[], tree: readonly TreeLevelDTO[]): ContentTree {
  const sectionNodes = byOrder(sections).map(toSectionNode);
  const sectionsById = new Map(sectionNodes.map((node) => [node.id, node]));
  const sectionIdByLevel = new Map(levels.map((level) => [level.id, level.sectionId]));
  const unsectionedLevels: ContentNode[] = [];

  for (const level of byOrder(tree)) {
    const sectionId = sectionIdByLevel.get(level.id) ?? null;
    const section = sectionId ? sectionsById.get(sectionId) : undefined;

    if (section) {
      section.children.push(toLevelNode(level, childAncestors(section)));
    } else {
      unsectionedLevels.push(toLevelNode(level, []));
    }
  }

  return { sections: sectionNodes, unsectionedLevels };
}

export function toPageNodes(pages: readonly PageSummaryDTO[], lesson: ContentNode): ContentNode[] {
  const ancestors = childAncestors(lesson);

  return byOrder(pages).map((page) => ({
    kind: "page",
    id: page.id,
    title: page.title,
    status: page.status,
    order: page.order,
    description: null,
    slug: page.slug,
    ancestors,
    children: [],
  }));
}

/*
* Funcionalidad: Content node entity
* Descripción: Domain model of the editor tree Sección > Nivel > Módulo > Lección > Página: ContentNode (kind, id, title, status, description, slug, ancestors and children), the sibling groups that own an order (sections, levels of a section or unsectioned, modules of a level, lessons of a module, pages of a lesson) with their stable keys, the child group and child kind of each node, the Spanish labels of kinds and statuses, the first non-published ancestor that hides a node from students, the order of a new module or lesson (max sibling order + 1), the editable fields per kind with their validation (title and description lengths and slug pattern of the backend DTOs) and slugify. Pure functions, no dependencies.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type ContentStatus = typeof CONTENT_STATUSES[number];

export type NodeKind = "section" | "level" | "module" | "lesson" | "page";

export type AncestorRef = {
  kind: NodeKind
  id: string
  title: string
  status: ContentStatus
};

export type ContentNode = AncestorRef & {
  order: number
  description: string | null
  slug: string | null
  ancestors: AncestorRef[]
  // Lessons always have [] here: their pages are loaded lazily when the lesson is expanded.
  children: ContentNode[]
};

export type ContentTree = {
  sections: ContentNode[]
  unsectionedLevels: ContentNode[]
};

// A list of siblings that share one parent: the unit of creation and of reorder.
export type SiblingGroup =
  | { kind: "sections" }
  | { kind: "levels", sectionId: string | null }
  | { kind: "modules", levelId: string }
  | { kind: "lessons", moduleId: string }
  | { kind: "pages", lessonId: string };

// TODO(i18n): move to a content-editor namespace in src/i18n.
export const STATUS_LABELS: Readonly<Record<ContentStatus, string>> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

export const KIND_LABELS: Readonly<Record<NodeKind, string>> = {
  section: "Sección",
  level: "Nivel",
  module: "Módulo",
  lesson: "Lección",
  page: "Página",
};

export const NEW_NODE_LABELS: Readonly<Record<NodeKind, string>> = {
  section: "Nueva sección",
  level: "Nuevo nivel",
  module: "Nuevo módulo",
  lesson: "Nueva lección",
  page: "Nueva página",
};

export const GROUP_NODE_KIND: Readonly<Record<SiblingGroup["kind"], NodeKind>> = {
  sections: "section",
  levels: "level",
  modules: "module",
  lessons: "lesson",
  pages: "page",
};

export function nodeKey(node: Pick<ContentNode, "kind" | "id">): string {
  return `${node.kind}:${node.id}`;
}

export function groupKey(group: SiblingGroup): string {
  switch (group.kind) {
    case "sections":
      return "sections";
    case "levels":
      return `levels:${group.sectionId ?? "unsectioned"}`;
    case "modules":
      return `modules:${group.levelId}`;
    case "lessons":
      return `lessons:${group.moduleId}`;
    case "pages":
      return `pages:${group.lessonId}`;
  }
}

export function childGroupOf(node: Pick<ContentNode, "kind" | "id">): SiblingGroup | null {
  switch (node.kind) {
    case "section":
      return { kind: "levels", sectionId: node.id };
    case "level":
      return { kind: "modules", levelId: node.id };
    case "module":
      return { kind: "lessons", moduleId: node.id };
    case "lesson":
      return { kind: "pages", lessonId: node.id };
    case "page":
      return null;
  }
}

export function findNode(nodes: readonly ContentNode[], kind: NodeKind, id: string): ContentNode | null {
  for (const node of nodes) {
    if (node.kind === kind && node.id === id) {
      return node;
    }

    const found = findNode(node.children, kind, id);

    if (found) {
      return found;
    }
  }

  return null;
}

// Order for a new module or lesson: the backend defaults it to 0, which collides with the first sibling
// (lessons answer 409, modules get a duplicate slot that later breaks the reorder), so the client sends max + 1.
export function nextChildOrder(tree: ContentTree, group: SiblingGroup): number | undefined {
  const roots = [...tree.sections, ...tree.unsectionedLevels];
  let parent: ContentNode | null = null;

  if (group.kind === "modules") {
    parent = findNode(roots, "level", group.levelId);
  } else if (group.kind === "lessons") {
    parent = findNode(roots, "module", group.moduleId);
  } else {
    return undefined;
  }

  return parent ? Math.max(-1, ...parent.children.map((child) => child.order)) + 1 : undefined;
}

export function toAncestorRef(node: AncestorRef): AncestorRef {
  return { kind: node.kind, id: node.id, title: node.title, status: node.status };
}

// Closest-first is not needed: the first hidden ancestor from the root explains why students cannot see it.
export function hiddenAncestor(node: Pick<ContentNode, "ancestors">): AncestorRef | null {
  return node.ancestors.find((ancestor) => ancestor.status !== "PUBLISHED") ?? null;
}

export type NodeFormValues = {
  title: string
  slug: string
  description: string
};

export type NodeFormField = keyof NodeFormValues;

export type NodeFormErrors = Partial<Record<NodeFormField, string>>;

export const NODE_FORM_FIELDS: Readonly<Record<NodeKind, readonly NodeFormField[]>> = {
  section: ["title", "slug", "description"],
  level: ["title", "description"],
  module: ["title", "description"],
  lesson: ["title"],
  page: ["title"],
};

// Same limits as the backend request DTOs of each kind.
export const TITLE_LENGTH: Readonly<Record<NodeKind, { min: number, max: number }>> = {
  section: { min: 2, max: 150 },
  level: { min: 2, max: 100 },
  module: { min: 3, max: 200 },
  lesson: { min: 3, max: 200 },
  page: { min: 2, max: 200 },
};
export const DESCRIPTION_MAX_LENGTH: Readonly<Record<NodeKind, number>> = {
  section: 2000,
  level: 1000,
  module: 1000,
  lesson: 0,
  page: 2000,
};
// Same rule as the backend DTOs (sections and pages): lowercase letters, digits and single hyphens, 2..80.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MIN_LENGTH = 2;
const SLUG_MAX_LENGTH = 80;

export function validateNodeForm(kind: NodeKind, values: NodeFormValues): NodeFormErrors {
  const fields = NODE_FORM_FIELDS[kind];
  const errors: NodeFormErrors = {};
  const title = values.title.trim();
  const slug = values.slug.trim();

  const { min, max } = TITLE_LENGTH[kind];

  if (!title) {
    errors.title = "Escribe un título.";
  } else if (title.length < min || title.length > max) {
    errors.title = `El título debe tener entre ${min} y ${max} caracteres.`;
  }

  if (fields.includes("slug")) {
    if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) {
      errors.slug = "Usa de 2 a 80 letras minúsculas, números y guiones (por ejemplo: mecanica-basica).";
    }
  }

  if (fields.includes("description") && values.description.trim().length > DESCRIPTION_MAX_LENGTH[kind]) {
    errors.description = `La descripción admite hasta ${DESCRIPTION_MAX_LENGTH[kind]} caracteres.`;
  }

  return errors;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

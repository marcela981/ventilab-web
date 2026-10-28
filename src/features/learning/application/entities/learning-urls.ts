/*
* Funcionalidad: Learning URLs
* Descripción: Pure builders and parsers of the learning routes. The URL is the ONLY source of navigation state (no in-memory step pointer): /learn, /learn/[sectionId], /learn/modules/[moduleId], /learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber] (pageNumber = 1-based order of the backend Page inside its lesson) and /learn/modules/[moduleId]/print. Levels have no route of their own: they link to their anchor inside the section page (or /learn for levels without a section). v1.1 (L3): buildModuleCompletedUrl, the module page with ?completed=1 (completion screen shown after the last Page of the module). v1.2 (R1): resolveLegacyLessonUrl maps the legacy /teaching/[moduleId]/[lessonId] (and /teaching?moduleId=&lessonId=) query to page 1 of the same lesson; seeded module and lesson ids are identical in the legacy curriculum and the backend, and the legacy viewer had no page in the URL. No dependencies. v1.3 (B3.8, D5): resolveLegacyLessonUrl removed; the same mapping is a next.config redirect rule (config/legacy-redirects.mjs). v1.4 (W3, Bloque 2): /learn is a tabbed workspace (?tab=inicio|curriculo|progreso) and sections and levels have no page of their own: buildCurriculumUrl opens the Currículo tab with `?section=` (an accordion key, section id or slug, track or level id, resolved by the curriculum tab); buildSectionUrl and buildLevelUrl (plus the level anchor) build on it. /learn/[sectionId] only redirects there. /learn/modules/[moduleId] is the resume resolver; the ?completed=1 module URL is gone (the viewer shows the completion card). v1.5 (W4, Bloque 2): buildContentNodeUrl, the content editor deep link of a level or module (/content?node=level:<id> | module:<id>) for the staff edit mode. v1.6 (W5, Bloque 2): buildPageEditorUrl, the content editor of one Page (/content/pages/[pageId]) for the viewer's "Editar esta página".
* Versión: 1.6
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const LEARN_HOME_URL = "/learn";

const segment = (value: string): string => encodeURIComponent(value);

export const CURRICULUM_SECTION_PARAM = "section";

/** Currículo tab of /learn, optionally opening the accordion that `section` resolves to. */
export function buildCurriculumUrl(section: string | null = null): string {
  const base = `${LEARN_HOME_URL}?tab=curriculo`;

  return section ? `${base}&${CURRICULUM_SECTION_PARAM}=${segment(section)}` : base;
}

export function buildSectionUrl(sectionId: string): string {
  return buildCurriculumUrl(sectionId);
}

export function levelAnchorId(levelId: string): string {
  return `level-${levelId}`;
}

// The level id opens the accordion that holds the level; the anchor scrolls to it.
export function buildLevelUrl(levelId: string): string {
  return `${buildCurriculumUrl(levelId)}#${levelAnchorId(levelId)}`;
}

export function buildModuleUrl(moduleId: string): string {
  return `${LEARN_HOME_URL}/modules/${segment(moduleId)}`;
}

export function buildLessonPageUrl(moduleId: string, lessonId: string, pageNumber = 1): string {
  return `${buildModuleUrl(moduleId)}/lessons/${segment(lessonId)}/${pageNumber}`;
}

export function buildModulePrintUrl(moduleId: string): string {
  return `${buildModuleUrl(moduleId)}/print`;
}

// Content editor route, kept local (feature barrels are not tree-shaken); its ?node= deep link expands the node.
const CONTENT_EDITOR_URL = "/content";

/** "Editar en el CMS" link of a level or module (staff edit mode). */
export function buildContentNodeUrl(kind: "level" | "module", id: string): string {
  return `${CONTENT_EDITOR_URL}?node=${kind}:${segment(id)}`;
}

/** "Editar esta página" link of the lesson viewer (staff). */
export function buildPageEditorUrl(pageId: string): string {
  return `${CONTENT_EDITOR_URL}/pages/${segment(pageId)}`;
}

const PAGE_NUMBER_PATTERN = /^[1-9]\d*$/;

// Router query values are string | string[] | undefined; only a canonical positive integer is valid.
export function parsePageNumber(value: unknown): number | null {
  if (typeof value !== "string" || !PAGE_NUMBER_PATTERN.test(value)) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseRouteId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
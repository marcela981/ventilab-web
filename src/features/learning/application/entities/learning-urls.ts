/*
* Funcionalidad: Learning URLs
* Descripción: Pure builders and parsers of the learning routes. The URL is the ONLY source of navigation state (no in-memory step pointer): /learn, /learn/[sectionId], /learn/modules/[moduleId], /learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber] (pageNumber = 1-based order of the backend Page inside its lesson) and /learn/modules/[moduleId]/print. Levels have no route of their own: they link to their anchor inside the section page (or /learn for levels without a section). v1.1 (L3): buildModuleCompletedUrl, the module page with ?completed=1 (completion screen shown after the last Page of the module). v1.2 (R1): resolveLegacyLessonUrl maps the legacy /teaching/[moduleId]/[lessonId] (and /teaching?moduleId=&lessonId=) query to page 1 of the same lesson; seeded module and lesson ids are identical in the legacy curriculum and the backend, and the legacy viewer had no page in the URL. No dependencies.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const LEARN_HOME_URL = "/learn";

const segment = (value: string): string => encodeURIComponent(value);

export function buildSectionUrl(sectionId: string): string {
  return `${LEARN_HOME_URL}/${segment(sectionId)}`;
}

export function levelAnchorId(levelId: string): string {
  return `level-${levelId}`;
}

export function buildLevelUrl(levelId: string, sectionId: string | null): string {
  const base = sectionId ? buildSectionUrl(sectionId) : LEARN_HOME_URL;

  return `${base}#${levelAnchorId(levelId)}`;
}

export function buildModuleUrl(moduleId: string): string {
  return `${LEARN_HOME_URL}/modules/${segment(moduleId)}`;
}

export function buildLessonPageUrl(moduleId: string, lessonId: string, pageNumber = 1): string {
  return `${buildModuleUrl(moduleId)}/lessons/${segment(lessonId)}/${pageNumber}`;
}

export const MODULE_COMPLETED_PARAM = "completed";

export function buildModuleCompletedUrl(moduleId: string): string {
  return `${buildModuleUrl(moduleId)}?${MODULE_COMPLETED_PARAM}=1`;
}

export function buildModulePrintUrl(moduleId: string): string {
  return `${buildModuleUrl(moduleId)}/print`;
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

// Legacy /teaching routes kept the page pointer in memory, so they always land on page 1.
export function resolveLegacyLessonUrl(query: Record<string, unknown>): string | null {
  const moduleId = parseRouteId(query.moduleId);
  const lessonId = parseRouteId(query.lessonId);

  return moduleId && lessonId ? buildLessonPageUrl(moduleId, lessonId) : null;
}

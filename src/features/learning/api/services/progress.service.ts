/*
* Funcionalidad: Progress service
* Descripción: SWR keys (paths) of the learning progress reads (summary, section, level, module) used with useApiQuery, the page-view registration (`POST /api/progress/pages/{pageId}/view`, idempotent per user and page) and PAGE_VIEW_INVALIDATES: the keys a page view can change (module, level, section and summary progress, and the curriculum tree, whose locks may open). Default (fast) timeout; errors reject with ApiError. Depends on @shared/api-client and the curriculum service. v1.1 (W5, Bloque 2): the invalidation is split: PAGE_VIEW_INVALIDATES (level, section and summary progress) after every view, LESSON_COMPLETION_INVALIDATES (adds the module progress and the curriculum tree) only when the view completed a lesson (lessonJustCompleted), so the viewer no longer refetches the tree on every page; the module progress of a non-completing view is patched in the cache with the response values. v1.2 (W9, Bloque 2): PAGE_VIEW_INVALIDATES also lists the gamification keys (stats, recent activity, calendar, achievements): a first view gives XP and may unlock an achievement, so Inicio and Mi Progreso refetch when they mount again.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost } from "@shared/api-client/api-request";
import type { PageViewResultDTO } from "../dtos/progress.dto";
import { CURRICULUM_TREE_PATH } from "./curriculum.service";
import { GAMIFICATION_INVALIDATES } from "./gamification.service";

export const PROGRESS_SUMMARY_PATH = "/api/progress/summary";
export const SECTION_PROGRESS_PATH = "/api/progress/sections/{sectionId}";
export const LEVEL_PROGRESS_PATH = "/api/progress/levels/{levelId}";
export const MODULE_PROGRESS_PATH = "/api/progress/modules/{moduleId}";

// Revalidated after every successful view (the viewer reads none of them, so no request there).
export const PAGE_VIEW_INVALIDATES = [
  LEVEL_PROGRESS_PATH,
  SECTION_PROGRESS_PATH,
  PROGRESS_SUMMARY_PATH,
  ...GAMIFICATION_INVALIDATES,
] as const;

// Revalidated only when the view completed a lesson: completions and locks change (the tree is the expensive one).
export const LESSON_COMPLETION_INVALIDATES = [
  ...PAGE_VIEW_INVALIDATES,
  MODULE_PROGRESS_PATH,
  CURRICULUM_TREE_PATH,
] as const;

export async function recordPageView(pageId: string): Promise<PageViewResultDTO> {
  const result = await apiPost("/api/progress/pages/{pageId}/view", { params: { pageId } });

  return result.data;
}

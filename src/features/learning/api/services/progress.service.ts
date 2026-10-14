/*
* Funcionalidad: Progress service
* Descripción: SWR keys (paths) of the learning progress reads (summary, section, level, module) used with useApiQuery, the page-view registration (`POST /api/progress/pages/{pageId}/view`, idempotent per user and page) and PAGE_VIEW_INVALIDATES: the keys a page view can change (module, level, section and summary progress, and the curriculum tree, whose locks may open). Default (fast) timeout; errors reject with ApiError. Depends on @shared/api-client and the curriculum service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost } from "@shared/api-client/api-request";
import type { PageViewResultDTO } from "../dtos/progress.dto";
import { CURRICULUM_TREE_PATH } from "./curriculum.service";

export const PROGRESS_SUMMARY_PATH = "/api/progress/summary";
export const SECTION_PROGRESS_PATH = "/api/progress/sections/{sectionId}";
export const LEVEL_PROGRESS_PATH = "/api/progress/levels/{levelId}";
export const MODULE_PROGRESS_PATH = "/api/progress/modules/{moduleId}";

export const PAGE_VIEW_INVALIDATES = [
  MODULE_PROGRESS_PATH,
  LEVEL_PROGRESS_PATH,
  SECTION_PROGRESS_PATH,
  PROGRESS_SUMMARY_PATH,
  CURRICULUM_TREE_PATH,
] as const;

export async function recordPageView(pageId: string): Promise<PageViewResultDTO> {
  const result = await apiPost("/api/progress/pages/{pageId}/view", { params: { pageId } });

  return result.data;
}

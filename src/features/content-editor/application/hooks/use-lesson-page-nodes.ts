/*
* Funcionalidad: useLessonPageNodes
* Descripción: Lazy pages of one lesson for the editor tree: GET /api/pages?lessonId= (page summaries, every status for staff, no blocks) mapped to page nodes under that lesson. It is only mounted when the lesson node is expanded, so no page list is fetched up front (cheaper than GET /api/modules/{id}/full, which also returns every block). Depends on @shared/api-client, the content editor service, mapper and query config.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toPageNodes } from "../../api/mappers/content-tree.mapper";
import { LESSON_PAGES_PATH } from "../../api/services/content-editor.service";
import type { ContentNode } from "../entities/content-node.entity";
import { CONTENT_QUERY_CONFIG } from "./use-content-tree";

export type UseLessonPageNodesResult = {
  pages: ContentNode[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useLessonPageNodes(lesson: ContentNode): UseLessonPageNodesResult {
  const { data, error, isLoading, mutate } = useApiQuery(LESSON_PAGES_PATH, { query: { lessonId: lesson.id } }, CONTENT_QUERY_CONFIG);
  const pages = useMemo(() => (data ? toPageNodes(data.data, lesson) : null), [data, lesson]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { pages, isLoading, error: error ?? null, reload };
}

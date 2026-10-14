/*
* Funcionalidad: useLessonPages
* Descripción: Reads the Pages of a lesson (`GET /api/pages?lessonId=`) through useApiQuery with the learning cache config and maps them to LessonPage sorted by order; the 1-based position of a Page is the [pageNumber] of the viewer URL (decision 1). A null lessonId disables the query. Used by the viewer (L3). Depends on @shared/api-client and the curriculum mapper/service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toLessonPages } from "../../api/mappers/curriculum.mapper";
import { LESSON_PAGES_PATH } from "../../api/services/curriculum.service";
import type { LessonPage } from "../entities/lesson.entity";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";

export type UseLessonPagesResult = {
  pages: LessonPage[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useLessonPages(lessonId: string | null): UseLessonPagesResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    lessonId ? LESSON_PAGES_PATH : null,
    { query: { lessonId: lessonId ?? "" } },
    LEARNING_QUERY_CONFIG,
  );
  const pages = useMemo(() => (data ? toLessonPages(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { pages, isLoading, error: error ?? null, reload };
}

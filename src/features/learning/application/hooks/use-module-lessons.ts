/*
* Funcionalidad: useModuleLessons
* Descripción: Reads the lessons of a module (`GET /api/modules/{id}/lessons`) through useApiQuery with the learning cache config and maps them to LessonSummary sorted by order. A null moduleId disables the query. The query is NOT gated on the curriculum tree: the module page fires tree, module progress and lessons in parallel. Depends on @shared/api-client and the curriculum mapper/service.
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
import { toLessonSummaries } from "../../api/mappers/curriculum.mapper";
import { MODULE_LESSONS_PATH } from "../../api/services/curriculum.service";
import type { LessonSummary } from "../entities/lesson.entity";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";

export type UseModuleLessonsResult = {
  lessons: LessonSummary[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useModuleLessons(moduleId: string | null): UseModuleLessonsResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    moduleId ? MODULE_LESSONS_PATH : null,
    { params: { id: moduleId ?? "" } },
    LEARNING_QUERY_CONFIG,
  );
  const lessons = useMemo(() => (data ? toLessonSummaries(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { lessons, isLoading, error: error ?? null, reload };
}

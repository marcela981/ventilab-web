/*
* Funcionalidad: Learning progress hooks
* Descripción: useProgressSummary, useSectionProgress, useLevelProgress and useModuleProgress read the backend progress (`GET /api/progress/summary`, `/sections/{sectionId}`, `/levels/{levelId}`, `/modules/{moduleId}`) through useApiQuery with the learning cache config (C4: cache-first, stale-while-revalidate, 60 s dedupe, keepPreviousData) and map them to the progress entities. Values are the backend's; nothing is recalculated. A null id disables the query. None of them waits for another query (no request cascade). Depends on @shared/api-client and the progress mapper/service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import {
  toLevelProgress,
  toModuleProgress,
  toProgressSummary,
  toSectionProgress,
} from "../../api/mappers/progress.mapper";
import {
  LEVEL_PROGRESS_PATH,
  MODULE_PROGRESS_PATH,
  PROGRESS_SUMMARY_PATH,
  SECTION_PROGRESS_PATH,
} from "../../api/services/progress.service";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";
import type { LevelProgress, ModuleProgress, ProgressSummary, SectionProgress } from "../entities/progress.entity";

export type ProgressQueryResult<T> = {
  progress: T | null
  isLoading: boolean
  error: ApiError | null
};

export function useProgressSummary(): ProgressQueryResult<ProgressSummary> {
  const { data, error, isLoading } = useApiQuery(PROGRESS_SUMMARY_PATH, undefined, LEARNING_QUERY_CONFIG);
  const progress = useMemo(() => (data ? toProgressSummary(data.data) : null), [data]);

  return { progress, isLoading, error: error ?? null };
}

export function useSectionProgress(sectionId: string | null): ProgressQueryResult<SectionProgress> {
  const { data, error, isLoading } = useApiQuery(
    sectionId ? SECTION_PROGRESS_PATH : null,
    { params: { sectionId: sectionId ?? "" } },
    LEARNING_QUERY_CONFIG,
  );
  const progress = useMemo(() => (data ? toSectionProgress(data.data) : null), [data]);

  return { progress, isLoading, error: error ?? null };
}

export function useLevelProgress(levelId: string | null): ProgressQueryResult<LevelProgress> {
  const { data, error, isLoading } = useApiQuery(
    levelId ? LEVEL_PROGRESS_PATH : null,
    { params: { levelId: levelId ?? "" } },
    LEARNING_QUERY_CONFIG,
  );
  const progress = useMemo(() => (data ? toLevelProgress(data.data) : null), [data]);

  return { progress, isLoading, error: error ?? null };
}

export function useModuleProgress(moduleId: string | null): ProgressQueryResult<ModuleProgress> {
  const { data, error, isLoading } = useApiQuery(
    moduleId ? MODULE_PROGRESS_PATH : null,
    { params: { moduleId: moduleId ?? "" } },
    LEARNING_QUERY_CONFIG,
  );
  const progress = useMemo(() => (data ? toModuleProgress(data.data) : null), [data]);

  return { progress, isLoading, error: error ?? null };
}

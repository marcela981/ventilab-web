/*
* Funcionalidad: useCurriculumTree
* Descripción: Reads the student curriculum tree (`GET /api/curriculum/tree`) through useApiQuery with the learning cache config (60 s dedupe; v1.1 (L3): no keepPreviousData) and maps it to the CurriculumTree entity (levels and modules carry locked / missingPrerequisites / completed). Exposes loading, error and reload. Depends on @shared/api-client and the curriculum mapper/service. v1.2 (W3, Bloque 2): optional enabled flag (the /learn workspace warms the tree up in parallel with the Currículo panel chunk). v1.3 (W5, Bloque 2): useCachedCurriculumTree reads the tree already in the SWR cache (e.g. after /learn) without ever requesting it (paused query): the lesson viewer uses it for the section and level of the breadcrumb, so a direct visit to a page sends no tree request.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toCurriculumTree } from "../../api/mappers/curriculum.mapper";
import { CURRICULUM_TREE_PATH } from "../../api/services/curriculum.service";
import type { CurriculumTree } from "../entities/curriculum.entity";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";

// Subscribed to the cache entry but never fetching: isPaused makes every revalidation (mount, invalidation) a no-op.
const CACHE_ONLY_CONFIG = { ...LEARNING_QUERY_CONFIG, isPaused: () => true } as const;

export type UseCurriculumTreeResult = {
  tree: CurriculumTree | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

// enabled = false disables the query (the /learn workspace only warms it up for the Currículo tab).
export function useCurriculumTree(enabled = true): UseCurriculumTreeResult {
  const { data, error, isLoading, mutate } = useApiQuery(enabled ? CURRICULUM_TREE_PATH : null, undefined, LEARNING_QUERY_CONFIG);
  const tree = useMemo(() => (data ? toCurriculumTree(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { tree, isLoading, error: error ?? null, reload };
}

/** The tree already cached by another screen, or null; never sends a request. */
export function useCachedCurriculumTree(): CurriculumTree | null {
  const { data } = useApiQuery(CURRICULUM_TREE_PATH, undefined, CACHE_ONLY_CONFIG);

  return useMemo(() => (data ? toCurriculumTree(data.data) : null), [data]);
}

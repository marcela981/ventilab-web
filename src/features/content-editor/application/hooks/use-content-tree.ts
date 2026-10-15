/*
* Funcionalidad: useContentTree
* Descripción: Loads the three reads of the editor tree in parallel (GET /api/sections, GET /api/levels?limit=100&includeInactive=true, GET /api/teaching/tree; no gated queries) and composes them with composeContentTree. `tree` is null until the three answered; the first error of any read is reported and `reload` revalidates the three. Focus revalidation is off so an open dialog is not disturbed. Depends on SWR through @shared/api-client, the content editor service and mapper.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { SWRConfiguration } from "swr";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { composeContentTree } from "../../api/mappers/content-tree.mapper";
import { LEVELS_PATH, LEVELS_QUERY, SECTIONS_PATH, TEACHING_TREE_PATH } from "../../api/services/content-editor.service";
import type { ContentTree } from "../entities/content-node.entity";

export const CONTENT_QUERY_CONFIG = {
  revalidateOnFocus: false,
  keepPreviousData: false,
} as const satisfies SWRConfiguration;

export type UseContentTreeResult = {
  tree: ContentTree | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useContentTree(): UseContentTreeResult {
  const sections = useApiQuery(SECTIONS_PATH, undefined, CONTENT_QUERY_CONFIG);
  const levels = useApiQuery(LEVELS_PATH, { query: LEVELS_QUERY }, CONTENT_QUERY_CONFIG);
  const teachingTree = useApiQuery(TEACHING_TREE_PATH, undefined, CONTENT_QUERY_CONFIG);
  const tree = useMemo(
    () => (sections.data && levels.data && teachingTree.data
      ? composeContentTree(sections.data.data, levels.data.data, teachingTree.data.data)
      : null),
    [sections.data, levels.data, teachingTree.data],
  );
  const { mutate: mutateSections } = sections;
  const { mutate: mutateLevels } = levels;
  const { mutate: mutateTree } = teachingTree;

  const reload = useCallback(async() => {
    await Promise.all([mutateSections(), mutateLevels(), mutateTree()]);
  }, [mutateSections, mutateLevels, mutateTree]);

  return {
    tree,
    isLoading: sections.isLoading || levels.isLoading || teachingTree.isLoading,
    error: sections.error ?? levels.error ?? teachingTree.error ?? null,
    reload,
  };
}

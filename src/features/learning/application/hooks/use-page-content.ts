/*
* Funcionalidad: usePageContent
* Descripción: Reads one Page with its blocks (`GET /api/pages/{id}`) through useApiQuery with the learning cache config and maps it to PageContent (active blocks sorted by order). A null pageId disables the query: the viewer passes null until it knows the Page id of the URL position AND the module is visible for the user (a locked module is never requested for a student). Exposes loading, error and reload. Depends on @shared/api-client and the curriculum mapper/service.
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
import { toPageContent } from "../../api/mappers/curriculum.mapper";
import { PAGE_PATH } from "../../api/services/curriculum.service";
import type { PageContent } from "../entities/lesson.entity";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";

export type UsePageContentResult = {
  page: PageContent | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function usePageContent(pageId: string | null): UsePageContentResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    pageId ? PAGE_PATH : null,
    { params: { id: pageId ?? "" } },
    LEARNING_QUERY_CONFIG,
  );
  const page = useMemo(() => (data ? toPageContent(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { page, isLoading, error: error ?? null, reload };
}

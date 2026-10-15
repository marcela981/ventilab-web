/*
* Funcionalidad: useAuthoringEvaluations
* Descripción: Reads one page of the evaluations the signed-in teacher or admin can author (`GET /api/evaluations` with type, status, search, sortBy updatedAt desc, page and limit; the backend scopes the list and paginates it) through useApiQuery and maps it to an EvaluationListPage. The previous page stays on screen while the next one loads (keepPreviousData). Also exports useDebouncedValue, used for the 300 ms debounce of the text search. Depends on React, @shared/api-client and the authoring mappers, service and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toEvaluationListPage } from "../../api/mappers/evaluation-authoring.mapper";
import { EVALUATIONS_PATH } from "../../api/services/evaluation-authoring.service";
import type { EvaluationListPage, EvaluationListQuery } from "../entities/evaluation-authoring.entity";

export const SEARCH_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export type UseAuthoringEvaluationsResult = {
  page: EvaluationListPage | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const LIST_QUERY_CONFIG = { keepPreviousData: true } as const;

export function useAuthoringEvaluations(query: EvaluationListQuery): UseAuthoringEvaluationsResult {
  const { data, error, isLoading, mutate } = useApiQuery(EVALUATIONS_PATH, { query }, LIST_QUERY_CONFIG);
  const page = useMemo(() => (data ? toEvaluationListPage(data.data, data.pagination) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { page, isLoading, error: error ?? null, reload };
}

/*
* Funcionalidad: useCaseList
* Descripción: Staff case list (GET /api/clinical-cases) with the server-side status, pathology and difficulty
*   filters and pagination: a filter change returns to the first page, and a page beyond the last one (cases archived
*   meanwhile) steps back to the last page during render. Rows carry the status only while the list is filtered by
*   one. Depends on the api-client query hook, the case editor service, config and list entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo, useState } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { CASES_PATH } from "../../api/services/case-editor.service";
import { CASE_LIST_PAGE_SIZE } from "../config/case-editor.config";
import { NO_CASE_LIST_FILTERS, toCaseListQuery, toCaseListRow } from "../entities/case-list.entity";
import type { CaseListFilters, CaseListRow } from "../entities/case-list.entity";

export type CaseListPagination = { page: number, pages: number, limit: number, total: number };

export type UseCaseListResult = {
  rows: CaseListRow[] | null
  filters: CaseListFilters
  setFilters: (filters: CaseListFilters) => void
  page: number
  setPage: (page: number) => void
  pagination: CaseListPagination | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useCaseList(pageSize: number = CASE_LIST_PAGE_SIZE): UseCaseListResult {
  const [filters, setFilterState] = useState<CaseListFilters>(NO_CASE_LIST_FILTERS);
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useApiQuery(CASES_PATH, { query: toCaseListQuery(filters, page, pageSize) });
  const rows = useMemo(() => (data ? data.data.map((item) => toCaseListRow(item, filters.status)) : null), [data, filters.status]);
  const raw = data?.pagination;
  const pagination = raw ? { page: raw.page, pages: raw.pages, limit: raw.limit, total: raw.total } : null;
  const lastPage = raw ? Math.max(1, raw.pages) : null;

  if (lastPage !== null && page > lastPage) {
    setPage(lastPage);
  }

  const setFilters = useCallback((next: CaseListFilters) => {
    setFilterState(next);
    setPage(1);
  }, []);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { rows, filters, setFilters, page, setPage, pagination, isLoading, error: error ?? null, reload };
}

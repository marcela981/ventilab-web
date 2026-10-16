/*
* Funcionalidad: useCaseCatalog
* Descripción: Catalog of published clinical cases for the simulator (GET /api/clinical-cases). Owns the pathology and difficulty filters and the page; the filters are server-side query params of the endpoint (no client-side filtering), and changing a filter goes back to page 1. Exposes the mapped case cards, the server pagination, loading/error and a reload. Depends on useApiQuery, the clinical cases service, the simulator mapper, entities and config.
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
import { toCaseCard } from "../../api/mappers/simulator.mapper";
import { CLINICAL_CASES_PATH, clinicalCasesQuery } from "../../api/services/clinical-cases.service";
import { CATALOG_PAGE_SIZE } from "../config/simulator.config";
import { buildCatalogQuery, NO_CATALOG_FILTERS } from "../entities/simulator.entity";
import type { CaseCard, CatalogFilters, ListPagination } from "../entities/simulator.entity";

export type UseCaseCatalogResult = {
  cases: CaseCard[] | null
  filters: CatalogFilters
  setFilters: (filters: CatalogFilters) => void
  page: number
  setPage: (page: number) => void
  pagination: ListPagination | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useCaseCatalog(pageSize: number = CATALOG_PAGE_SIZE): UseCaseCatalogResult {
  const [filters, setFilterState] = useState<CatalogFilters>(NO_CATALOG_FILTERS);
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useApiQuery(CLINICAL_CASES_PATH, {
    query: clinicalCasesQuery(buildCatalogQuery(filters, page, pageSize)),
  });
  const cases = useMemo(() => (data ? data.data.map(toCaseCard) : null), [data]);
  const raw = data?.pagination;
  const pagination = raw ? { page: raw.page, pages: raw.pages, limit: raw.limit, total: raw.total } : null;

  const setFilters = useCallback((next: CatalogFilters) => {
    setFilterState(next);
    setPage(1);
  }, []);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { cases, filters, setFilters, page, setPage, pagination, isLoading, error: error ?? null, reload };
}

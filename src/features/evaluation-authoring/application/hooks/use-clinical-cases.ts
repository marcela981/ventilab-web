/*
* Funcionalidad: useClinicalCases
* Descripción: Reads of the clinical case selector of SIMULATION questions through useApiQuery: usePublishedClinicalCases(page) lists one page of published cases (`GET /api/clinical-cases?status=PUBLISHED&page&limit&sortOrder=desc`, keeping the previous page on screen while the next loads) and useClinicalCaseChoice(id) reads the chosen case by id (`?ids=<id>`, any status) so its title shows even when it is not on the loaded page. Depends on React, @shared/api-client and the authoring mappers, service and entities.
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
import { toClinicalCaseChoice, toClinicalCasePage } from "../../api/mappers/clinical-case.mapper";
import { CLINICAL_CASES_PATH } from "../../api/services/evaluation-authoring.service";
import { CLINICAL_CASES_PAGE_SIZE } from "../entities/clinical-case-choice.entity";
import type { ClinicalCaseChoice, ClinicalCasePage } from "../entities/clinical-case-choice.entity";

export type UsePublishedClinicalCasesResult = {
  casesPage: ClinicalCasePage | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const CASES_QUERY_CONFIG = { keepPreviousData: true, revalidateOnFocus: false } as const;

export function usePublishedClinicalCases(page: number): UsePublishedClinicalCasesResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    CLINICAL_CASES_PATH,
    { query: { status: "PUBLISHED", page, limit: CLINICAL_CASES_PAGE_SIZE, sortOrder: "desc" } },
    CASES_QUERY_CONFIG,
  );
  const casesPage = useMemo(() => (data ? toClinicalCasePage(data.data, data.pagination) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { casesPage, isLoading, error: error ?? null, reload };
}

export function useClinicalCaseChoice(id: string | null): ClinicalCaseChoice | null {
  const { data } = useApiQuery(id === null ? null : CLINICAL_CASES_PATH, { query: { ids: id ?? "", limit: 1 } }, { revalidateOnFocus: false });

  return useMemo(() => {
    const item = data?.data.find((candidate) => candidate.clinicalCase.id === id);

    return item ? toClinicalCaseChoice(item) : null;
  }, [data, id]);
}

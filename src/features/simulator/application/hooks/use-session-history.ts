/*
* Funcionalidad: useSessionHistory
* Descripción: "Mis sesiones" of the simulator: the authenticated user's simulation sessions, newest first, page by page (GET /api/simulation/sessions/history with page and limit; the response carries the server pagination). The history rows only carry `caseId`, so the case titles of the loaded page come from a second request to GET /api/clinical-cases with the `ids` filter; a case the user can no longer read (unpublished) keeps a null title. Depends on useApiQuery, the simulator services, mapper, entities and config.
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
import { toSessionHistoryItem } from "../../api/mappers/simulator.mapper";
import { CLINICAL_CASES_PATH, clinicalCasesByIdsQuery } from "../../api/services/clinical-cases.service";
import { SIMULATION_SESSION_HISTORY_PATH, sessionHistoryQuery } from "../../api/services/simulation-sessions.service";
import { SESSION_HISTORY_PAGE_SIZE } from "../config/simulator.config";
import type { ListPagination, SessionHistoryItem } from "../entities/simulator.entity";

export type SessionHistoryRow = SessionHistoryItem & {
  /** `null` while loading or when the case is no longer readable. */
  caseTitle: string | null
};

export type UseSessionHistoryResult = {
  sessions: SessionHistoryRow[] | null
  page: number
  setPage: (page: number) => void
  pagination: ListPagination | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useSessionHistory(pageSize: number = SESSION_HISTORY_PAGE_SIZE): UseSessionHistoryResult {
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useApiQuery(SIMULATION_SESSION_HISTORY_PATH, {
    query: sessionHistoryQuery({ page, limit: pageSize }),
  });
  const items = useMemo(() => (data ? data.data.map(toSessionHistoryItem) : null), [data]);
  const caseIds = useMemo(() => [...new Set((items ?? []).map((item) => item.caseId))].sort(), [items]);
  const cases = useApiQuery(caseIds.length > 0 ? CLINICAL_CASES_PATH : null, { query: clinicalCasesByIdsQuery(caseIds) });
  const titles = useMemo(
    () => new Map((cases.data?.data ?? []).map(({ clinicalCase }) => [clinicalCase.id, clinicalCase.title])),
    [cases.data],
  );
  const sessions = useMemo(
    () => (items ? items.map((item) => ({ ...item, caseTitle: titles.get(item.caseId) ?? null })) : null),
    [items, titles],
  );
  const raw = data?.pagination;
  const pagination = raw ? { page: raw.page, pages: raw.pages, limit: raw.limit, total: raw.total } : null;

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { sessions, page, setPage, pagination, isLoading, error: error ?? null, reload };
}

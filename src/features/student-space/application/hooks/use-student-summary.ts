/*
* Funcionalidad: useStudentSummary
* Descripción: Reads the student home summary (`GET /api/me/summary`, the only request of /me) through useApiQuery and maps it to a StudentSummary; it revalidates when the window regains focus. Depends on React, @shared/api-client and the student space mapper and service. v1.1 (W8, Bloque 2): optional `enabled` flag (the /learn workspace starts the read together with the Inicio panel chunk; false disables the query).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toStudentSummary } from "../../api/mappers/student-summary.mapper";
import { ME_SUMMARY_PATH } from "../../api/services/student-space.service";
import type { StudentSummary } from "../entities/student-summary.entity";

export type UseStudentSummaryResult = {
  summary: StudentSummary | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const SUMMARY_QUERY_CONFIG = { revalidateOnFocus: true } as const;

export function useStudentSummary(enabled = true): UseStudentSummaryResult {
  const { data, error, isLoading, mutate } = useApiQuery(enabled ? ME_SUMMARY_PATH : null, undefined, SUMMARY_QUERY_CONFIG);
  const summary = useMemo(() => (data ? toStudentSummary(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { summary, isLoading, error: error ?? null, reload };
}

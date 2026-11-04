/*
* Funcionalidad: useStudentSessions
* Descripción: Reads one page of a student's simulation sessions for staff (`GET /api/simulation/sessions/history?userId&page&limit`, newest first; an ADMIN or a TEACHER managing or supervising the student's group) with the case title of each session and the envelope pagination, through useApiQuery. v1.1 (W4 Bloque 4): the total of sessions of the envelope pagination (the "Sesiones de simulador" card shares the page-1 request of the Simulador tab). Depends on React, @shared/api-client and the teacher dashboard mapper, service and entities.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toStudentSessions } from "../../api/mappers/teacher-dashboard.mapper";
import { SIMULATION_SESSIONS_PATH } from "../../api/services/teacher-dashboard.service";
import type { StudentSession } from "../entities/teacher-dashboard.entity";

export const STUDENT_SESSIONS_PAGE_SIZE = 10;

export type UseStudentSessionsResult = {
  sessions: StudentSession[] | null
  pages: number
  /** null until the first answer. */
  total: number | null
  isLoading: boolean
  error: ApiError | null
};

/** `page` is 1-based, like the API. */
export function useStudentSessions(userId: string, page: number): UseStudentSessionsResult {
  const { data, error, isLoading } = useApiQuery(SIMULATION_SESSIONS_PATH, {
    query: { userId, page, limit: STUDENT_SESSIONS_PAGE_SIZE, sortOrder: "desc" },
  });
  const sessions = useMemo(() => (data ? toStudentSessions(data.data) : null), [data]);

  return {
    sessions,
    pages: data?.pagination?.pages ?? 1,
    total: data ? (data.pagination?.total ?? sessions?.length ?? 0) : null,
    isLoading,
    error: error ?? null,
  };
}

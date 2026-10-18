/*
* Funcionalidad: useStudentPendingAttempts
* Descripción: Attempts of one student waiting for review, to link them to the grading page: reads one page of the grading queue filtered by the student on the server (`GET /api/evaluation-grading/queue?studentId&page&limit`, oldest first, scoped by the backend to the caller's groups) with the envelope pagination (total and pages). v1.1 (O3 review): possiblyIncomplete warned when the scanned page did not hold every attempt. v1.2 (closure B2): the queue is filtered by `studentId` and paged with the API pagination, so the 50-row group scan, the client selection of the student's rows and the incomplete-list warning are gone; the group is no longer needed. Depends on React, @shared/api-client and the teacher dashboard mapper, service and entities.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toPendingAttempts } from "../../api/mappers/teacher-dashboard.mapper";
import { GRADING_QUEUE_PATH } from "../../api/services/teacher-dashboard.service";
import type { PendingAttempt } from "../entities/teacher-dashboard.entity";

export const PENDING_ATTEMPTS_PAGE_SIZE = 10;

export type UseStudentPendingAttemptsResult = {
  attempts: PendingAttempt[] | null
  total: number
  pages: number
  isLoading: boolean
  error: ApiError | null
};

/** `page` is 1-based, like the API. */
export function useStudentPendingAttempts(userId: string, page: number): UseStudentPendingAttemptsResult {
  const { data, error, isLoading } = useApiQuery(
    GRADING_QUEUE_PATH,
    { query: { studentId: userId, page, limit: PENDING_ATTEMPTS_PAGE_SIZE } },
  );
  const attempts = useMemo(() => (data ? toPendingAttempts(data.data) : null), [data]);

  return {
    attempts,
    total: data?.pagination?.total ?? attempts?.length ?? 0,
    pages: data?.pagination?.pages ?? 1,
    isLoading,
    error: error ?? null,
  };
}

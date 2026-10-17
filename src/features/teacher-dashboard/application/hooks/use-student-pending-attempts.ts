/*
* Funcionalidad: useStudentPendingAttempts
* Descripción: Attempts of one student waiting for review, to link them to the grading page: reads the first page of the group grading queue (`GET /api/evaluation-grading/queue?groupId&limit=50`, oldest first) and selects the rows of the student. The queue has no student filter (BACKEND GAP), so attempts beyond the first 50 of the group are not listed. A null group sends no request. Depends on React, @shared/api-client and the teacher dashboard mapper, service and entities.
* Versión: 1.0
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
import { selectStudentAttempts } from "../entities/teacher-dashboard.entity";
import type { PendingAttempt } from "../entities/teacher-dashboard.entity";

export const PENDING_QUEUE_LIMIT = 50;

export type UseStudentPendingAttemptsResult = {
  attempts: PendingAttempt[] | null
  isLoading: boolean
  error: ApiError | null
};

export function useStudentPendingAttempts(groupId: string | null, userId: string): UseStudentPendingAttemptsResult {
  const { data, error, isLoading } = useApiQuery(
    groupId ? GRADING_QUEUE_PATH : null,
    { query: { groupId: groupId ?? "", limit: PENDING_QUEUE_LIMIT } },
  );
  const attempts = useMemo(() => (data ? selectStudentAttempts(toPendingAttempts(data.data), userId) : null), [data, userId]);

  return { attempts, isLoading, error: error ?? null };
}

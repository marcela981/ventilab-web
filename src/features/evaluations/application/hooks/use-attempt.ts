/*
* Funcionalidad: useAttempt
* Descripción: Reads one attempt of the signed-in student (`GET /api/evaluation-attempts/{attemptId}`) through useApiQuery and maps it to an AttemptDetail. Focus revalidation is off: the attempt player keeps the answers on screen and the timer only needs serverNow once; a null attemptId disables the query. Correctness, explanation and rubric are optional on the entity (sent only once published). Depends on @shared/api-client and the evaluations mappers/service. v1.1 (E2 review): every successful response records the client clock of its arrival with its serverNow (attempt response clock) so the timer offset never uses a stale cached serverNow with the current time.
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
import { toAttemptDetail } from "../../api/mappers/evaluations.mapper";
import { ATTEMPT_PATH } from "../../api/services/evaluations.service";
import { recordAttemptResponse } from "../entities/attempt-response-clock";
import type { AttemptDetail } from "../entities/evaluation.entity";

export type UseAttemptResult = {
  attempt: AttemptDetail | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const ATTEMPT_QUERY_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  // Runs when a response arrives (never for a cache read): the moment the timer offset is measured.
  onSuccess: (response: { data: { id: string, serverNow: string } }) => {
    recordAttemptResponse(response.data.id, response.data.serverNow, Date.now());
  },
} as const;

export function useAttempt(attemptId: string | null): UseAttemptResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    attemptId ? ATTEMPT_PATH : null,
    { params: { attemptId: attemptId ?? "" } },
    ATTEMPT_QUERY_CONFIG,
  );
  const attempt = useMemo(() => (data ? toAttemptDetail(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { attempt, isLoading, error: error ?? null, reload };
}

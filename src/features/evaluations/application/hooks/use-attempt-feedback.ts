/*
* Funcionalidad: useAttemptFeedback
* Descripción: Reads the AI feedback of a published attempt (`GET /api/evaluation-attempts/{attemptId}/feedback`) through useApiQuery and maps it to an AttemptFeedback. The query only runs when `enabled` (the attempt is published: the endpoint answers 404 before). While any item is PENDING it refreshes with spaced backup polling (nextFeedbackPollDelay: 10 s, 20 s, 40 s, then every 60 s) and stops once nothing is pending; the socket events handled by the result page are the primary signal. A failed poll only leaves the previous data on screen. Depends on @shared/api-client, the evaluations mappers/service and the attempt feedback entities. v1.1 (E3 review): the same spaced polling also retries a failed first read with no data yet (for example a 404 race right after grade:published, or a transient network error), so the page recovers without waiting for a socket event. v1.2 (A3 review follow-up): that retry runs only for a 404 or a retryable error (network, timeout, 429, 5xx) and at most FEEDBACK_ERROR_MAX_POLLS times; a permanent error such as 403 is not polled.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toAttemptFeedback } from "../../api/mappers/evaluations.mapper";
import { ATTEMPT_FEEDBACK_PATH } from "../../api/services/evaluations.service";
import type { AttemptFeedback } from "../entities/attempt-feedback";
import { hasPendingFeedback, nextFeedbackPollDelay } from "../entities/attempt-feedback";
import { isRetryableEvaluationError } from "../entities/evaluations-error-messages";

export type UseAttemptFeedbackResult = {
  feedback: AttemptFeedback | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export const FEEDBACK_ERROR_MAX_POLLS = 10;

const FEEDBACK_QUERY_CONFIG = { revalidateOnFocus: false, shouldRetryOnError: false } as const;

export function useAttemptFeedback(attemptId: string | null, enabled: boolean): UseAttemptFeedbackResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    enabled && attemptId ? ATTEMPT_FEEDBACK_PATH : null,
    { params: { attemptId: attemptId ?? "" } },
    FEEDBACK_QUERY_CONFIG,
  );
  const feedback = useMemo(() => (data ? toAttemptFeedback(data.data) : null), [data]);
  const pending = hasPendingFeedback(feedback);
  // A failed first read (no data yet) is retried on the same spaced schedule when the failure can heal:
  // a 404 race right after publication or a transient error. Permanent errors (403…) are not polled.
  const failedWithoutData = enabled && !data && Boolean(error) && (error?.status === 404 || isRetryableEvaluationError(error));
  let pollMode: "pending" | "error" | null = null;

  if (pending) {
    pollMode = "pending";
  } else if (failedWithoutData) {
    pollMode = "error";
  }

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  useEffect(() => {
    if (pollMode === null) {
      return undefined;
    }

    const maxPolls = pollMode === "error" ? FEEDBACK_ERROR_MAX_POLLS : Number.POSITIVE_INFINITY;
    let cancelled = false;
    let step = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (step >= maxPolls) {
        return;
      }

      timer = setTimeout(() => {
        void mutate().catch(() => undefined).finally(() => {
          step += 1;

          if (!cancelled) {
            schedule();
          }
        });
      }, nextFeedbackPollDelay(step));
    };

    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pollMode, mutate]);

  return { feedback, isLoading, error: error ?? null, reload };
}

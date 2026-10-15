/*
* Funcionalidad: useGradingFeedback
* Descripción: Staff view of the AI feedback of an attempt (`GET /api/evaluation-grading/attempts/{attemptId}/feedback`: overall and per-question items with status PENDING, READY or FAILED, source, provider, model and update time). While any item is PENDING it polls with spaced delays (3 s, 6 s, 12 s, 24 s, then every 30 s) up to FEEDBACK_MAX_POLLS reads and then reports pollingStopped; the page also revalidates it on the FEEDBACK_READY socket notification. Depends on React, @shared/api-client and the grading mappers, service and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toGradingFeedback } from "../../api/mappers/grading-attempt.mapper";
import { GRADING_FEEDBACK_PATH } from "../../api/services/grading.service";
import type { GradingFeedback } from "../entities/grading-attempt.entity";
import { FEEDBACK_MAX_POLLS, hasPendingFeedback, nextFeedbackPollDelay } from "../entities/grading-attempt.entity";

export type UseGradingFeedbackResult = {
  feedback: GradingFeedback | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
  pollingStopped: boolean
};

const FEEDBACK_QUERY_CONFIG = { revalidateOnFocus: false, shouldRetryOnError: false } as const;

export function useGradingFeedback(attemptId: string | null): UseGradingFeedbackResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    attemptId === null ? null : GRADING_FEEDBACK_PATH,
    { params: { attemptId: attemptId ?? "" } },
    FEEDBACK_QUERY_CONFIG,
  );
  const feedback = useMemo(() => (data ? toGradingFeedback(data.data) : null), [data]);
  const pending = hasPendingFeedback(feedback);
  const [pollingStopped, setPollingStopped] = useState(false);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  useEffect(() => {
    if (!pending) {
      return undefined;
    }

    let cancelled = false;
    let step = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (step >= FEEDBACK_MAX_POLLS) {
        setPollingStopped(true);

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
      setPollingStopped(false);
    };
  }, [pending, mutate]);

  return { feedback, isLoading, error: error ?? null, reload, pollingStopped: pending && pollingStopped };
}

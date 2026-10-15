/*
* Funcionalidad: useAttemptAutosave
* Descripción: React binding of the AutosaveQueue for one attempt: every answer change is queued per question (800 ms debounce for text, about 150 ms for choices) and sent with `PUT /api/evaluation-attempts/{attemptId}/answers/{questionId}`; network, timeout, 429 and 5xx failures are retried with backoff and again as soon as the browser fires `online`; other failures (409 closed attempt, 422 invalid answer) are handed to onError. The unsaved values are mirrored to sessionStorage, restored on mount (returned as `restored` so the player shows them) and resent. Exposes the save status per question, hasUnsaved (drives the beforeunload warning) and flush (before submitting). Depends on the autosave queue, the attempt storage and progress entities, the evaluations mapper/service and the api-client errors. v1.1 (E2 review): the mount effect restarts the queue (start) before resending, so the stop of an unmount (or a StrictMode remount) never leaves it blocked.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useState } from "react";
import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import { toSaveAnswerBody } from "../../api/mappers/evaluations.mapper";
import { saveAttemptAnswer } from "../../api/services/evaluations.service";
import type { PendingAnswer } from "../entities/attempt-progress";
import { autosaveDelay } from "../entities/attempt-progress";
import { readPendingAnswers, writePendingAnswers } from "../entities/attempt-session-storage";
import type { AutosaveStatus } from "../entities/autosave-queue";
import { AutosaveQueue } from "../entities/autosave-queue";
import type { AttemptAnswer, QuestionType } from "../entities/evaluation.entity";

export function isRetryableSaveError(error: unknown): boolean {
  const apiError = toApiError(error);

  return apiError.code === CLIENT_ERROR_CODES.networkUnavailable
    || apiError.code === CLIENT_ERROR_CODES.networkTimeout
    || apiError.status === 0
    || apiError.status === 429
    || apiError.status >= 500;
}

export type UseAttemptAutosaveOptions = {
  attemptId: string
  onError: (questionId: string, error: unknown) => void
};

export type UseAttemptAutosaveResult = {
  statuses: Readonly<Record<string, AutosaveStatus>>
  restored: Readonly<Record<string, PendingAnswer>>
  hasUnsaved: boolean
  save: (questionId: string, type: QuestionType, answer: AttemptAnswer) => void
  flush: () => Promise<boolean>
};

const UNSAVED: ReadonlySet<AutosaveStatus> = new Set<AutosaveStatus>(["pending", "saving", "retrying"]);

export function useAttemptAutosave({ attemptId, onError }: UseAttemptAutosaveOptions): UseAttemptAutosaveResult {
  const [statuses, setStatuses] = useState<Record<string, AutosaveStatus>>({});
  const [restored] = useState(() => readPendingAnswers(attemptId));
  const [queue] = useState(() => new AutosaveQueue<PendingAnswer>({
    send: (questionId, pending) => saveAttemptAnswer(attemptId, questionId, toSaveAnswerBody(pending.type, pending.answer)),
    isRetryable: isRetryableSaveError,
    onStatus: (questionId, status) => {
      setStatuses((current) => ({ ...current, [questionId]: status }));
    },
    persist: (pending) => {
      writePendingAnswers(attemptId, pending);
    },
  }));

  useEffect(() => {
    queue.setErrorListener(onError);

    return () => {
      queue.setErrorListener(null);
    };
  }, [queue, onError]);

  useEffect(() => {
    queue.start();

    // Values typed before a reload were never confirmed: send them again.
    for (const [questionId, pending] of Object.entries(restored)) {
      if (queue.getPendingValue(questionId) === null) {
        queue.enqueue(questionId, pending, 0);
      }
    }

    queue.retryNow();

    const handleOnline = () => {
      queue.retryNow();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
      queue.stop();
    };
  }, [queue, restored]);

  const save = useCallback((questionId: string, type: QuestionType, answer: AttemptAnswer) => {
    queue.enqueue(questionId, { type, answer }, autosaveDelay(type));
  }, [queue]);

  const flush = useCallback(() => queue.flush(), [queue]);
  const hasUnsaved = Object.values(statuses).some((status) => UNSAVED.has(status));

  return { statuses, restored, hasUnsaved, save, flush };
}

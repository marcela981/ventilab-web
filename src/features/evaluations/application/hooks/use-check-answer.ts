/*
* Funcionalidad: useCheckAnswer
* Descripción: Immediate feedback of the attempt player for QUIZ and WORKSHOP choice questions (DISENO_BLOQUE3 §2.2). check(questionId, selectedOptionIds) sends `POST /api/my-evaluations/attempts/{attemptId}/answers/{questionId}/check`, which saves the answer, reveals its correction and locks it; the reveal is kept per question and seeded from the attempt detail (revealed answers survive a reload). One check per question at a time (single-flight); a revealed question is never checked again. Outcomes: "revealed"; "locked" (409 evaluation.answer_locked: already revealed elsewhere, the caller keeps the question read-only); "unavailable" (422 evaluation.answer_check_unavailable: the caller falls back to the autosave); "error" (the answer stays editable so the student can retry). The score is computed only by the server. Depends on React and the evaluations service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { toApiError } from "@shared/api-client/api-error";
import { checkAttemptAnswer } from "../../api/services/evaluations.service";
import type { AnswerReveal, AttemptQuestion } from "../entities/evaluation.entity";

export type CheckOutcome =
  | { status: "revealed", reveal: AnswerReveal }
  | { status: "locked" }
  | { status: "unavailable" }
  | { status: "busy" }
  | { status: "error", error: unknown };

export type UseCheckAnswerResult = {
  reveals: Readonly<Record<string, AnswerReveal>>
  // Questions locked without a reveal in hand (409 answer_locked).
  locked: ReadonlySet<string>
  checking: ReadonlySet<string>
  check: (questionId: string, selectedOptionIds: readonly string[]) => Promise<CheckOutcome>
};

function toggled(current: ReadonlySet<string>, questionId: string, on: boolean): ReadonlySet<string> {
  const next = new Set(current);

  if (on) {
    next.add(questionId);
  } else {
    next.delete(questionId);
  }

  return next;
}

function initialReveals(questions: readonly AttemptQuestion[]): Record<string, AnswerReveal> {
  const reveals: Record<string, AnswerReveal> = {};

  for (const question of questions) {
    if (question.reveal) {
      reveals[question.id] = question.reveal;
    }
  }

  return reveals;
}

export function useCheckAnswer(attemptId: string, questions: readonly AttemptQuestion[]): UseCheckAnswerResult {
  const [reveals, setReveals] = useState<Record<string, AnswerReveal>>(() => initialReveals(questions));
  const [locked, setLocked] = useState<ReadonlySet<string>>(() => new Set());
  const [checking, setChecking] = useState<ReadonlySet<string>>(() => new Set());
  const inFlight = useRef(new Set<string>());
  const revealedRef = useRef(new Set(Object.keys(reveals)));

  const check = useCallback(async(questionId: string, selectedOptionIds: readonly string[]): Promise<CheckOutcome> => {
    if (inFlight.current.has(questionId) || revealedRef.current.has(questionId)) {
      return { status: "busy" };
    }

    inFlight.current.add(questionId);
    setChecking((current) => toggled(current, questionId, true));

    try {
      const reveal = await checkAttemptAnswer(attemptId, questionId, selectedOptionIds);

      revealedRef.current.add(questionId);
      setReveals((current) => ({ ...current, [questionId]: reveal }));

      return { status: "revealed", reveal };
    } catch (caught) {
      const { code } = toApiError(caught);

      if (code === "evaluation.answer_locked") {
        revealedRef.current.add(questionId);
        setLocked((current) => toggled(current, questionId, true));

        return { status: "locked" };
      }

      if (code === "evaluation.answer_check_unavailable") {
        return { status: "unavailable" };
      }

      return { status: "error", error: caught };
    } finally {
      inFlight.current.delete(questionId);
      setChecking((current) => toggled(current, questionId, false));
    }
  }, [attemptId]);

  return { reveals, locked, checking, check };
}

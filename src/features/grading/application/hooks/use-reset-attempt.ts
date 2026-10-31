/*
* Funcionalidad: useResetAttempt
* Descripción: "Reiniciar intento" of the unified grading screen (DISENO_BLOQUE3 §2.9): reset(studentId, evaluationId, reason) posts `POST /api/evaluation-grading/students/{userId}/evaluations/{evaluationId}/reset` with the mandatory reason (trimmed, 1–500 characters; audited, nothing is deleted: the student gets one more attempt and an ATTEMPT_RESET notification), single-flight through useGradingMutation, which refreshes the grading lists. Failures come back typed: 409 evaluation.attempt_in_progress, 409 evaluation.assignment_not_active with the assignment window of its data (assignmentId, startsAt, endsAt) so the dialog can point to the builder to extend it, or any other error with its Spanish message. Depends on React, @shared/api-client, the grading service, the evaluation attempts entities and useGradingMutation.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback } from "react";
import { toApiError } from "@shared/api-client/api-error";
import { resetStudentAttempt } from "../../api/services/grading.service";
import { RESET_REASON_MAX } from "../entities/evaluation-attempts.entity";
import { useGradingMutation } from "./use-grading-mutation";

export type AssignmentWindow = {
  assignmentId: string
  startsAt: string | null
  endsAt: string | null
};

export type ResetOutcome =
  | { status: "success" }
  | { status: "invalid" }
  | { status: "busy" }
  | { status: "in-progress", message: string }
  | { status: "not-active", message: string, window: AssignmentWindow | null }
  | { status: "error", message: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export function readAssignmentWindow(details: unknown): AssignmentWindow | null {
  if (!isRecord(details) || typeof details.assignmentId !== "string") {
    return null;
  }

  return {
    assignmentId: details.assignmentId,
    startsAt: typeof details.startsAt === "string" ? details.startsAt : null,
    endsAt: typeof details.endsAt === "string" ? details.endsAt : null,
  };
}

export function isValidResetReason(reason: string): boolean {
  const trimmed = reason.trim();

  return trimmed.length > 0 && trimmed.length <= RESET_REASON_MAX;
}

export type UseResetAttemptResult = {
  pending: boolean
  reset: (studentId: string, evaluationId: string, reason: string) => Promise<ResetOutcome>
};

export function useResetAttempt(): UseResetAttemptResult {
  const { pending, run } = useGradingMutation();

  const reset = useCallback(async(studentId: string, evaluationId: string, reason: string): Promise<ResetOutcome> => {
    if (!isValidResetReason(reason)) {
      return { status: "invalid" };
    }

    let failure: unknown = null;
    const outcome = await run(async() => {
      try {
        await resetStudentAttempt(studentId, evaluationId, { reason: reason.trim() });
      } catch (caught) {
        failure = caught;
        throw caught;
      }
    });

    if (outcome.status === "success") {
      return { status: "success" };
    }

    if (outcome.status === "busy") {
      return { status: "busy" };
    }

    if (outcome.code === "evaluation.attempt_in_progress") {
      return { status: "in-progress", message: outcome.message };
    }

    if (outcome.code === "evaluation.assignment_not_active") {
      return { status: "not-active", message: outcome.message, window: readAssignmentWindow(toApiError(failure).details) };
    }

    return { status: "error", message: outcome.message };
  }, [run]);

  return { pending, reset };
}

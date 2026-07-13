/*
 * Funcionalidad: API client de Quizzes
 * Descripción: Wrapper Axios para los endpoints /evaluation/quizzes del backend VentyLab.
 *              Tipado con ApiResponse<T> para prevenir mismatches de forma de respuesta.
 *              Política de intento único: submitAttempt distingue el 409
 *              (already_completed) del backend, y las consultas de intento
 *              propagan errores para que la UI falle cerrada (nunca habilitar
 *              un reintento por no poder verificar el estado).
 * Versión: 2.2
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { httpSlow } from '@/shared/services/api/http';
import type { ApiResponse } from '@/types/api';
import type { Quiz } from '../shared/services/evaluationService';

export interface QuizAttemptSummary {
  id: string;
  quizId: string;
  score: number;
  passed: boolean;
  completedAt: string | null;
}

interface AttemptsResponse {
  attempts: QuizAttemptSummary[];
}

interface SingleAttemptResponse {
  attempt: QuizAttemptSummary | null;
}

export interface SubmitAttemptOutcome {
  alreadyCompleted: boolean;
  attempt: QuizAttemptSummary | null;
  // `| undefined` explícito: el repo compila con exactOptionalPropertyTypes
  // y el catch asigna response?.data?.message, que puede ser undefined.
  message?: string | undefined;
}

export const quizApi = {
  list: async (): Promise<Quiz[]> => {
    const { data } = await httpSlow.get<ApiResponse<Quiz[]>>('/evaluation/quizzes');
    // Backend: GET /api/evaluation/quizzes → { success: true, data: Quiz[] }
    return data.data ?? [];
  },

  // Los errores se propagan a propósito: un fallo aquí NO significa "sin
  // intento" — el caller debe fallar cerrado y no habilitar el quiz.
  getMyAttempts: async (): Promise<QuizAttemptSummary[]> => {
    const { data } = await httpSlow.get<AttemptsResponse>('/evaluation/quizzes/my-attempts');
    return data.attempts ?? [];
  },

  getMyAttempt: async (quizId: string): Promise<QuizAttemptSummary | null> => {
    const { data } = await httpSlow.get<SingleAttemptResponse>(
      `/evaluation/quizzes/${encodeURIComponent(quizId)}/my-attempt`,
    );
    return data.attempt ?? null;
  },

  // Backend: 201 { success, attemptId, score, passed, ... } |
  //          409 { success: false, status: 'already_completed', attempt }.
  // El 409 se devuelve como outcome (no como excepción) para que la UI
  // refleje el intento previo; cualquier otro error sí se lanza.
  submitAttempt: async (
    quizId: string,
    answers: Array<{ questionId: string; selectedOptionId: string }>,
  ): Promise<SubmitAttemptOutcome> => {
    try {
      const { data } = await httpSlow.post<{ attemptId: string; score: number; passed: boolean }>(
        `/evaluation/quizzes/${encodeURIComponent(quizId)}/attempt`,
        { answers },
      );
      return {
        alreadyCompleted: false,
        attempt: {
          id: data.attemptId,
          quizId,
          score: data.score,
          passed: data.passed,
          completedAt: null,
        },
      };
    } catch (e: unknown) {
      const axiosErr = e as {
        response?: { status?: number; data?: { attempt?: QuizAttemptSummary | null; message?: string } };
      };
      if (axiosErr?.response?.status === 409) {
        return {
          alreadyCompleted: true,
          attempt: axiosErr.response?.data?.attempt ?? null,
          message: axiosErr.response?.data?.message,
        };
      }
      throw e;
    }
  },
};

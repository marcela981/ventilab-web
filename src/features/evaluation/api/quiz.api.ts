/*
 * Funcionalidad: API client de Quizzes
 * Descripción: Wrapper Axios para los endpoints /evaluation/quizzes del backend VentyLab.
 *              Tipado con ApiResponse<T> para prevenir mismatches de forma de respuesta.
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { http } from '@/shared/services/api/http';
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

export const quizApi = {
  list: async (): Promise<Quiz[]> => {
    const { data } = await http.get<ApiResponse<Quiz[]>>('/evaluation/quizzes');
    // Backend: GET /api/evaluation/quizzes → { success: true, data: Quiz[] }
    return data.data ?? [];
  },

  getMyAttempts: async (): Promise<QuizAttemptSummary[]> => {
    try {
      const { data } = await http.get<AttemptsResponse>('/evaluation/quizzes/my-attempts');
      return data.attempts ?? [];
    } catch {
      return [];
    }
  },

  getMyAttempt: async (quizId: string): Promise<QuizAttemptSummary | null> => {
    try {
      const { data } = await http.get<SingleAttemptResponse>(
        `/evaluation/quizzes/${encodeURIComponent(quizId)}/my-attempt`,
      );
      return data.attempt ?? null;
    } catch {
      return null;
    }
  },

  submitAttempt: async (
    quizId: string,
    answers: Array<{ questionId: string; selectedOptionId: string }>,
  ): Promise<QuizAttemptSummary & { score: number; passed: boolean }> => {
    const { data } = await http.post<QuizAttemptSummary & { score: number; passed: boolean }>(
      `/evaluation/quizzes/${encodeURIComponent(quizId)}/attempt`,
      { answers },
    );
    return data;
  },
};

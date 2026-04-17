/*
 * Funcionalidad: API client de Quizzes
 * Descripción: Wrapper Axios para el endpoint GET /evaluation/quizzes del backend VentyLab
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 */

import { http } from '@/shared/services/api/http';
import type { Quiz } from '../shared/services/evaluationService';

export interface QuizAttemptSummary {
  id: string;
  quizId: string;
  score: number;
  passed: boolean;
  completedAt: string | null;
}

export const quizApi = {
  list: async (): Promise<Quiz[]> => {
    const { data } = await http.get('/evaluation/quizzes');
    // Server returns { success, data: [...] }
    return data.data ?? data.quizzes ?? [];
  },

  getMyAttempts: async (): Promise<QuizAttemptSummary[]> => {
    try {
      const { data } = await http.get('/evaluation/quizzes/my-attempts');
      return data.attempts ?? [];
    } catch {
      return [];
    }
  },

  getMyAttempt: async (quizId: string): Promise<QuizAttemptSummary | null> => {
    try {
      const { data } = await http.get(`/evaluation/quizzes/${encodeURIComponent(quizId)}/my-attempt`);
      return data.attempt ?? null;
    } catch {
      return null;
    }
  },

  submitAttempt: async (
    quizId: string,
    answers: Array<{ questionId: string; selectedOptionId: string }>,
  ): Promise<QuizAttemptSummary & { score: number; passed: boolean }> => {
    const { data } = await http.post(`/evaluation/quizzes/${encodeURIComponent(quizId)}/attempt`, { answers });
    return data;
  },
};

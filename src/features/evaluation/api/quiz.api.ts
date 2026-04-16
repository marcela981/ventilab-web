/*
 * Funcionalidad: API client de Quizzes
 * Descripción: Wrapper Axios para el endpoint GET /evaluation/quizzes del backend VentyLab
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 */

import { http } from '@/shared/services/api/http';
import type { Quiz } from '../shared/services/evaluationService';

export const quizApi = {
  list: async (): Promise<Quiz[]> => {
    const { data } = await http.get('/evaluation/quizzes');
    return data.quizzes ?? [];
  },
};

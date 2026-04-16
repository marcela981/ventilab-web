/*
 * Funcionalidad: Hook de quizzes
 * Descripción: Carga y gestiona el estado de la lista de quizzes del estudiante
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 */

import { useCallback, useEffect, useState } from 'react';
import { quizApi } from '../api/quiz.api';
import type { Quiz } from '../shared/services/evaluationService';

export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await quizApi.list();
      setQuizzes(items);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando quizzes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { quizzes, isLoading, error, refresh };
}

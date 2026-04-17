/*
 * Funcionalidad: Hook de estado de entregas del estudiante
 * Descripción: Obtiene en paralelo las entregas de actividades y los intentos de quizzes
 *              del estudiante autenticado, y los unifica en un mapa indexado por ID.
 *              Usado en la página de índice de evaluaciones para mostrar el estado
 *              de completitud en cada EvaluationCard.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { useCallback, useEffect, useState } from 'react';
import { submissionApi } from '../api/submission.api';
import { quizApi } from '../api/quiz.api';
import type { SubmissionStatus } from '../evaluation.types';

// ─── Public types ────────────────────────────────────────────────────────────

export interface SubmissionSummary {
  submissionId: string;
  status: SubmissionStatus;
  score: number | null;
  maxScore: number | null;
  submittedAt: string | null;
}

export type SubmissionMap = Record<string, SubmissionSummary>;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMySubmissions() {
  const [submissionMap, setSubmissionMap] = useState<SubmissionMap>({});
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const [activitySubmissions, quizAttempts] = await Promise.all([
        submissionApi.my(),
        quizApi.getMyAttempts(),
      ]);

      const map: SubmissionMap = {};

      for (const s of activitySubmissions) {
        if (s.activityId) {
          map[s.activityId] = {
            submissionId: s.id,
            status: s.status,
            score: s.score,
            maxScore: s.maxScore,
            submittedAt: s.submittedAt,
          };
        }
      }

      for (const a of quizAttempts) {
        if (a.quizId) {
          map[a.quizId] = {
            submissionId: a.id,
            status: 'SUBMITTED',
            score: a.score,
            maxScore: 100,
            submittedAt: a.completedAt,
          };
        }
      }

      setSubmissionMap(map);
    } catch {
      // Silently fail — index stays functional without submission data
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { submissionMap, isLoading, refetch };
}

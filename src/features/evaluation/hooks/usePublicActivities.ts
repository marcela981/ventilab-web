/*
 * Funcionalidad : Hook de catálogo público de actividades de evaluación
 * Descripción   : Carga todas las actividades (exámenes y talleres) publicadas
 *                 desde el endpoint público `/api/evaluation/activities`. A
 *                 diferencia de `useActivities` (que para STUDENT filtra por
 *                 asignaciones de grupo en la tabla ActivityAssignment), este
 *                 hook devuelve TODO el catálogo `isActive && isPublished`,
 *                 que es lo que se quiere mostrar en la vista de estudiante
 *                 de `/evaluation` después de poblar la DB con el seed.
 * Versión       : 1.0
 * Autor         : Marcela Mazo Castro
 * Proyecto      : VentyLab
 * Tesis         : Desarrollo de una aplicación web para la enseñanza de
 *                 mecánica ventilatoria que integre un sistema de
 *                 retroalimentación usando modelos de lenguaje
 * Institución   : Universidad del Valle
 * Contacto      : marcela.mazo@correounivalle.edu.co
 */

import { useCallback, useEffect, useState } from 'react';
import type { Activity } from '../evaluation.types';
import evaluationService from '../services/evaluationService';

interface UsePublicActivitiesResult {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Carga en paralelo exámenes y talleres del endpoint público de evaluación
 * y los expone unificados como `Activity[]`, consistente con el shape que
 * espera `<ActivityList>` y la utilidad `groupEvaluations`.
 */
export function usePublicActivities(): UsePublicActivitiesResult {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [examRes, tallerRes] = await Promise.all([
        evaluationService.getActivities('EXAM'),
        evaluationService.getActivities('TALLER'),
      ]);

      const firstError =
        (!examRes.success && examRes.error) ||
        (!tallerRes.success && tallerRes.error) ||
        null;

      const exams: Activity[] = examRes.success
        ? (examRes.data?.activities as Activity[]) ?? []
        : [];
      const talleres: Activity[] = tallerRes.success
        ? (tallerRes.data?.activities as Activity[]) ?? []
        : [];

      setActivities([...exams, ...talleres]);
      if (firstError) setError(firstError);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando actividades');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activities, isLoading, error, refresh };
}

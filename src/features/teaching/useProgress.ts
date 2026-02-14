/**
 * @module useProgress
 * @description Hook para gestión del progreso de aprendizaje del usuario.
 * Consulta y actualiza el progreso en módulos y lecciones contra el backend.
 *
 * Responsabilidades:
 * - Obtener progreso actual del usuario (todos los módulos)
 * - Actualizar progreso al navegar/completar contenido
 * - Marcar módulos como iniciados
 * - Marcar lecciones como completadas (con quiz score si aplica)
 * - Auto-refetch después de mutaciones
 *
 * Endpoints consumidos:
 * - GET  /api/progress?userId=...&levelId=...&moduleId=...
 * - POST /api/progress/update
 * - POST /api/progress/start-module
 * - POST /api/progress/complete-lesson
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  UseProgressReturn,
  UserProgress,
} from '../../contracts/teaching.contracts';

/** Opciones del hook */
interface UseProgressOptions {
  /** ID del usuario (obtenido de auth context) */
  userId: string;
  /** Filtrar por nivel (opcional) */
  levelId?: string;
  /** Filtrar por módulo (opcional) */
  moduleId?: string;
  /** Auto-fetch al montar (default: true) */
  autoFetch?: boolean;
}

/**
 * Hook para consultar y actualizar progreso de aprendizaje.
 *
 * @example
 * ```tsx
 * const { progress, loading, actions } = useProgress({ userId: user.id });
 *
 * // Al entrar a un módulo:
 * await actions.startModule('module-01');
 *
 * // Al completar una lección:
 * await actions.completeLesson('module-01', 'lesson-01');
 * ```
 *
 * @param options - Configuración del hook
 * @returns {UseProgressReturn} Estado de progreso y acciones
 */
export function useProgress(options: UseProgressOptions): UseProgressReturn {
  // TODO: Estado para progress (UserProgress[])
  // TODO: Estado para loading (boolean)
  // TODO: Estado para error (Error | null)

  // ---------------------------------------------------------------------------
  // Fetch progress
  // ---------------------------------------------------------------------------

  // TODO: useEffect para fetch inicial si autoFetch !== false
  //   - Llamar GET /api/progress con userId, levelId, moduleId como query params
  //   - Setear progress con response.progress
  //   - Manejar errores

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const updateProgress = useCallback(async (moduleId: string, lessonId?: string) => {
    // TODO: POST /api/progress/update con { userId, moduleId, lessonId }
    // TODO: Actualizar estado local con la respuesta
    // TODO: Manejar errores
    throw new Error('Not implemented');
  }, []);

  const startModule = useCallback(async (moduleId: string) => {
    // TODO: POST /api/progress/start-module con { userId, moduleId }
    // TODO: Agregar nuevo UserProgress al estado local
    // TODO: Manejar errores
    throw new Error('Not implemented');
  }, []);

  const completeLesson = useCallback(async (moduleId: string, lessonId: string) => {
    // TODO: POST /api/progress/complete-lesson con { userId, moduleId, lessonId }
    // TODO: Actualizar UserProgress correspondiente en estado local
    // TODO: Verificar si moduleJustCompleted para mostrar celebración
    // TODO: Manejar errores
    throw new Error('Not implemented');
  }, []);

  const refetch = useCallback(async () => {
    // TODO: Repetir la consulta GET /api/progress con mismos filtros
    // TODO: Actualizar estado
    throw new Error('Not implemented');
  }, []);

  // TODO: Retornar UseProgressReturn
  throw new Error('Not implemented');
}

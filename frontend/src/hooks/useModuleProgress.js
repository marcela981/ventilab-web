'use client';

/**
 * useModuleProgress Hook
 * Hook para cargar y gestionar el progreso de un módulo específico
 * Con soporte para carga automática, actualización en caliente y manejo de errores
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLearningProgress } from '@/contexts/LearningProgressContext';
import { calculateModuleFilteredProgress } from '@/components/teaching/components/curriculum/lessonHelpers';
import { getVisibleLessonsByLevel } from '@/data/curriculum/selectors';

/**
 * useModuleProgress
 * 
 * @param {string} moduleId - ID del módulo
 * @param {Object} options - Opciones
 * @param {boolean} options.autoLoad - Cargar automáticamente al montar (default: true)
 * @param {boolean} options.reloadOnMount - Recargar aunque ya esté cargado (default: false)
 * @returns {Object} Estado y funciones del progreso del módulo
 */
export const useModuleProgress = (moduleId, options = {}) => {
  const { autoLoad = true, reloadOnMount = false } = options;
  
  const {
    progressByModule,
    loadModuleProgress,
    loadingModules,
    syncStatus,
    lastSyncError,
  } = useLearningProgress();
  
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Obtener datos del módulo del contexto
  const moduleData = useMemo(() => {
    if (!moduleId) return null;
    return progressByModule[moduleId] || null;
  }, [progressByModule, moduleId]);
  
  // Calcular progreso agregado usando lecciones filtradas
  const progress = useMemo(() => {
    if (!moduleData || !moduleId) {
      return {
        percent: 0,
        percentInt: 0,
        completedLessons: 0,
        totalLessons: 0,
        isCompleted: false,
        completedAt: null,
        timeSpent: 0,
        score: null,
        completedPages: 0,
        totalPages: 0,
      };
    }
    
    const { learningProgress } = moduleData;
    
    // Calcular progreso filtrado (excluye allowEmpty del denominador, calcula por páginas)
    // Pasamos solo el módulo actual ya que la función solo necesita ese módulo
    const filteredProgress = calculateModuleFilteredProgress(
      { [moduleId]: moduleData },
      moduleId
    );
    
    const isCompleted = learningProgress?.completedAt !== null || 
                       (filteredProgress.totalLessons > 0 && 
                        filteredProgress.completedLessons === filteredProgress.totalLessons);
    
    return {
      percent: filteredProgress.percentage / 100, // Convertir de 0-100 a 0-1
      percentInt: Math.round(filteredProgress.percentage),
      completedLessons: filteredProgress.completedLessons,
      totalLessons: filteredProgress.totalLessons,
      isCompleted,
      completedAt: learningProgress?.completedAt || null,
      timeSpent: learningProgress?.timeSpent || 0,
      score: learningProgress?.score || null,
      completedPages: filteredProgress.completedPages,
      totalPages: filteredProgress.totalPages,
    };
  }, [moduleData, moduleId]);
  
  // Función para cargar progreso
  const load = useCallback(async (force = false) => {
    if (!moduleId) return;
    
    // Si ya está cargado y no es forzado, no cargar
    if (!force && moduleData && !reloadOnMount) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await loadModuleProgress(moduleId, { force });
    } catch (err) {
      console.error('[useModuleProgress] Failed to load module progress:', err);
      setError(err.message || 'Error al cargar progreso del módulo');
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, moduleData, loadModuleProgress, reloadOnMount]);
  
  // Cargar automáticamente al montar
  useEffect(() => {
    if (autoLoad && moduleId) {
      load(reloadOnMount);
    }
  }, [moduleId, autoLoad, reloadOnMount, load]);
  
  // Detectar si está cargando desde el contexto
  const isLoadingFromContext = loadingModules.has(moduleId);
  
  return {
    // Estado
    progress,
    moduleData,
    isLoading: isLoading || isLoadingFromContext,
    error: error || lastSyncError,
    syncStatus,
    
    // Funciones
    load,
    reload: () => load(true),
  };
};

/**
 * Calcula el progreso de un nivel basado en lecciones visibles y progreso de secciones
 * 
 * Para cada lección L:
 * - totalPages = L.sections.length
 * - completedPages se obtiene desde LessonProgress (clave {moduleId, lessonId})
 * - El progreso de lección = completedPages / totalPages
 * 
 * El progreso del nivel = suma(progresoLección * totalPages) / suma(totalPages)
 * 
 * Reglas:
 * - Denominador: solo incluye lecciones con totalPages > 0
 * - No incluye allowEmpty en el denominador ni en el numerador
 * 
 * @param {string} levelId - ID del nivel (beginner, intermediate, advanced)
 * @param {Object} progressByModule - Objeto con progreso por módulo: { [moduleId]: { lessonsById: { [lessonId]: LessonProgress } } }
 * @returns {Object} Objeto con { visibleLessons, totalLessons, totalPages, completedPages, percentage }
 */
export const calculateLevelProgress = (levelId, progressByModule = {}) => {
  if (!levelId) {
    return {
      visibleLessons: [],
      totalLessons: 0,
      totalPages: 0,
      completedPages: 0,
      percentage: 0,
    };
  }

  // Obtener lecciones visibles para el nivel
  const visibleLessons = getVisibleLessonsByLevel(levelId);

  // Filtrar lecciones completables:
  // - Excluir allowEmpty (no se incluyen en denominador ni numerador)
  // - Solo incluir lecciones con sections.length > 0 (totalPages > 0)
  const completableLessons = visibleLessons.filter(lesson => {
    // No incluir allowEmpty
    if (lesson.allowEmpty) {
      return false;
    }
    // Solo incluir lecciones con totalPages > 0
    const totalPagesForLesson = lesson.sections?.length || 0;
    return totalPagesForLesson > 0;
  });

  let totalPages = 0;
  let completedPages = 0;
  let weightedProgressSum = 0;

  // Procesar cada lección completable
  completableLessons.forEach(lesson => {
    const { moduleId, lessonId, sections } = lesson;
    const totalPagesForLesson = sections?.length || 0;

    // Safety check: solo incluir lecciones con totalPages > 0
    if (totalPagesForLesson <= 0) {
      return;
    }

    totalPages += totalPagesForLesson;

    // Obtener progreso de la lección desde progressByModule (clave: {moduleId, lessonId})
    const moduleData = progressByModule[moduleId];
    const lessonProgress = moduleData?.lessonsById?.[lessonId];

    if (lessonProgress) {
      // El progreso viene como 0-1 desde LessonProgress
      // Si la lección está completada, progress = 1
      const lessonProgressValue = lessonProgress.completed 
        ? 1 
        : Math.max(0, Math.min(1, lessonProgress.progress || 0));
      
      // Calcular completedPages para esta lección
      const completedPagesForLesson = Math.round(lessonProgressValue * totalPagesForLesson);
      completedPages += completedPagesForLesson;

      // Para el promedio ponderado del nivel: suma(progresoLección * totalPages)
      // donde progresoLección = completedPages / totalPages
      // entonces: progresoLección * totalPages = completedPages
      // pero usamos lessonProgressValue directamente para mayor precisión
      weightedProgressSum += lessonProgressValue * totalPagesForLesson;
    }
    // Si no hay progreso registrado, la lección tiene 0 páginas completadas
    // No se suma nada a completedPages ni a weightedProgressSum
  });

  const totalLessons = completableLessons.length;

  // Calcular porcentaje del nivel: suma(progresoLección * totalPages) / suma(totalPages)
  // Esto es equivalente a: suma(completedPages) / suma(totalPages) cuando hay progreso
  let percentage = 0;
  if (totalPages > 0) {
    percentage = (weightedProgressSum / totalPages) * 100;
  }

  return {
    visibleLessons: completableLessons,
    totalLessons,
    totalPages,
    completedPages,
    percentage: Math.round(percentage * 100) / 100, // Redondear a 2 decimales
  };
};

export default useModuleProgress;


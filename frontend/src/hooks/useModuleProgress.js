'use client';

/**
 * useModuleProgress Hook
 * Hook para cargar y gestionar el progreso de un módulo específico
 * Con soporte para carga automática, actualización en caliente y manejo de errores
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLearningProgress } from '@/contexts/LearningProgressContext';

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
  
  // Calcular progreso agregado
  const progress = useMemo(() => {
    if (!moduleData) {
      return {
        percent: 0,
        percentInt: 0,
        completedLessons: 0,
        totalLessons: 0,
        isCompleted: false,
        completedAt: null,
        timeSpent: 0,
        score: null,
      };
    }
    
    const { learningProgress, lessonsById } = moduleData;
    const lessons = Object.values(lessonsById);
    const totalLessons = lessons.length;
    
    if (totalLessons === 0) {
      return {
        percent: 0,
        percentInt: 0,
        completedLessons: 0,
        totalLessons: 0,
        isCompleted: false,
        completedAt: learningProgress?.completedAt || null,
        timeSpent: learningProgress?.timeSpent || 0,
        score: learningProgress?.score || null,
      };
    }
    
    // Calcular progreso: promedio ponderado por número de lecciones
    let completedCount = 0;
    let progressSum = 0;
    
    lessons.forEach(lessonProgress => {
      if (lessonProgress.completed) {
        completedCount++;
        progressSum += 1;
      } else {
        // Usar progress (0-1) si existe, sino 0
        progressSum += lessonProgress.progress || 0;
      }
    });
    
    const percent = totalLessons > 0 ? progressSum / totalLessons : 0;
    const isCompleted = learningProgress?.completedAt !== null || completedCount === totalLessons;
    
    return {
      percent,
      percentInt: Math.round(percent * 100),
      completedLessons: completedCount,
      totalLessons,
      isCompleted,
      completedAt: learningProgress?.completedAt || null,
      timeSpent: learningProgress?.timeSpent || 0,
      score: learningProgress?.score || null,
    };
  }, [moduleData]);
  
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

export default useModuleProgress;


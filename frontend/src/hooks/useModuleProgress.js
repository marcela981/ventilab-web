'use client';

/**
 * useModuleProgress Hook
 * Hook para cargar y gestionar el progreso de un módulo específico
 * Con soporte para carga automática, actualización en caliente y manejo de errores
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLearningProgress } from '@/contexts/LearningProgressContext';
import { calculateModuleFilteredProgress } from '@/components/teaching/components/curriculum/lessonHelpers';

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

export default useModuleProgress;


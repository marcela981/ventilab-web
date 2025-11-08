import { useCallback, useMemo } from 'react';
import { curriculumData, getLevelProgress } from '../../../data/curriculumData';
import { getModulesCount, getAllModules } from '../../../data/curriculum/selectors.js';

/**
 * useModuleProgress - Hook personalizado para manejo de progreso de módulos
 * 
 * Proporciona funciones y cálculos relacionados con el progreso de los módulos
 * del curriculum, incluyendo cálculo de progreso individual y global.
 * 
 * @param {Set} completedLessons - Set de lecciones completadas
 * @param {number} timeSpent - Tiempo total gastado en minutos
 * @returns {Object} Objeto con funciones de progreso
 */
const useModuleProgress = (completedLessons, timeSpent = 0) => {
  
  /**
   * Calcula el progreso de un módulo específico basándose en lecciones completadas
   * @param {string} moduleId - ID del módulo
   * @returns {number} Porcentaje de progreso (0-100)
   */
  const calculateModuleProgress = useCallback((moduleId) => {
    const module = curriculumData.modules[moduleId];
    if (!module) return 0;
    
    // Contar lecciones completadas para este módulo
    const moduleLessons = module.lessons || [];
    const completedModuleLessons = moduleLessons.filter(lesson => 
      completedLessons.has(`${moduleId}-${lesson.id}`)
    );
    
    return moduleLessons.length > 0 ? (completedModuleLessons.length / moduleLessons.length) * 100 : 0;
  }, [completedLessons]);

  /**
   * Calcula estadísticas globales de progreso
   * @returns {Object} Objeto con estadísticas globales
   */
  const calculateGlobalStats = useMemo(() => {
    // Use selectors for data-driven counts
    const modules = getAllModules();
    const totalModules = getModulesCount();
    const completedModules = modules.filter(module => 
      calculateModuleProgress(module.id) === 100
    ).length;
    const totalLessons = modules.reduce((acc, module) => 
      acc + (module.lessons?.length || 0), 0
    );
    const completedLessonsCount = completedLessons.size;
    
    return {
      totalCompletion: totalModules > 0 ? (completedModules / totalModules) * 100 : 0,
      totalTimeSpent: timeSpent, // en minutos
      totalLessons: totalLessons,
      completedLessons: completedLessonsCount,
      lessonsCompletion: totalLessons > 0 ? (completedLessonsCount / totalLessons) * 100 : 0
    };
  }, [calculateModuleProgress, completedLessons, timeSpent]);

  /**
   * Obtiene el progreso por nivel usando la función del curriculumData
   * @returns {Object} Objeto con progreso por nivel
   */
  const levelProgress = useMemo(() => {
    return getLevelProgress(Array.from(completedLessons));
  }, [completedLessons]);

  return {
    calculateModuleProgress,
    calculateGlobalStats,
    levelProgress
  };
};

export default useModuleProgress;

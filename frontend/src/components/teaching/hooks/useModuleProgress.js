import { useCallback, useMemo } from 'react';
import { curriculumData } from '../../../data/curriculumData';
import { getModulesCount, getAllModules, getVirtualLessonsArray } from '../../../data/curriculum/selectors.js';
import { getLevelProgress } from '../../../data/curriculum/index.js';
import { buildLessonsArray, calculateFilteredProgress } from '../components/curriculum/lessonHelpers';

/**
 * Flatten all lessons by level (including M03 virtual lessons)
 * @param {Array} modules - Array of modules
 * @param {Array} virtualLessons - Array of virtual lessons from M03
 * @returns {Object} Object with lessons grouped by level: { [levelId]: Array<{moduleId, lessonId, ...}> }
 */
function flattenLessonsByLevel(modules, virtualLessons) {
  const lessonsByLevel = {
    beginner: [],
    intermediate: [],
    advanced: [],
  };

  // Process regular modules
  modules.forEach(module => {
    if (!module.lessons || module.lessons.length === 0) {
      return;
    }

    const level = module.level || 'beginner';
    if (!lessonsByLevel[level]) {
      lessonsByLevel[level] = [];
    }

    module.lessons.forEach(lesson => {
      lessonsByLevel[level].push({
        moduleId: module.id,
        lessonId: lesson.id,
        title: lesson.title,
        level: level,
      });
    });
  });

  // Process virtual lessons from M03
  virtualLessons.forEach(virtualLesson => {
    const level = virtualLesson.moduleLevel || 'advanced';
    if (!lessonsByLevel[level]) {
      lessonsByLevel[level] = [];
    }

    lessonsByLevel[level].push({
      moduleId: virtualLesson.moduleId,
      lessonId: virtualLesson.lessonId,
      title: virtualLesson.title,
      level: level,
    });
  });

  return lessonsByLevel;
}

/**
 * useModuleProgress - Hook personalizado para manejo de progreso de módulos
 * 
 * Proporciona funciones y cálculos relacionados con el progreso de los módulos
 * del curriculum, incluyendo cálculo de progreso individual y global.
 * 
 * @param {Set} completedLessons - Set de lecciones completadas (formato: "moduleId-lessonId")
 * @param {number} timeSpent - Tiempo total gastado en minutos
 * @param {Object} progressByModule - Opcional: Objeto con progreso por módulo para cálculo por páginas
 * @returns {Object} Objeto con funciones de progreso
 */
const useModuleProgress = (completedLessons, timeSpent = 0, progressByModule = null) => {
  
  // Get virtual lessons from M03
  const virtualLessons = useMemo(() => {
    try {
      return getVirtualLessonsArray();
    } catch (error) {
      console.warn('[useModuleProgress] Error getting virtual lessons:', error);
      return [];
    }
  }, []);

  // Flatten all lessons by level
  const lessonsByLevel = useMemo(() => {
    const modules = getAllModules();
    return flattenLessonsByLevel(modules, virtualLessons);
  }, [virtualLessons]);

  /**
   * Calcula el progreso de un módulo específico basándose en lecciones completadas
   * @param {string} moduleId - ID del módulo
   * @returns {number} Porcentaje de progreso (0-100)
   */
  const calculateModuleProgress = useCallback((moduleId) => {
    const module = curriculumData.modules[moduleId];
    if (!module) {
      // Check if it's M03 (module-03-configuration)
      if (moduleId === 'module-03-configuration') {
        // Count completed virtual lessons
        const completedVirtualLessons = virtualLessons.filter(lesson => 
          completedLessons.has(`${moduleId}-${lesson.lessonId}`)
        );
        return virtualLessons.length > 0 
          ? (completedVirtualLessons.length / virtualLessons.length) * 100 
          : 0;
      }
      return 0;
    }
    
    // Contar lecciones completadas para este módulo
    const moduleLessons = module.lessons || [];
    const completedModuleLessons = moduleLessons.filter(lesson => 
      completedLessons.has(`${moduleId}-${lesson.id}`)
    );
    
    return moduleLessons.length > 0 ? (completedModuleLessons.length / moduleLessons.length) * 100 : 0;
  }, [completedLessons, virtualLessons]);

  /**
   * Agregador por nivel: compute completedLessons y totalLessons desde el flatten de lecciones filtrado
   * Usa cálculo filtrado que excluye allowEmpty del denominador y calcula por páginas si está disponible
   * @returns {Object} Objeto con progreso por nivel: { [levelId]: { completedLessons, totalLessons, percentage, completedPages, totalPages } }
   */
  const levelProgressAggregated = useMemo(() => {
    const progress = {};
    const levels = ['beginner', 'intermediate', 'advanced'];
    
    // Si tenemos progressByModule, usar cálculo filtrado completo (incluye progreso por páginas)
    if (progressByModule && typeof progressByModule === 'object') {
      levels.forEach(levelId => {
        const filteredProgress = calculateFilteredProgress(progressByModule, levelId);
        progress[levelId] = {
          completedLessons: filteredProgress.completedLessons,
          totalLessons: filteredProgress.totalLessons,
          percentage: filteredProgress.percentage,
          completedPages: filteredProgress.completedPages,
          totalPages: filteredProgress.totalPages,
        };
      });
      return progress;
    }
    
    // Fallback: usar cálculo basado en completedLessons Set (solo sabe completada/no completada)
    const completedLessonsSet = completedLessons instanceof Set 
      ? completedLessons 
      : new Set(completedLessons);
    
    levels.forEach(levelId => {
      // Obtener lecciones filtradas para este nivel usando buildLessonsArray
      // Esto ya filtra correctamente: solo incluye lecciones con sections.length > 0 o allowEmpty === true
      const levelLessons = buildLessonsArray(levelId);
      
      // Lecciones completables (excluye allowEmpty del denominador)
      const completableLessons = levelLessons.filter(lesson => !lesson.allowEmpty);
      
      let completedLessonsCount = 0;
      let totalPages = 0;
      let completedPages = 0;
      let weightedProgressSum = 0;
      
      // Calcular progreso por páginas
      // Nota: Con solo completedLessons Set, solo podemos saber si está completada (progress = 1) o no (progress = 0)
      completableLessons.forEach(lesson => {
        const { moduleId, lessonId, pages } = lesson;
        const lessonKey = `${moduleId}-${lessonId}`;
        const isCompleted = completedLessonsSet.has(lessonKey);
        
        totalPages += pages;
        
        if (isCompleted) {
          completedLessonsCount++;
          completedPages += pages;
          weightedProgressSum += pages; // progress = 1 (completada)
        }
        // Si no está completada, progress = 0 (no suma nada al weightedProgressSum)
      });
      
      const totalLessons = completableLessons.length;
      
      // Calcular porcentaje: promedio ponderado por páginas si hay páginas
      let percentage = 0;
      if (totalPages > 0) {
        percentage = (weightedProgressSum / totalPages) * 100;
      } else if (totalLessons > 0) {
        percentage = (completedLessonsCount / totalLessons) * 100;
      }
      
      progress[levelId] = {
        completedLessons: completedLessonsCount,
        totalLessons: totalLessons,
        percentage: percentage,
        completedPages: completedPages,
        totalPages: totalPages,
      };
    });

    return progress;
  }, [completedLessons, progressByModule]);

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
    
    // Count total lessons including virtual lessons from M03
    const moduleLessonsCount = modules.reduce((acc, module) => 
      acc + (module.lessons?.length || 0), 0
    );
    const virtualLessonsCount = virtualLessons.length;
    const totalLessons = moduleLessonsCount + virtualLessonsCount;
    
    const completedLessonsCount = completedLessons.size;
    
    return {
      totalCompletion: totalModules > 0 ? (completedModules / totalModules) * 100 : 0,
      totalTimeSpent: timeSpent, // en minutos
      totalLessons: totalLessons,
      completedLessons: completedLessonsCount,
      lessonsCompletion: totalLessons > 0 ? (completedLessonsCount / totalLessons) * 100 : 0
    };
  }, [calculateModuleProgress, completedLessons, timeSpent, virtualLessons]);

  /**
   * Obtiene el progreso por nivel usando la función del curriculumData (legacy)
   * @returns {Object} Objeto con progreso por nivel (módulos completados)
   */
  const levelProgress = useMemo(() => {
    return getLevelProgress(Array.from(completedLessons));
  }, [completedLessons]);

  return {
    calculateModuleProgress,
    calculateGlobalStats,
    levelProgress, // Legacy: módulos completados por nivel
    levelProgressAggregated, // Nuevo: lecciones completadas por nivel (incluyendo M03)
    lessonsByLevel, // Todas las lecciones agrupadas por nivel
  };
};

export default useModuleProgress;

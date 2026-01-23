import { useCallback, useMemo } from 'react';
import { curriculumData } from '../../../data/curriculumData';
import { getModulesCount, getAllModules, getVisibleLessonsByLevel } from '../../../data/curriculum/selectors.js';
import { getLevelProgress, getModulesByLevel } from '../../../data/curriculum/index.js';
import { buildLessonsArray, calculateFilteredProgress } from '../components/curriculum/lessonHelpers';
import { computeModuleProgress } from '../../../utils/computeModuleProgress';

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
  
  // Get virtual lessons from M03 (for backward compatibility with calculateModuleProgress)
  const virtualLessons = useMemo(() => {
    try {
      // Get virtual lessons from advanced level (M03)
      const advancedLessons = getVisibleLessonsByLevel('advanced');
      return advancedLessons.filter(lesson => lesson.moduleId === 'module-03-configuration');
    } catch (error) {
      console.warn('[useModuleProgress] Error getting virtual lessons:', error);
      return [];
    }
  }, []);

  // Flatten all lessons by level using getVisibleLessonsByLevel
  const lessonsByLevel = useMemo(() => {
    const allLevels = ['beginner', 'intermediate', 'advanced'];
    const lessonsByLevelObj = {
      beginner: [],
      intermediate: [],
      advanced: [],
    };
    
    allLevels.forEach(levelId => {
      const visibleLessons = getVisibleLessonsByLevel(levelId);
      lessonsByLevelObj[levelId] = visibleLessons.map(lesson => ({
        moduleId: lesson.moduleId,
        lessonId: lesson.lessonId,
        title: lesson.title,
        level: lesson.moduleLevel,
      }));
    });
    
    return lessonsByLevelObj;
  }, []);

  /**
   * Calcula el progreso de un módulo específico basándose en lecciones completadas
   * Uses computeModuleProgress as the single source of truth
   * @param {string} moduleId - ID del módulo
   * @returns {number} Porcentaje de progreso (0-100), rounded down
   */
  const calculateModuleProgress = useCallback((moduleId) => {
    // Use getVisibleLessonsByLevel to get lessons for this module
    // First, find which level this module belongs to
    const modules = getAllModules();
    const module = modules.find(m => m.id === moduleId);
    const moduleLevel = module?.level;

    if (!moduleLevel) {
      return 0;
    }

    // Get visible lessons for this level
    const visibleLessons = getVisibleLessonsByLevel(moduleLevel);
    // Filter lessons for this specific module
    const moduleLessons = visibleLessons.filter(lesson => lesson.moduleId === moduleId);
    // Only count completable lessons (exclude allowEmpty)
    const completableLessons = moduleLessons.filter(lesson => !lesson.allowEmpty);

    if (completableLessons.length === 0) {
      return 0;
    }

    // Count completed lessons using completedLessons Set
    const completedLessonsSet = completedLessons instanceof Set
      ? completedLessons
      : new Set(completedLessons);

    // Build lessons array for computeModuleProgress
    // Each lesson gets progress = 100 if completed, 0 otherwise
    const lessonsWithProgress = completableLessons.map(lesson => ({
      id: lesson.lessonId,
      progress: completedLessonsSet.has(`${moduleId}-${lesson.lessonId}`) ? 100 : 0,
    }));

    // Use computeModuleProgress as single source of truth
    const { progressPercentage } = computeModuleProgress(lessonsWithProgress);

    return progressPercentage;
  }, [completedLessons]);

  /**
   * Agregador por nivel: compute completedLessons y totalLessons desde el flatten de lecciones filtrado
   * Usa cálculo filtrado que excluye allowEmpty del denominador y calcula por páginas si está disponible
   * También incluye el conteo de módulos (cards) por nivel
   * @returns {Object} Objeto con progreso por nivel: { [levelId]: { completedLessons, totalLessons, percentage, completedPages, totalPages, totalModules } }
   */
  const levelProgressAggregated = useMemo(() => {
    const progress = {};
    const levels = ['beginner', 'intermediate', 'advanced'];
    
    // Si tenemos progressByModule, usar cálculo filtrado completo (incluye progreso por páginas)
    if (progressByModule && typeof progressByModule === 'object') {
      levels.forEach(levelId => {
        const filteredProgress = calculateFilteredProgress(progressByModule, levelId);
        // Obtener módulos (cards) en este nivel
        const modulesInLevel = getModulesByLevel(levelId);
        // Filtrar módulos bloqueados (no mostrar los que están bloqueados)
        // Un módulo está disponible si tiene al menos una lección visible
        const visibleModules = modulesInLevel.filter(module => {
          // Verificar si el módulo tiene lecciones visibles
          const visibleLessons = getVisibleLessonsByLevel(levelId);
          return visibleLessons.some(lesson => lesson.moduleId === module.id);
        });
        
        progress[levelId] = {
          completedLessons: filteredProgress.completedLessons,
          totalLessons: filteredProgress.totalLessons,
          percentage: filteredProgress.percentage,
          completedPages: filteredProgress.completedPages,
          totalPages: filteredProgress.totalPages,
          totalModules: visibleModules.length, // Cantidad de cards (módulos) en el nivel
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
      
      // Obtener módulos (cards) en este nivel
      const modulesInLevel = getModulesByLevel(levelId);
      // Filtrar módulos que tienen lecciones visibles
      const visibleLessons = getVisibleLessonsByLevel(levelId);
      const visibleModules = modulesInLevel.filter(module => {
        return visibleLessons.some(lesson => lesson.moduleId === module.id);
      });
      
      progress[levelId] = {
        completedLessons: completedLessonsCount,
        totalLessons: totalLessons,
        percentage: percentage,
        completedPages: completedPages,
        totalPages: totalPages,
        totalModules: visibleModules.length, // Cantidad de cards (módulos) en el nivel
      };
    });

    return progress;
  }, [completedLessons, progressByModule]);

  /**
   * Calcula estadísticas globales de progreso
   * Uses getVisibleLessonsByLevel to count lessons (excludes allowEmpty from totals)
   * @returns {Object} Objeto con estadísticas globales
   */
  const calculateGlobalStats = useMemo(() => {
    // Use selectors for data-driven counts
    const modules = getAllModules();
    const totalModules = getModulesCount();
    const completedModules = modules.filter(module => 
      calculateModuleProgress(module.id) === 100
    ).length;
    
    // Count total lessons using getVisibleLessonsByLevel (excludes allowEmpty from totals)
    const allLevels = ['beginner', 'intermediate', 'advanced'];
    let totalLessons = 0;
    allLevels.forEach(levelId => {
      const visibleLessons = getVisibleLessonsByLevel(levelId);
      // Only count completable lessons (exclude allowEmpty)
      const completableLessons = visibleLessons.filter(lesson => !lesson.allowEmpty);
      totalLessons += completableLessons.length;
    });
    
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

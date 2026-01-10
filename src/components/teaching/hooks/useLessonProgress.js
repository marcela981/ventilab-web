import { useMemo, useCallback } from 'react';
import { getModuleById } from '../../../data/curriculumData';

/**
 * useLessonProgress - Hook personalizado para tracking de progreso de lección
 *
 * Maneja el progreso de lecciones y módulos, incluyendo cálculos de
 * completitud, disponibilidad y estado.
 *
 * @param {Set} completedLessons - Set de lecciones completadas del context
 * @returns {Object} Objeto con funciones de progreso
 */
const useLessonProgress = (completedLessons) => {

  /**
   * Calcula el progreso de un módulo específico
   * @param {string} moduleId - ID del módulo
   * @returns {number} Porcentaje de progreso (0-100)
   */
  const calculateModuleProgress = useCallback((moduleId) => {
    const module = getModuleById(moduleId);
    if (!module || !module.lessons) return 0;

    const moduleLessons = module.lessons || [];
    const completedModuleLessons = moduleLessons.filter(lesson =>
      completedLessons.has(`${moduleId}-${lesson.id}`)
    );

    return moduleLessons.length > 0 ? (completedModuleLessons.length / moduleLessons.length) * 100 : 0;
  }, [completedLessons]);

  /**
   * Obtiene el estado de una lección específica
   * @param {string} moduleId - ID del módulo
   * @param {string} lessonId - ID de la lección
   * @returns {string} Estado de la lección ('completed' o 'pending')
   */
  const getLessonStatus = useCallback((moduleId, lessonId) => {
    const lessonKey = `${moduleId}-${lessonId}`;
    return completedLessons.has(lessonKey) ? 'completed' : 'pending';
  }, [completedLessons]);

  /**
   * Verifica si un módulo está disponible basándose en prerequisites
   * @param {string} moduleId - ID del módulo
   * @returns {boolean} True si el módulo está disponible
   */
  const isModuleAvailable = useCallback((moduleId) => {
    const module = getModuleById(moduleId);
    if (!module) return false;

    if (!module.prerequisites || module.prerequisites.length === 0) {
      return true;
    }

    return module.prerequisites.every(prereqId => {
      const prereqProgress = calculateModuleProgress(prereqId);
      return prereqProgress >= 75;
    });
  }, [calculateModuleProgress]);

  return {
    calculateModuleProgress,
    getLessonStatus,
    isModuleAvailable
  };
};

export default useLessonProgress;

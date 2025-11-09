import { useMemo, useCallback } from 'react';
import { curriculumData, getModulesByLevel } from '../../../data/curriculumData';
import { useLearningProgress } from '../../../contexts/LearningProgressContext';

/**
 * Hook para determinar si una lección específica está desbloqueada
 * 
 * Implementa la lógica de desbloqueo secuencial:
 * - Nivel 1 (beginner): Primera lección siempre disponible, resto secuencial
 * - Niveles 2 y 3: Primera lección disponible solo si nivel anterior está completo
 * - Todas las lecciones: Se desbloquean secuencialmente dentro del nivel
 * 
 * @returns {Function} Función isLessonAvailable(lesson, allLessonsInLevel) que retorna boolean
 */
export const useLessonAvailability = () => {
  const { completedLessons, progressByModule } = useLearningProgress();

  /**
   * Calcula el progreso de un módulo
   * Usa progressByModule si está disponible (más preciso), sino usa completedLessons
   */
  const calculateModuleProgress = useCallback((moduleId) => {
    const module = curriculumData?.modules?.[moduleId];
    
    // Si el módulo no existe, retornar 0
    if (!module) {
      return 0;
    }

    // Si el módulo no tiene lecciones definidas, considerarlo como completo (100%)
    // Esto evita que módulos sin lecciones bloqueen el progreso del nivel
    if (!module.lessons || module.lessons.length === 0) {
      console.log(`[calculateModuleProgress] Module ${moduleId} has no lessons, considering complete (100%)`);
      return 100;
    }

    // Si tenemos progressByModule, usarlo (más preciso y actualizado)
    if (progressByModule && progressByModule[moduleId]) {
      const moduleProgress = progressByModule[moduleId];
      const lessonsById = moduleProgress.lessonsById || {};
      
      // Contar lecciones completadas
      const completedCount = module.lessons.filter((lesson) => {
        const lessonProgress = lessonsById[lesson.id];
        return lessonProgress && lessonProgress.completed === true;
      }).length;

      const progress = Math.round((completedCount / module.lessons.length) * 100);
      return progress;
    }

    // Fallback: usar completedLessons Set
    const completedCount = module.lessons.filter((lesson) => {
      const lessonKey1 = `${moduleId}-${lesson.id}`;
      const lessonKey2 = lesson.id; // Formato legacy
      return completedLessons.has(lessonKey1) || completedLessons.has(lessonKey2);
    }).length;

    const progress = Math.round((completedCount / module.lessons.length) * 100);
    return progress;
  }, [completedLessons, progressByModule]);

  /**
   * Verifica si todos los módulos de un nivel están completados al 100%
   */
  const isLevelCompleted = useCallback((levelId) => {
    if (!levelId || !curriculumData?.modules) {
      console.warn(`[isLevelCompleted] Invalid levelId or curriculumData:`, { levelId, hasModules: !!curriculumData?.modules });
      return false;
    }

    const modulesInLevel = getModulesByLevel(levelId);
    
    if (modulesInLevel.length === 0) {
      return true;
    }

    // Verificar progreso de cada módulo
    // Solo considerar módulos que tienen lecciones Y tienen datos de progreso
    const modulesWithLessons = modulesInLevel.filter((mod) => {
      return mod.lessons && mod.lessons.length > 0;
    });

    // Si no hay módulos con lecciones en el nivel, considerarlo completo
    if (modulesWithLessons.length === 0) {
      console.log(`[isLevelCompleted] Level: ${levelId} has no modules with lessons, considering complete`);
      return true;
    }

    // Filtrar módulos que tienen datos de progreso o lecciones completadas
    // Si un módulo no tiene datos en progressByModule Y no tiene lecciones en completedLessons,
    // podría ser que el módulo no existe en la BD o no se ha iniciado. En ese caso, lo excluimos.
    const modulesWithProgress = modulesWithLessons.filter((mod) => {
      // Si tiene datos en progressByModule, incluirlo
      if (progressByModule && progressByModule[mod.id]) {
        return true;
      }
      
      // Si no tiene datos en progressByModule, verificar si tiene lecciones completadas
      const hasCompletedLessons = mod.lessons.some((lesson) => {
        const lessonKey1 = `${mod.id}-${lesson.id}`;
        const lessonKey2 = lesson.id;
        return completedLessons.has(lessonKey1) || completedLessons.has(lessonKey2);
      });
      
      // Si tiene al menos una lección completada, incluirlo
      if (hasCompletedLessons) {
        return true;
      }
      
      // Si no tiene datos de progreso ni lecciones completadas, excluirlo del cálculo
      // Esto maneja el caso de módulos que no existen en la BD o no se han iniciado
      console.log(`[isLevelCompleted] Excluding module ${mod.id} from level completion check (no progress data)`);
      return false;
    });

    // Si no hay módulos con progreso, considerar el nivel completo
    if (modulesWithProgress.length === 0) {
      console.log(`[isLevelCompleted] Level: ${levelId} has no modules with progress data, considering complete`);
      return true;
    }

    const moduleProgresses = modulesWithProgress.map((mod) => {
      const moduleProgress = calculateModuleProgress(mod.id);
      return { moduleId: mod.id, title: mod.title, progress: moduleProgress, isComplete: moduleProgress === 100 };
    });

    const allModulesCompleted = moduleProgresses.every(m => m.isComplete);
    
    // Solo loggear si el nivel no está completo para debugging
    if (!allModulesCompleted) {
      console.log(`[isLevelCompleted] Level: ${levelId} is NOT complete. Module progress:`, moduleProgresses);
    } else {
      console.log(`[isLevelCompleted] Level: ${levelId} is COMPLETE. All modules:`, moduleProgresses.map(m => `${m.moduleId} (${m.progress}%)`).join(', '));
    }

    return allModulesCompleted;
  }, [calculateModuleProgress, completedLessons]);

  /**
   * Obtiene el nivel anterior
   */
  const getPreviousLevel = useCallback((currentLevel) => {
    const levelOrder = { beginner: 1, intermediate: 2, advanced: 3 };
    const levelNames = ['beginner', 'intermediate', 'advanced'];
    const currentIndex = levelOrder[currentLevel];
    
    if (currentIndex === 1) {
      return null;
    }
    
    return levelNames[currentIndex - 2];
  }, []);

  /**
   * Verifica si una lección está completada
   * Usa progressByModule si está disponible (más preciso), sino usa completedLessons
   */
  const isLessonCompleted = useCallback((moduleId, lessonId) => {
    // Si tenemos progressByModule, usarlo (más preciso y actualizado)
    if (progressByModule && progressByModule[moduleId]) {
      const moduleProgress = progressByModule[moduleId];
      const lessonProgress = moduleProgress.lessonsById?.[lessonId];
      if (lessonProgress) {
        return lessonProgress.completed === true;
      }
    }

    // Fallback: usar completedLessons Set
    const lessonKey1 = `${moduleId}-${lessonId}`;
    const lessonKey2 = lessonId; // Formato legacy
    const isCompleted = completedLessons.has(lessonKey1) || completedLessons.has(lessonKey2);
    return isCompleted;
  }, [completedLessons, progressByModule]);

  /**
   * Determina si una lección está desbloqueada
   * 
   * @param {Object} lesson - Objeto de lección con moduleId, lessonId, order, etc.
   * @param {Array} allLessonsInLevel - Array de todas las lecciones del nivel (ordenadas)
   * @returns {boolean} True si la lección está desbloqueada
   */
  const isLessonAvailable = useCallback((lesson, allLessonsInLevel) => {
    if (!lesson || !allLessonsInLevel || allLessonsInLevel.length === 0) {
      return false;
    }

    // Obtener información del módulo
    const module = curriculumData?.modules?.[lesson.moduleId];
    if (!module) {
      // Si no encontramos el módulo en curriculumData, no está disponible
      return false;
    }

    const level = module.level || lesson.moduleLevel || 'beginner';

    // Si es beginner, las lecciones se desbloquean secuencialmente dentro del módulo
    if (level === 'beginner') {
      // Encontrar la lección en el array de todas las lecciones del nivel
      const lessonIndex = allLessonsInLevel.findIndex(
        l => l.moduleId === lesson.moduleId && l.lessonId === lesson.lessonId
      );

      if (lessonIndex === -1) {
        return false;
      }

      // La primera lección siempre está disponible
      if (lessonIndex === 0) {
        return true;
      }

      // Las demás lecciones requieren que las anteriores estén completadas
      for (let i = 0; i < lessonIndex; i++) {
        const previousLesson = allLessonsInLevel[i];
        if (!isLessonCompleted(previousLesson.moduleId, previousLesson.lessonId)) {
          return false;
        }
      }

      return true;
    }

    // Para niveles que NO son beginner:

    // PRIMERO: Verificar que el nivel anterior esté completo
    const previousLevel = getPreviousLevel(level);
    if (previousLevel) {
      const previousLevelIsComplete = isLevelCompleted(previousLevel);
      
      if (!previousLevelIsComplete) {
        // Si el nivel anterior no está completo, ninguna lección de este nivel está disponible
        console.log(`[useLessonAvailability] BLOCKED: Lesson ${lesson.lessonId} (${lesson.title || 'untitled'}) in level ${level} - Previous level ${previousLevel} is not complete`);
        return false;
      }
    }

    // SEGUNDO: Verificar si es la primera lección del nivel
    const lessonIndex = allLessonsInLevel.findIndex(
      l => l.moduleId === lesson.moduleId && l.lessonId === lesson.lessonId
    );

    if (lessonIndex === -1) {
      console.warn(`[useLessonAvailability] Lesson ${lesson.lessonId} not found in allLessonsInLevel`);
      return false;
    }

    // Si es la primera lección del nivel, está disponible (nivel anterior ya está completo)
    if (lessonIndex === 0) {
      console.log(`[useLessonAvailability] AVAILABLE: Lesson ${lesson.lessonId} is first in level ${level} (previous level ${previousLevel || 'none'} is complete)`);
      return true;
    }

    // TERCERO: Para cualquier otra lección, verificar que TODAS las lecciones anteriores
    // en el nivel estén completadas
    for (let i = 0; i < lessonIndex; i++) {
      const previousLesson = allLessonsInLevel[i];
      if (!isLessonCompleted(previousLesson.moduleId, previousLesson.lessonId)) {
        return false;
      }
    }

    return true;
  }, [completedLessons, calculateModuleProgress, isLevelCompleted, getPreviousLevel, isLessonCompleted]);

  return {
    isLessonAvailable,
    isLevelCompleted,
    calculateModuleProgress,
  };
};

export default useLessonAvailability;


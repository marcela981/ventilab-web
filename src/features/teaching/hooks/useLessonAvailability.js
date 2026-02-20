import { useMemo, useCallback } from 'react';
import { curriculumData, getModulesByLevel } from '@/features/teaching/data/curriculumData';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';

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
  const { completedLessons, progressByModule, snapshot } = useLearningProgress();
  const { selectLessonProgress, selectModuleProgress } = require('@/features/progress/services/selectors');

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
      
      // Contar lecciones completadas - ONLY count if progress === 1 (not based on flags)
      const completedCount = module.lessons.filter((lesson) => {
        const lessonProgress = lessonsById[lesson.id];
        if (!lessonProgress) return false;
        
        // Get progress value (0-1) - use progress field, never flags
        const lessonProgressValue = Math.max(0, Math.min(1, lessonProgress.progress || 0));
        // A lesson is completed ONLY when progress === 1
        return lessonProgressValue === 1;
      }).length;

      // Module progress = completedLessons / totalLessons (0-1, then convert to 0-100)
      const progress = Math.round((completedCount / module.lessons.length) * 100);
      return progress;
    }

    // Try unified snapshot if available
    if (snapshot && snapshot.lessons) {
      const moduleLessons = snapshot.lessons.filter(l => {
        // Match lesson by ID (adjust logic based on your lessonId format)
        return module.lessons.some(ml => ml.id === l.lessonId || l.lessonId.includes(ml.id));
      });
      // Count lessons with progress === 1 (not based on flags)
      const completedCount = moduleLessons.filter(l => {
        const lessonProgressValue = Math.max(0, Math.min(1, l.progress || 0));
        return lessonProgressValue === 1;
      }).length;
      // Module progress = completedLessons / totalLessons (0-1, then convert to 0-100)
      const progress = Math.round((completedCount / module.lessons.length) * 100);
      return progress;
    }

    // Fallback: usar completedLessons Set (DEPRECATED: should use progress values instead)
    // This fallback is kept for backward compatibility but should be replaced with progress-based calculation
    const completedCount = module.lessons.filter((lesson) => {
      const lessonKey1 = `${moduleId}-${lesson.id}`;
      const lessonKey2 = lesson.id; // Formato legacy
      return completedLessons.has(lessonKey1) || completedLessons.has(lessonKey2);
    }).length;

    // Module progress = completedLessons / totalLessons
    const progress = Math.round((completedCount / module.lessons.length) * 100);
    return progress;
  }, [completedLessons, progressByModule, snapshot]);

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
      // Module is complete ONLY when ALL its lessons are completed (progress === 100)
      const isComplete = moduleProgress === 100;
      return { moduleId: mod.id, title: mod.title, progress: moduleProgress, isComplete };
    });

    // Level is complete ONLY when ALL modules are complete (all have 100% progress = all lessons completed)
    const allModulesCompleted = moduleProgresses.every(m => m.isComplete);
    
    // Solo loggear si el nivel no está completo para debugging
    if (!allModulesCompleted) {
      console.log(`[isLevelCompleted] Level: ${levelId} is NOT complete. Module progress:`, moduleProgresses);
    } else {
      console.log(`[isLevelCompleted] Level: ${levelId} is COMPLETE. All modules:`, moduleProgresses.map(m => `${m.moduleId} (${m.progress}%)`).join(', '));
    }

    return allModulesCompleted;
  }, [calculateModuleProgress, completedLessons, progressByModule]);

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
   * Checks if a lesson is completed based on progress value (0-1).
   * Lesson progress (0-1 float) is the single source of truth.
   * A lesson is completed ONLY when progress === 1 (not based on flags).
   */
  const isLessonCompleted = useCallback((moduleId, lessonId) => {
    // 1. Check unified snapshot first (most accurate, fresh from backend)
    if (snapshot?.lessons && Array.isArray(snapshot.lessons)) {
      // Check for exact match
      const snapshotLesson = snapshot.lessons.find(l => l.lessonId === lessonId);
      if (snapshotLesson) {
        const progressValue = Math.max(0, Math.min(1, snapshotLesson.progress || 0));
        if (progressValue === 1) {
          return true;
        }
      }
      // Also check with moduleId-lessonId format
      const compoundKey = `${moduleId}-${lessonId}`;
      const snapshotLessonCompound = snapshot.lessons.find(l => l.lessonId === compoundKey);
      if (snapshotLessonCompound) {
        const progressValue = Math.max(0, Math.min(1, snapshotLessonCompound.progress || 0));
        if (progressValue === 1) {
          return true;
        }
      }
    }

    // 2. Check progressByModule (local state, may be more recent for current session)
    if (progressByModule && progressByModule[moduleId]) {
      const moduleProgress = progressByModule[moduleId];
      const lessonProgress = moduleProgress.lessonsById?.[lessonId];
      if (lessonProgress) {
        // Get progress value (0-1) - prefer progress field, then completionPercentage
        let progressValue = 0;
        if (typeof lessonProgress.progress === 'number') {
          progressValue = Math.max(0, Math.min(1, lessonProgress.progress));
        } else if (typeof lessonProgress.completionPercentage === 'number') {
          progressValue = Math.max(0, Math.min(1, lessonProgress.completionPercentage / 100));
        }
        if (progressValue === 1) {
          return true;
        }
      }
    }

    // 3. Fallback: use completedLessons Set (derived from progress === 1, not flags)
    const lessonKey1 = `${moduleId}-${lessonId}`;
    const lessonKey2 = lessonId; // Formato legacy
    const isCompleted = completedLessons.has(lessonKey1) || completedLessons.has(lessonKey2);
    return isCompleted;
  }, [completedLessons, progressByModule, snapshot]);

  /**
   * Determina si una lección está desbloqueada
   *
   * UNLOCK LOGIC (per requirements):
   * - Unlock depends ONLY on lesson order inside the module (not across modules)
   * - First lesson of each module is always available (for beginner level)
   * - For intermediate/advanced levels: first lesson available only if previous level is complete
   * - Subsequent lessons require the previous lesson in the SAME MODULE to be completed
   *
   * @param {Object} lesson - Objeto de lección con moduleId, lessonId, order, etc.
   * @param {Array} allLessonsInLevel - Array de todas las lecciones del nivel (ordenadas)
   * @returns {boolean} True si la lección está desbloqueada
   */
  const isLessonAvailable = useCallback((lesson, allLessonsInLevel) => {
    if (!lesson) {
      return false;
    }

    // Obtener información del módulo
    const module = curriculumData?.modules?.[lesson.moduleId];
    if (!module) {
      // Si no encontramos el módulo en curriculumData, no está disponible
      return false;
    }

    const level = module.level || lesson.moduleLevel || 'beginner';

    // Get lessons only for THIS module, sorted by order
    const moduleLessons = (module.lessons || []).map((l, idx) => ({
      moduleId: lesson.moduleId,
      lessonId: l.id,
      order: l.order ?? idx,
      title: l.title
    })).sort((a, b) => a.order - b.order);

    // Find the index of this lesson within its module
    const lessonIndexInModule = moduleLessons.findIndex(
      l => l.lessonId === lesson.lessonId
    );

    if (lessonIndexInModule === -1) {
      // Lesson not found in module, check if it's in allLessonsInLevel as fallback
      console.warn(`[useLessonAvailability] Lesson ${lesson.lessonId} not found in module ${lesson.moduleId}`);
      return false;
    }

    // For non-beginner levels, check if previous level is complete first
    if (level !== 'beginner') {
      const previousLevel = getPreviousLevel(level);
      if (previousLevel) {
        const previousLevelIsComplete = isLevelCompleted(previousLevel);

        if (!previousLevelIsComplete) {
          // If previous level is not complete, no lesson in this level is available
          return false;
        }
      }
    }

    // First lesson of the module is always available (after level prerequisites are met)
    if (lessonIndexInModule === 0) {
      return true;
    }

    // For subsequent lessons, check that the PREVIOUS lesson in this module is completed
    // This is the key fix: only check the immediate previous lesson, not all previous lessons
    const previousLessonInModule = moduleLessons[lessonIndexInModule - 1];
    const isPreviousCompleted = isLessonCompleted(lesson.moduleId, previousLessonInModule.lessonId);

    return isPreviousCompleted;
  }, [isLevelCompleted, getPreviousLevel, isLessonCompleted]);

  return {
    isLessonAvailable,
    isLevelCompleted,
    calculateModuleProgress,
  };
};

export default useLessonAvailability;


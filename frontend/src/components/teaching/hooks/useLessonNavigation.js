import { useCallback, useMemo } from 'react';
import { getModuleById, getModulesByLevel } from '../../../data/curriculumData';

/**
 * useLessonNavigation - Hook personalizado para navegación de lecciones
 *
 * Proporciona funciones para navegar entre lecciones y módulos,
 * incluyendo obtener la lección anterior y siguiente.
 *
 * @param {string} moduleId - ID del módulo actual
 * @param {string} lessonId - ID de la lección actual
 * @param {string} level - Nivel actual (beginner, intermediate, advanced)
 * @returns {Object} Objeto con funciones de navegación
 */
const useLessonNavigation = (moduleId, lessonId, level) => {

  /**
   * Obtiene los módulos del nivel actual
   * @returns {Array} Array de módulos del nivel
   */
  const getModulesForCurrentLevel = useCallback(() => {
    if (!level) return [];
    return getModulesByLevel(level);
  }, [level]);

  /**
   * Obtiene la siguiente lección disponible
   * @returns {Object|null} Objeto con información de la siguiente lección
   */
  const getNextLesson = useMemo(() => {
    const modules = getModulesForCurrentLevel();
    const currentModuleIndex = modules.findIndex(m => m.id === moduleId);

    if (currentModuleIndex >= 0) {
      const currentModule = modules[currentModuleIndex];
      const currentLessonIndex = currentModule.lessons?.findIndex(l => l.id === lessonId) || -1;

      // Buscar en el módulo actual
      if (currentLessonIndex >= 0 && currentLessonIndex < currentModule.lessons.length - 1) {
        return {
          moduleId: moduleId,
          lessonId: currentModule.lessons[currentLessonIndex + 1].id,
          module: currentModule,
          lesson: currentModule.lessons[currentLessonIndex + 1]
        };
      }

      // Buscar en el siguiente módulo
      if (currentModuleIndex < modules.length - 1) {
        const nextModule = modules[currentModuleIndex + 1];
        if (nextModule.lessons && nextModule.lessons.length > 0) {
          return {
            moduleId: nextModule.id,
            lessonId: nextModule.lessons[0].id,
            module: nextModule,
            lesson: nextModule.lessons[0]
          };
        }
      }
    }

    return null;
  }, [moduleId, lessonId, getModulesForCurrentLevel]);

  /**
   * Obtiene la lección anterior disponible
   * @returns {Object|null} Objeto con información de la lección anterior
   */
  const getPrevLesson = useMemo(() => {
    const modules = getModulesForCurrentLevel();
    const currentModuleIndex = modules.findIndex(m => m.id === moduleId);

    if (currentModuleIndex >= 0) {
      const currentModule = modules[currentModuleIndex];
      const currentLessonIndex = currentModule.lessons?.findIndex(l => l.id === lessonId) || -1;

      // Buscar en el módulo actual
      if (currentLessonIndex > 0) {
        return {
          moduleId: moduleId,
          lessonId: currentModule.lessons[currentLessonIndex - 1].id,
          module: currentModule,
          lesson: currentModule.lessons[currentLessonIndex - 1]
        };
      }

      // Buscar en el módulo anterior
      if (currentModuleIndex > 0) {
        const prevModule = modules[currentModuleIndex - 1];
        if (prevModule.lessons && prevModule.lessons.length > 0) {
          const lastLesson = prevModule.lessons[prevModule.lessons.length - 1];
          return {
            moduleId: prevModule.id,
            lessonId: lastLesson.id,
            module: prevModule,
            lesson: lastLesson
          };
        }
      }
    }

    return null;
  }, [moduleId, lessonId, getModulesForCurrentLevel]);

  return {
    getNextLesson,
    getPrevLesson,
    getModulesForCurrentLevel
  };
};

export default useLessonNavigation;

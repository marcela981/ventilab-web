import { useState, useCallback, useMemo } from 'react';
import { getModulesCount, getAllModules, getVisibleLessonsByLevel } from '../../../data/curriculum/selectors.js';

/**
 * Hook personalizado para encapsular la lógica del árbol de progreso del usuario
 *
 * Este hook gestiona toda la lógica relacionada con el cálculo de progreso,
 * verificación de prerequisitos, estadísticas globales, recomendaciones de lecciones
 * y navegación dentro del árbol de aprendizaje.
 *
 * @param {Object} curriculumData - Objeto con todos los módulos y lecciones del curriculum
 * @param {Set} completedLessons - Set con las claves de lecciones completadas (formato: "moduleId-lessonId")
 * @param {number} timeSpent - Tiempo total invertido por el usuario en minutos
 * @param {Function} setCurrentModule - Función para establecer el módulo actual
 * @param {Function} navigateToLesson - Función para navegar a una lección específica
 * @returns {Object} Objeto con funciones y estados del árbol de progreso
 */
const useProgressTree = (
  curriculumData = {},
  completedLessons = new Set(),
  timeSpent = 0,
  setCurrentModule,
  navigateToLesson
) => {
  // Estado para mantener los módulos expandidos en el árbol
  const [expandedModules, setExpandedModules] = useState(new Set());

  /**
   * Calcula el porcentaje de progreso de un módulo específico
   *
   * @param {string} moduleId - ID del módulo a calcular
   * @returns {number} Porcentaje de progreso (0-100)
   */
  const calculateModuleProgress = useCallback(
    (moduleId) => {
      // Validar que el curriculumData y el módulo existan
      if (!curriculumData || !curriculumData.modules) {
        return 0;
      }

      const module = curriculumData.modules[moduleId];
      if (!module || !module.lessons || module.lessons.length === 0) {
        return 0;
      }

      // Contar lecciones completadas
      const completedCount = module.lessons.filter((lesson) => {
        const lessonKey = `${moduleId}-${lesson.id}`;
        return completedLessons.has(lessonKey);
      }).length;

      // Calcular porcentaje
      const progress = (completedCount / module.lessons.length) * 100;
      return Math.round(progress);
    },
    [curriculumData, completedLessons]
  );

  /**
   * Verifica si todos los prerequisitos de un módulo han sido completados
   *
   * @param {string} moduleId - ID del módulo a verificar
   * @returns {boolean} true si todos los prerequisitos están completados al 100%
   */
  const arePrerequisitesMet = useCallback(
    (moduleId) => {
      // Validar que el curriculumData y el módulo existan
      if (!curriculumData || !curriculumData.modules) {
        return false;
      }

      const module = curriculumData.modules[moduleId];
      if (!module) {
        return false;
      }

      // Si no tiene prerequisites, está disponible
      if (!module.prerequisites || module.prerequisites.length === 0) {
        return true;
      }

      // Verificar que todos los prerequisites existan y estén completados al 100%
      return module.prerequisites.every((prereqId) => {
        // Verificar que el prerequisito exista en el curriculum
        if (!curriculumData.modules[prereqId]) {
          console.warn(
            `Prerequisite ${prereqId} not found in curriculum for module ${moduleId}`
          );
          return false;
        }

        // Calcular progreso del prerequisito
        const prereqProgress = calculateModuleProgress(prereqId);
        return prereqProgress === 100;
      });
    },
    [curriculumData, calculateModuleProgress]
  );

  /**
   * Determina el estado de un módulo
   *
   * @param {string} moduleId - ID del módulo a evaluar
   * @returns {string} Estado del módulo: 'locked', 'available', 'in-progress', 'completed'
   */
  const getModuleStatus = useCallback(
    (moduleId) => {
      // Verificar si los prerequisites están cumplidos
      const prerequisitesMet = arePrerequisitesMet(moduleId);

      if (!prerequisitesMet) {
        return 'locked';
      }

      // Calcular progreso del módulo
      const progress = calculateModuleProgress(moduleId);

      if (progress === 100) {
        return 'completed';
      }

      if (progress > 0 && progress < 100) {
        return 'in-progress';
      }

      return 'available';
    },
    [arePrerequisitesMet, calculateModuleProgress]
  );

  /**
   * Calcula las estadísticas globales del progreso del usuario
   *
   * @returns {Object} Objeto con estadísticas globales
   */
  const calculateGlobalProgress = useMemo(() => {
    // Manejar caso cuando curriculumData está vacío
    if (!curriculumData || !curriculumData.modules) {
      return {
        totalModules: 0,
        completedModules: 0,
        globalProgressPercentage: 0,
        totalLessons: 0,
        completedLessonsCount: 0,
        lessonsProgressPercentage: 0,
        totalTimeSpent: timeSpent || 0,
        averageTimePerModule: 0,
      };
    }

    // Use selector for data-driven count
    const modules = getAllModules();
    const totalModules = getModulesCount();

    // Contar módulos completados
    let completedModules = 0;

    modules.forEach((module) => {
      const moduleProgress = calculateModuleProgress(module.id);
      if (moduleProgress === 100) {
        completedModules++;
      }
    });

    // Count total lessons using getVisibleLessonsByLevel (excludes allowEmpty from totals)
    const allLevels = ['beginner', 'intermediate', 'advanced'];
    let totalLessons = 0;
    allLevels.forEach(levelId => {
      const visibleLessons = getVisibleLessonsByLevel(levelId);
      // Only count completable lessons (exclude allowEmpty)
      const completableLessons = visibleLessons.filter(lesson => !lesson.allowEmpty);
      totalLessons += completableLessons.length;
    });

    // Calcular porcentaje global de módulos
    const globalProgressPercentage =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    // Contar lecciones completadas
    const completedLessonsCount = completedLessons.size;

    // Calcular porcentaje de lecciones
    const lessonsProgressPercentage =
      totalLessons > 0
        ? Math.round((completedLessonsCount / totalLessons) * 100)
        : 0;

    // Calcular tiempo promedio por módulo
    const averageTimePerModule =
      completedModules > 0
        ? Math.round((timeSpent || 0) / completedModules)
        : 0;

    return {
      totalModules,
      completedModules,
      globalProgressPercentage,
      totalLessons,
      completedLessonsCount,
      lessonsProgressPercentage,
      totalTimeSpent: timeSpent || 0,
      averageTimePerModule,
    };
  }, [curriculumData, completedLessons, timeSpent, calculateModuleProgress]);

  /**
   * Encuentra la próxima lección recomendada que el usuario debería tomar
   *
   * @returns {Object|null} Objeto con moduleId, lessonId, moduleTitle, lessonTitle o null
   */
  const getNextRecommendedLesson = useMemo(() => {
    // Manejar caso cuando curriculumData está vacío
    if (!curriculumData || !curriculumData.modules) {
      return null;
    }

    const modules = Object.values(curriculumData.modules);

    // Iterar sobre los módulos en orden
    for (const module of modules) {
      // Verificar si el módulo está disponible (no bloqueado)
      const isAvailable = arePrerequisitesMet(module.id);

      if (!isAvailable) {
        continue;
      }

      // Buscar la primera lección no completada en este módulo
      if (module.lessons && Array.isArray(module.lessons)) {
        for (const lesson of module.lessons) {
          const lessonKey = `${module.id}-${lesson.id}`;

          if (!completedLessons.has(lessonKey)) {
            return {
              moduleId: module.id,
              lessonId: lesson.id,
              moduleTitle: module.title || 'Módulo sin título',
              lessonTitle: lesson.title || 'Lección sin título',
            };
          }
        }
      }
    }

    // No se encontró ninguna lección pendiente
    return null;
  }, [curriculumData, completedLessons, arePrerequisitesMet]);

  /**
   * Obtiene la lista de prerequisitos faltantes de un módulo
   *
   * @param {string} moduleId - ID del módulo
   * @returns {Array} Array de objetos con información de prerequisitos faltantes
   */
  const getMissingPrerequisites = useCallback(
    (moduleId) => {
      if (!curriculumData || !curriculumData.modules) {
        return [];
      }

      const module = curriculumData.modules[moduleId];
      if (!module || !module.prerequisites || module.prerequisites.length === 0) {
        return [];
      }

      const missing = [];

      module.prerequisites.forEach((prereqId) => {
        const prereqModule = curriculumData.modules[prereqId];
        if (!prereqModule) {
          return;
        }

        const progress = calculateModuleProgress(prereqId);
        if (progress < 100) {
          missing.push({
            id: prereqId,
            title: prereqModule.title || 'Módulo sin título',
            progress,
          });
        }
      });

      return missing;
    },
    [curriculumData, calculateModuleProgress]
  );

  /**
   * Maneja el click en un módulo
   *
   * @param {string} moduleId - ID del módulo clickeado
   * @param {Function} onModuleClick - Callback opcional a ejecutar
   */
  const handleModuleClick = useCallback(
    (moduleId, onModuleClick) => {
      // Verificar si el módulo está disponible
      const isAvailable = arePrerequisitesMet(moduleId);

      if (!isAvailable) {
        // Obtener prerequisitos faltantes
        const missingPrereqs = getMissingPrerequisites(moduleId);

        if (missingPrereqs.length > 0) {
          const prereqTitles = missingPrereqs
            .map((prereq) => prereq.title)
            .join(', ');

          alert(
            `Este módulo está bloqueado. Primero debes completar: ${prereqTitles}`
          );
        } else {
          alert('Este módulo está bloqueado. Completa los prerequisitos primero.');
        }

        return;
      }

      // El módulo está disponible, establecerlo como actual
      if (setCurrentModule) {
        setCurrentModule(moduleId);
      }

      // Ejecutar callback si existe
      if (onModuleClick && typeof onModuleClick === 'function') {
        const module = curriculumData?.modules?.[moduleId];
        onModuleClick(module || { id: moduleId });
      }
    },
    [
      arePrerequisitesMet,
      getMissingPrerequisites,
      setCurrentModule,
      curriculumData,
    ]
  );

  /**
   * Maneja el click en una lección
   *
   * @param {string} moduleId - ID del módulo padre
   * @param {string} lessonId - ID de la lección clickeada
   */
  const handleLessonClick = useCallback(
    (moduleId, lessonId) => {
      // Verificar si el módulo está disponible
      const isAvailable = arePrerequisitesMet(moduleId);

      if (!isAvailable) {
        const missingPrereqs = getMissingPrerequisites(moduleId);
        const prereqTitles = missingPrereqs
          .map((prereq) => prereq.title)
          .join(', ');

        alert(
          `No puedes acceder a esta lección. Primero completa: ${prereqTitles}`
        );
        return;
      }

      // Navegar a la lección
      if (navigateToLesson && typeof navigateToLesson === 'function') {
        navigateToLesson(moduleId, lessonId);
      }
    },
    [arePrerequisitesMet, getMissingPrerequisites, navigateToLesson]
  );

  /**
   * Alterna la expansión de un módulo en el árbol
   *
   * @param {string} moduleId - ID del módulo a expandir/colapsar
   */
  const toggleModuleExpansion = useCallback((moduleId) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }

      return newSet;
    });
  }, []);

  /**
   * Verifica si un módulo está expandido
   *
   * @param {string} moduleId - ID del módulo
   * @returns {boolean} true si está expandido
   */
  const isModuleExpanded = useCallback(
    (moduleId) => {
      return expandedModules.has(moduleId);
    },
    [expandedModules]
  );

  /**
   * Expande todos los módulos disponibles
   */
  const expandAllModules = useCallback(() => {
    if (!curriculumData || !curriculumData.modules) {
      return;
    }

    const availableModuleIds = Object.keys(curriculumData.modules).filter(
      (moduleId) => {
        const status = getModuleStatus(moduleId);
        return status !== 'locked';
      }
    );

    setExpandedModules(new Set(availableModuleIds));
  }, [curriculumData, getModuleStatus]);

  /**
   * Colapsa todos los módulos
   */
  const collapseAllModules = useCallback(() => {
    setExpandedModules(new Set());
  }, []);

  /**
   * Obtiene información detallada de un módulo
   *
   * @param {string} moduleId - ID del módulo
   * @returns {Object|null} Información del módulo con progreso y estado
   */
  const getModuleInfo = useCallback(
    (moduleId) => {
      if (!curriculumData || !curriculumData.modules) {
        return null;
      }

      const module = curriculumData.modules[moduleId];
      if (!module) {
        return null;
      }

      return {
        ...module,
        progress: calculateModuleProgress(moduleId),
        status: getModuleStatus(moduleId),
        isExpanded: expandedModules.has(moduleId),
        missingPrerequisites: getMissingPrerequisites(moduleId),
      };
    },
    [
      curriculumData,
      calculateModuleProgress,
      getModuleStatus,
      expandedModules,
      getMissingPrerequisites,
    ]
  );

  // Retornar todas las funciones y estados
  return {
    // Funciones de cálculo
    calculateModuleProgress,
    arePrerequisitesMet,
    getModuleStatus,
    getMissingPrerequisites,
    getModuleInfo,

    // Estadísticas globales
    globalStats: calculateGlobalProgress,

    // Recomendaciones
    nextRecommendedLesson: getNextRecommendedLesson,

    // Handlers de navegación
    handleModuleClick,
    handleLessonClick,

    // Control de expansión
    expandedModules,
    toggleModuleExpansion,
    isModuleExpanded,
    expandAllModules,
    collapseAllModules,
  };
};

export default useProgressTree;

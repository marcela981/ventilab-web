import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * useUserProgress - Hook para manejo completo del progreso del usuario
 *
 * Este hook maneja el tracking detallado del progreso del usuario en todos los módulos,
 * con funcionalidad extendida para el Módulo 3 (Configuración y Manejo) que incluye
 * tracking de categorías, subcategorías, protocolos, checklists, y ejercicios de troubleshooting.
 *
 * Persistencia: Los datos se guardan automáticamente en localStorage bajo la clave 'ventilab_user_progress'.
 * En el futuro, esto puede extenderse para sincronizar con un backend.
 *
 * @returns {Object} Estado y funciones para manejar el progreso del usuario
 */
const useUserProgress = () => {
  const STORAGE_KEY = 'ventilab_user_progress';

  // Estado inicial del progreso
  const initialState = {
    // Lecciones completadas globales (formato: "moduleId-lessonId")
    completedLessons: [],

    // Progreso específico del Módulo 3 por categoría
    categoryProgress: {
      pathologyProtocols: {
        lessonsCompleted: [],
        totalLessons: 4,
        percentComplete: 0,
        lastAccessed: null,
        checklistsCompleted: [],
        protocolsStudied: [],
        troubleshootingExercisesDone: []
      },
      protectiveStrategies: {
        lessonsCompleted: [],
        totalLessons: 4,
        percentComplete: 0,
        lastAccessed: null,
        checklistsCompleted: [],
        protocolsStudied: [],
        troubleshootingExercisesDone: []
      },
      weaning: {
        lessonsCompleted: [],
        totalLessons: 4,
        percentComplete: 0,
        lastAccessed: null,
        checklistsCompleted: [],
        protocolsStudied: [],
        troubleshootingExercisesDone: []
      },
      troubleshooting: {
        lessonsCompleted: [],
        totalLessons: 6,
        percentComplete: 0,
        lastAccessed: null,
        checklistsCompleted: [],
        protocolsStudied: [],
        troubleshootingExercisesDone: []
      },
      protocols: {
        lessonsCompleted: [],
        totalLessons: 3,
        percentComplete: 0,
        lastAccessed: null,
        checklistsCompleted: [],
        protocolsStudied: [],
        troubleshootingExercisesDone: []
      }
    },

    // Tracking de protocolos críticos estudiados
    criticalProtocolsStudied: {
      sdra: false,
      pneumonia: false,
      copd: false,
      asthma: false
    },

    // Achievements y badges
    achievements: {
      allPathologyProtocolsComplete: false,
      allTroubleshootingComplete: false,
      preExtubationChecklistMastery: false, // Completado 3 veces
      readyForEvaluation: false
    },

    // Metadata
    totalTimeSpent: 0, // minutos
    lastUpdated: null,
    moduleThreeStartDate: null
  };

  // Estado del hook
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge con initialState para asegurar que nuevas propiedades existan
        return {
          ...initialState,
          ...parsed,
          categoryProgress: {
            ...initialState.categoryProgress,
            ...parsed.categoryProgress
          },
          criticalProtocolsStudied: {
            ...initialState.criticalProtocolsStudied,
            ...parsed.criticalProtocolsStudied
          },
          achievements: {
            ...initialState.achievements,
            ...parsed.achievements
          }
        };
      }
    } catch (error) {
      console.error('Error loading progress from localStorage:', error);
    }
    return initialState;
  });

  // Efecto para persistir cambios en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving progress to localStorage:', error);
      // En producción, aquí se podría notificar al usuario
    }
  }, [progress]);

  /**
   * Marca una lección como completada en una categoría del Módulo 3
   * @param {string} moduleId - ID del módulo (ej: "module-03-configuration")
   * @param {string} categoryId - ID de la categoría (ej: "pathologyProtocols")
   * @param {string} lessonId - ID de la lección (ej: "sdra-protocol")
   */
  const markCategoryLessonComplete = useCallback((moduleId, categoryId, lessonId) => {
    setProgress(prev => {
      const lessonKey = `${moduleId}-${lessonId}`;

      // Actualizar completedLessons global si no existe
      const completedLessons = prev.completedLessons.includes(lessonKey)
        ? prev.completedLessons
        : [...prev.completedLessons, lessonKey];

      // Actualizar progreso de categoría
      const categoryData = prev.categoryProgress[categoryId];
      if (!categoryData) return prev;

      const lessonsCompleted = categoryData.lessonsCompleted.includes(lessonId)
        ? categoryData.lessonsCompleted
        : [...categoryData.lessonsCompleted, lessonId];

      const percentComplete = (lessonsCompleted.length / categoryData.totalLessons) * 100;

      const updatedProgress = {
        ...prev,
        completedLessons,
        categoryProgress: {
          ...prev.categoryProgress,
          [categoryId]: {
            ...categoryData,
            lessonsCompleted,
            percentComplete,
            lastAccessed: new Date().toISOString()
          }
        },
        lastUpdated: new Date().toISOString()
      };

      // Actualizar protocolos críticos si aplica
      if (categoryId === 'pathologyProtocols') {
        const protocolMap = {
          'sdra-protocol': 'sdra',
          'pneumonia-protocol': 'pneumonia',
          'copd-protocol': 'copd',
          'asthma-protocol': 'asthma'
        };

        if (protocolMap[lessonId]) {
          updatedProgress.criticalProtocolsStudied[protocolMap[lessonId]] = true;
        }
      }

      // Verificar achievements
      updatedProgress.achievements = checkAchievements(updatedProgress);

      return updatedProgress;
    });
  }, []);

  /**
   * Marca un checklist como completado
   * @param {string} categoryId - ID de la categoría
   * @param {string} checklistId - ID del checklist
   */
  const markChecklistComplete = useCallback((categoryId, checklistId) => {
    setProgress(prev => {
      const categoryData = prev.categoryProgress[categoryId];
      if (!categoryData) return prev;

      const checklistsCompleted = categoryData.checklistsCompleted.includes(checklistId)
        ? categoryData.checklistsCompleted
        : [...categoryData.checklistsCompleted, checklistId];

      const updatedProgress = {
        ...prev,
        categoryProgress: {
          ...prev.categoryProgress,
          [categoryId]: {
            ...categoryData,
            checklistsCompleted,
            lastAccessed: new Date().toISOString()
          }
        },
        lastUpdated: new Date().toISOString()
      };

      // Verificar achievement de pre-extubación (completado 3+ veces)
      if (checklistId === 'pre-extubation-checklist') {
        const count = checklistsCompleted.filter(id => id === checklistId).length;
        if (count >= 3) {
          updatedProgress.achievements.preExtubationChecklistMastery = true;
        }
      }

      return updatedProgress;
    });
  }, []);

  /**
   * Marca un protocolo como estudiado
   * @param {string} categoryId - ID de la categoría
   * @param {string} protocolId - ID del protocolo
   */
  const markProtocolStudied = useCallback((categoryId, protocolId) => {
    setProgress(prev => {
      const categoryData = prev.categoryProgress[categoryId];
      if (!categoryData) return prev;

      const protocolsStudied = categoryData.protocolsStudied.includes(protocolId)
        ? categoryData.protocolsStudied
        : [...categoryData.protocolsStudied, protocolId];

      return {
        ...prev,
        categoryProgress: {
          ...prev.categoryProgress,
          [categoryId]: {
            ...categoryData,
            protocolsStudied,
            lastAccessed: new Date().toISOString()
          }
        },
        lastUpdated: new Date().toISOString()
      };
    });
  }, []);

  /**
   * Marca un ejercicio de troubleshooting como completado
   * @param {string} categoryId - ID de la categoría
   * @param {string} exerciseId - ID del ejercicio
   */
  const markTroubleshootingExerciseDone = useCallback((categoryId, exerciseId) => {
    setProgress(prev => {
      const categoryData = prev.categoryProgress[categoryId];
      if (!categoryData) return prev;

      const troubleshootingExercisesDone = categoryData.troubleshootingExercisesDone.includes(exerciseId)
        ? categoryData.troubleshootingExercisesDone
        : [...categoryData.troubleshootingExercisesDone, exerciseId];

      return {
        ...prev,
        categoryProgress: {
          ...prev.categoryProgress,
          [categoryId]: {
            ...categoryData,
            troubleshootingExercisesDone,
            lastAccessed: new Date().toISOString()
          }
        },
        lastUpdated: new Date().toISOString()
      };
    });
  }, []);

  /**
   * Obtiene el progreso de una categoría específica
   * @param {string} categoryId - ID de la categoría
   * @returns {Object} Datos de progreso de la categoría
   */
  const getCategoryProgress = useCallback((categoryId) => {
    return progress.categoryProgress[categoryId] || null;
  }, [progress]);

  /**
   * Obtiene estadísticas agregadas del Módulo 3 completo
   * @returns {Object} Estadísticas del Módulo 3
   */
  const getModuleThreeProgress = useCallback(() => {
    const categories = Object.values(progress.categoryProgress);

    const totalLessons = categories.reduce((sum, cat) => sum + cat.totalLessons, 0);
    const completedLessons = categories.reduce((sum, cat) => sum + cat.lessonsCompleted.length, 0);
    const overallPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    const totalChecklists = categories.reduce((sum, cat) => sum + cat.checklistsCompleted.length, 0);
    const totalProtocols = categories.reduce((sum, cat) => sum + cat.protocolsStudied.length, 0);
    const totalTroubleshooting = categories.reduce((sum, cat) => sum + cat.troubleshootingExercisesDone.length, 0);

    // Calcular categorías completas
    const categoriesComplete = categories.filter(cat => cat.percentComplete === 100).length;

    // Verificar protocolos críticos
    const criticalProtocolsCount = Object.values(progress.criticalProtocolsStudied).filter(Boolean).length;
    const allCriticalProtocolsStudied = criticalProtocolsCount === 4;

    return {
      overallPercent,
      totalLessons,
      completedLessons,
      categoriesComplete,
      totalCategories: categories.length,
      totalChecklists,
      totalProtocols,
      totalTroubleshooting,
      criticalProtocolsCount,
      allCriticalProtocolsStudied,
      achievements: progress.achievements,
      startDate: progress.moduleThreeStartDate,
      lastUpdated: progress.lastUpdated
    };
  }, [progress]);

  /**
   * Verifica y actualiza achievements basados en el progreso actual
   * @param {Object} currentProgress - Estado actual del progreso
   * @returns {Object} Achievements actualizados
   */
  const checkAchievements = (currentProgress) => {
    const achievements = { ...currentProgress.achievements };

    // Achievement: Todos los protocolos de patologías completados
    const pathologyComplete = currentProgress.categoryProgress.pathologyProtocols.percentComplete === 100;
    achievements.allPathologyProtocolsComplete = pathologyComplete;

    // Achievement: Todos los troubleshooting completados
    const troubleshootingComplete = currentProgress.categoryProgress.troubleshooting.percentComplete === 100;
    achievements.allTroubleshootingComplete = troubleshootingComplete;

    // Achievement: Listo para evaluación (verificado por readiness criteria)
    const readinessCriteria = checkReadinessCriteria(currentProgress);
    achievements.readyForEvaluation = readinessCriteria.isReady;

    return achievements;
  };

  /**
   * Verifica si el usuario cumple los criterios para comenzar evaluaciones
   * @param {Object} currentProgress - Estado actual del progreso
   * @returns {Object} Resultado de readiness check
   */
  const checkReadinessCriteria = (currentProgress) => {
    const criteria = [];
    let metCount = 0;

    // Criterio 1: 80% de lecciones en Protocolos por Patología
    const pathologyPercent = currentProgress.categoryProgress.pathologyProtocols.percentComplete;
    const pathologyCriteriaMet = pathologyPercent >= 80;
    criteria.push({
      id: 'pathology-protocols',
      description: 'Completar al menos 80% de protocolos por patología',
      met: pathologyCriteriaMet,
      progress: pathologyPercent
    });
    if (pathologyCriteriaMet) metCount++;

    // Criterio 2: Todos los protocolos críticos estudiados
    const criticalProtocolsMet = Object.values(currentProgress.criticalProtocolsStudied).every(Boolean);
    criteria.push({
      id: 'critical-protocols',
      description: 'Estudiar todos los protocolos críticos (SDRA, neumonía, EPOC, asma)',
      met: criticalProtocolsMet,
      progress: criticalProtocolsMet ? 100 : 0
    });
    if (criticalProtocolsMet) metCount++;

    // Criterio 3: Estrategias de protección pulmonar completadas
    const protectivePercent = currentProgress.categoryProgress.protectiveStrategies.percentComplete;
    const protectiveCriteriaMet = protectivePercent === 100;
    criteria.push({
      id: 'protective-strategies',
      description: 'Completar todas las lecciones de estrategias de protección pulmonar',
      met: protectiveCriteriaMet,
      progress: protectivePercent
    });
    if (protectiveCriteriaMet) metCount++;

    // Criterio 4: Al menos 4 ejercicios de troubleshooting practicados
    const troubleshootingCount = currentProgress.categoryProgress.troubleshooting.troubleshootingExercisesDone.length;
    const troubleshootingCriteriaMet = troubleshootingCount >= 4;
    criteria.push({
      id: 'troubleshooting-practice',
      description: 'Practicar al menos 4 ejercicios de troubleshooting',
      met: troubleshootingCriteriaMet,
      progress: Math.min((troubleshootingCount / 4) * 100, 100)
    });
    if (troubleshootingCriteriaMet) metCount++;

    const isReady = metCount >= 3; // Requiere al menos 3 de 4 criterios

    return {
      isReady,
      criteria,
      metCount,
      totalCriteria: criteria.length,
      readinessPercent: (metCount / criteria.length) * 100
    };
  };

  /**
   * Verifica los criterios de preparación para evaluación
   * @returns {Object} Estado de preparación
   */
  const getReadinessStatus = useCallback(() => {
    return checkReadinessCriteria(progress);
  }, [progress]);

  /**
   * Reinicia el progreso (útil para testing o reset)
   */
  const resetProgress = useCallback(() => {
    setProgress(initialState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * Actualiza el tiempo total gastado
   * @param {number} minutes - Minutos a agregar
   */
  const updateTimeSpent = useCallback((minutes) => {
    setProgress(prev => ({
      ...prev,
      totalTimeSpent: prev.totalTimeSpent + minutes,
      lastUpdated: new Date().toISOString()
    }));
  }, []);

  /**
   * Inicializa el inicio del Módulo 3 si no existe
   */
  const initializeModuleThree = useCallback(() => {
    setProgress(prev => {
      if (prev.moduleThreeStartDate) return prev;
      return {
        ...prev,
        moduleThreeStartDate: new Date().toISOString()
      };
    });
  }, []);

  // Valor memoizado para retornar
  const value = useMemo(() => ({
    // Estado
    progress,

    // Funciones de actualización
    markCategoryLessonComplete,
    markChecklistComplete,
    markProtocolStudied,
    markTroubleshootingExerciseDone,
    updateTimeSpent,

    // Funciones de consulta
    getCategoryProgress,
    getModuleThreeProgress,
    getReadinessStatus,

    // Utilidades
    initializeModuleThree,
    resetProgress
  }), [
    progress,
    markCategoryLessonComplete,
    markChecklistComplete,
    markProtocolStudied,
    markTroubleshootingExerciseDone,
    updateTimeSpent,
    getCategoryProgress,
    getModuleThreeProgress,
    getReadinessStatus,
    initializeModuleThree,
    resetProgress
  ]);

  return value;
};

export default useUserProgress;

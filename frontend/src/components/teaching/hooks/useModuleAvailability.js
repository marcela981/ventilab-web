import { useCallback, useMemo } from 'react';
import { curriculumData } from '../../../data/curriculumData';

/**
 * useModuleAvailability - Hook personalizado para manejo de disponibilidad de módulos
 * 
 * Proporciona funciones para verificar la disponibilidad de módulos basándose
 * en prerequisites y otras condiciones del curriculum.
 * 
 * @param {Function} calculateModuleProgress - Función para calcular progreso de módulo
 * @returns {Object} Objeto con funciones de disponibilidad
 */
const useModuleAvailability = (calculateModuleProgress) => {
  
  /**
   * Verifica si un módulo está disponible basándose en prerequisites
   * @param {string} moduleId - ID del módulo
   * @returns {boolean} True si el módulo está disponible
   */
  const isModuleAvailable = useCallback((moduleId) => {
    // ⚠️ TEMPORAL PARA TESTING: Prerequisites deshabilitados
    // TODO: Revertir esto en producción para habilitar el sistema de prerequisites
    // Esto permite que todos los módulos (beginner, intermediate, advanced)
    // sean accesibles inmediatamente sin completar módulos previos
    return true;

    /* CÓDIGO ORIGINAL - Descomentar para producción:
    const module = curriculumData.modules[moduleId];
    if (!module) return false;
    
    // Si no tiene prerequisites, está disponible
    if (!module.prerequisites || module.prerequisites.length === 0) {
      return true;
    }

    // Verificar que todos los prerequisites estén completados al 75%
    return module.prerequisites.every(prereqId => {
      const prereqProgress = calculateModuleProgress(prereqId);
      return prereqProgress >= 75;
    });
    */
  }, [calculateModuleProgress]);

  /**
   * Obtiene el próximo módulo disponible para continuar aprendiendo
   * @returns {Object|null} Próximo módulo disponible o null
   */
  const getNextAvailableModule = useMemo(() => {
    const allModules = Object.values(curriculumData.modules).sort((a, b) => {
      const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      if (levelOrder[a.level] !== levelOrder[b.level]) {
        return levelOrder[a.level] - levelOrder[b.level];
      }
      return a.order - b.order;
    });

    return allModules.find(module => {
      const progress = calculateModuleProgress(module.id);
      return progress > 0 && progress < 100 && isModuleAvailable(module.id);
    });
  }, [calculateModuleProgress, isModuleAvailable]);

  /**
   * Obtiene el mensaje de tooltip para un módulo bloqueado
   * @param {Object} module - Objeto del módulo
   * @param {number} progress - Progreso del módulo
   * @returns {string} Mensaje de tooltip
   */
  const getTooltipMessage = useCallback((module, progress) => {
    const available = isModuleAvailable(module.id);
    
    if (available) {
      return `Disponible - ${progress.toFixed(0)}% completado`;
    }
    
    const incompletePrereqs = module.prerequisites?.filter(prereqId => {
      const prereqProgress = calculateModuleProgress(prereqId);
      return prereqProgress < 75;
    }) || [];
    
    if (incompletePrereqs.length > 0) {
      const prereqTitles = incompletePrereqs.map(id => 
        curriculumData.modules[id]?.title || id
      );
      return `Completa al 75%: ${prereqTitles.join(', ')}`;
    }
    
    return 'Módulo bloqueado';
  }, [isModuleAvailable, calculateModuleProgress]);

  /**
   * Obtiene el estado de un módulo
   * @param {Object} module - Objeto del módulo
   * @param {number} progress - Progreso del módulo
   * @returns {string} Estado del módulo
   */
  const getModuleStatus = useCallback((module, progress) => {
    const available = isModuleAvailable(module.id);
    
    if (progress === 100) return 'completed';
    if (progress > 0) return 'in-progress';
    if (available) return 'available';
    return 'locked';
  }, [isModuleAvailable]);

  return {
    isModuleAvailable,
    getNextAvailableModule,
    getTooltipMessage,
    getModuleStatus
  };
};

export default useModuleAvailability;

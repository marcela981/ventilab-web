/**
 * Curriculum Data Structure for Mechanical Ventilation Learning Platform
 * Separated from visual components - pure data structure
 * Based on detailed research curriculum for mechanical ventilation
 */

import { respiratoriaModules } from '@/features/ensenanza/curriculum/ensenanzaRespiratoria/modules';
import { preRequisitosModules } from '@/features/ensenanza/curriculum/preRequisitos/modules';
import { ventylabModules } from '@/features/ensenanza/curriculum/ensenanzaVentylab/modules';

export const curriculumData = {
  levels: [
    {
      id: 'prerequisitos',
      title: 'Prerequisitos',
      description: 'Condiciones de introducción para la simulación dinámica',
      color: '#9E9E9E',
      emoji: '📚',
      estimatedDuration: 'Variable',
      mandatory: false
    },
    {
      id: 'beginner',
      title: 'Nivel Principiante',
      description: 'Fundamentos fisiológicos y conceptos básicos de ventilación mecánica',
      color: '#4CAF50',
      emoji: '🌱',
      estimatedDuration: '20-25 horas'
    },
    {
      id: 'intermediate',
      title: 'Nivel Intermedio',
      description: 'Modalidades ventilatorias y manejo de parámetros críticos',
      color: '#FF9800',
      emoji: '🎯',
      estimatedDuration: '30-35 horas'
    },
    {
      id: 'advanced',
      title: 'Nivel Avanzado',
      description: 'Estrategias especializadas y casos clínicos complejos',
      color: '#F44336',
      emoji: '🚀',
      estimatedDuration: '25-30 horas'
    }
  ],

  modules: {
    ...respiratoriaModules,
    ...preRequisitosModules,
    ...ventylabModules,
  },

  metadata: {
    lastUpdated: '2024-01-15',
    version: '1.0',
    difficultyProgression: {
      beginner: 'Conceptos fundamentales y fisiología básica',
      intermediate: 'Modalidades ventilatorias y parámetros',
      advanced: 'Estrategias especializadas y casos complejos'
    },
    assessmentStrategy: {
      formative: 'Quizzes formativos después de cada módulo',
      summative: 'Evaluaciones al final de cada nivel',
      practical: 'Simulaciones y casos clínicos'
    }
  }
};

// Funciones auxiliares para acceder a los datos
export const getModuleById = (moduleId) => {
  return curriculumData.modules[moduleId] || null;
};

// NOTE: getModulesByLevel is now also exported from selectors.js
// Keeping this for backward compatibility, but prefer using selectors
export const getModulesByLevel = (level) => {
  if (!curriculumData?.modules) {
    return [];
  }
  return Object.values(curriculumData.modules)
    .filter(module => module.level === level)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const getPrerequisites = (moduleId) => {
  const module = getModuleById(moduleId);
  if (!module) return [];
  
  return module.prerequisites.map(prereqId => getModuleById(prereqId)).filter(Boolean);
};

export const getNextModule = (moduleId) => {
  const module = getModuleById(moduleId);
  if (!module) return null;
  
  const modulesInLevel = getModulesByLevel(module.level);
  const currentIndex = modulesInLevel.findIndex(m => m.id === moduleId);
  
  if (currentIndex < modulesInLevel.length - 1) {
    return modulesInLevel[currentIndex + 1];
  }
  
  return null;
};

/**
 * DEPRECATED: This function uses completedModules array (flag-based).
 * For correct level progress calculation, use levelProgressAggregated from LearningProgressContext
 * which uses the formula: sum(moduleProgress) / totalModules
 * 
 * This function is kept for backward compatibility but should not be used for level progress display.
 */
export const getLevelProgress = (completedModules) => {
  const progress = {};
  
  curriculumData.levels.forEach(level => {
    const modulesInLevel = getModulesByLevel(level.id);
    const completedInLevel = completedModules.filter(id => {
      const module = getModuleById(id);
      return module && module.level === level.id;
    });
    
    // NOTE: This uses completedModules count, not average of progress values
    // For correct calculation, use levelProgressAggregated from LearningProgressContext
    progress[level.id] = {
      total: modulesInLevel.length,
      completed: completedInLevel.length,
      percentage: modulesInLevel.length > 0 
        ? (completedInLevel.length / modulesInLevel.length) * 100 
        : 0
    };
  });
  
  return progress;
};

export default curriculumData;

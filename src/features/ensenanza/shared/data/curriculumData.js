/**
 * Curriculum Data Structure for Mechanical Ventilation Learning Platform
 * Separated from visual components - pure data structure
 * Based on detailed research curriculum for mechanical ventilation
 *
 * MIGRATION STATUS:
 *   - Synchronous export (`curriculumData`) keeps the static data as a fallback.
 *   - `loadCurriculumData()` fetches from the backend API (DB is source of truth).
 *   - Components should prefer `loadCurriculumData()` and fall back to this export
 *     only if the API call fails or has not completed yet.
 *
 * Autor   : Marcela Mazo Castro
 * Proyecto: VentyLab
 */

import { respiratoriaModules } from '@/features/ensenanza/curriculum/ensenanzaRespiratoria/modules';
import { preRequisitosModules } from '@/features/ensenanza/curriculum/preRequisitos/modules';
import { ventylabModules } from '@/features/ensenanza/curriculum/ensenanzaVentylab/modules';

// ─── Async loader (DB-backed, replaces static imports) ───────────────────────
// Import lazily to avoid circular deps and to allow tree-shaking in static paths.
let _curriculumServiceImport = null;

/**
 * Fetch the full curriculum from the backend API.
 * Returns the same shape as `curriculumData` so callers can swap seamlessly.
 * On error, logs a warning and returns the static fallback.
 *
 * @returns {Promise<typeof curriculumData>}
 */
export async function loadCurriculumData() {
  try {
    if (!_curriculumServiceImport) {
      _curriculumServiceImport = await import(
        '@/features/ensenanza/shared/services/curriculumService'
      );
    }
    const { fetchCurriculum } = _curriculumServiceImport;
    const apiData = await fetchCurriculum();

    return {
      levels: apiData.levels,
      modules: apiData.modules,
      metadata: apiData.metadata,
    };
  } catch (err) {
    console.warn(
      '[VentyLab] loadCurriculumData: API fetch failed, falling back to static data.',
      err
    );
    return curriculumData;
  }
}

// ─── Synchronous static export (kept for backward compatibility) ──────────────
// Components that still use the synchronous import will continue to work.
// When the API is not yet loaded, they see the static data.
// Set this to empty arrays/objects AFTER the API is verified working and
// all components have been migrated to loadCurriculumData().
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

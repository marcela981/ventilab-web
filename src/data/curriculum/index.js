/**
 * =============================================================================
 * Curriculum Modules Index
 * =============================================================================
 * This file merges base modules from curriculumData.js with generated
 * placeholder modules to create a complete curriculum roadmap.
 *
 * Base modules: Real modules with content (from curriculumData.js)
 * Generated modules: Placeholder modules "coming soon" (from modules.generated.js)
 * =============================================================================
 */

// Import base modules from curriculumData.js
import { curriculumData } from '../curriculumData.js';

// Import metadata to determine strategy
import curriculumMeta from './meta.js';

// Import module03Content to count virtual lessons (legacy, now handled by getVisibleLessonsByLevel)
import module03Content from '../lessons/module-03-configuration/index.js';

const metadata = curriculumMeta || { strategy: 'data-driven', declaredTotal: null };

// Only import placeholder modules if strategy is "roadmap" (not "data-driven")
// For "data-driven" strategy, we only show real modules and ignore modules.generated
// Note: Placeholder modules are not loaded for data-driven strategy
let generatedModulesData = { modules: [] };

// For data-driven strategy, we explicitly ignore modules.generated
// This ensures that only real modules from curriculumData are used
// Lazy load placeholder modules only when needed (for roadmap strategy)
// This is done inside getAllModules() to avoid top-level await issues

/**
 * Get all modules (base only for data-driven strategy, base + generated for roadmap strategy)
 * @returns {Array} Array of all modules
 */
export function getAllModules() {
  const baseModules = Object.values(curriculumData.modules || {});
  
  // Filter out duplicate/compatibility modules
  // Exclude modules that are duplicates or compatibility wrappers
  // These modules are kept for backward compatibility but shouldn't be counted in totals
  // Based on curriculum structure analysis:
  // - 'respiratory-anatomy': duplicate/compatibility wrapper (content is in module-01-fundamentals)
  // Keep only unique modules that represent actual distinct content
  // Note: respiratory-physiology is now in prerequisitos level, so it should be included
  const excludedIds = ['respiratory-anatomy']; // Modules to exclude (duplicates/compatibility)
  
  const uniqueModules = baseModules.filter(module => {
    // Exclude duplicates/compatibility modules
    if (excludedIds.includes(module.id)) {
      return false;
    }
    return true;
  });
  
  // Normalize base modules: ensure status and isPlaceholder are set
  const normalizedBaseModules = uniqueModules.map(module => ({
    ...module,
    status: module.status || 'available', // Default to 'available' if not set
    isPlaceholder: module.isPlaceholder || false, // Default to false if not set
  }));
  
  // Only include placeholders if strategy is "roadmap"
  // For "data-driven" strategy, only return real modules and ignore modules.generated
  // This ensures that modules.generated is completely ignored when strategy is 'data-driven'
  let allModules = normalizedBaseModules;
  
  // For roadmap strategy: would include placeholder modules (async loading needed)
  // Note: Currently not implemented, but structure is ready for it
  // For data-driven strategy: modules.generated is completely ignored (allModules = normalizedBaseModules)
  
  // Sort by level and order
  const levelOrder = { prerequisitos: 0, beginner: 1, intermediate: 2, advanced: 3 };
  allModules.sort((a, b) => {
    const levelDiff = (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99);
    if (levelDiff !== 0) return levelDiff;
    return (a.order || 0) - (b.order || 0);
  });
  
  return allModules;
}

/**
 * Get modules as object (keyed by ID)
 * @returns {Object} Object with module IDs as keys
 */
export function getModulesObject() {
  const allModules = getAllModules();
  const modulesObject = {};
  
  allModules.forEach(module => {
    modulesObject[module.id] = module;
  });
  
  return modulesObject;
}

/**
 * Get total module count
 * @returns {number} Total number of modules
 */
export function getModulesCount() {
  return getAllModules().length;
}

/**
 * Get modules by level
 * @param {string} level - Level to filter (beginner, intermediate, advanced)
 * @returns {Array} Array of modules for the specified level
 */
export function getModulesByLevel(level) {
  return getAllModules().filter(module => module.level === level);
}

/**
 * Get modules by status
 * @param {string} status - Status to filter (available, locked, coming_soon)
 * @returns {Array} Array of modules with the specified status
 */
export function getModulesByStatus(status) {
  return getAllModules().filter(module => {
    if (status === 'coming_soon') {
      return module.status === 'coming_soon' || module.isPlaceholder === true;
    }
    return module.status === status;
  });
}

/**
 * Get placeholder modules
 * @returns {Array} Array of placeholder modules
 */
export function getPlaceholderModules() {
  return getAllModules().filter(module => module.isPlaceholder === true);
}

/**
 * Check if a module is coming soon
 * @param {string} moduleId - Module ID to check
 * @returns {boolean} True if module is coming soon
 */
export function isModuleComingSoon(moduleId) {
  const module = getModulesObject()[moduleId];
  return module?.status === 'coming_soon' || module?.isPlaceholder === true;
}

/**
 * Get module by ID
 * @param {string} moduleId - Module ID
 * @returns {Object|null} Module object or null if not found
 */
export function getModuleById(moduleId) {
  return getModulesObject()[moduleId] || null;
}

/**
 * Get curriculum metadata with computed totals
 * Computes totals exclusively from selectors:
 * - Modules: real modules from getAllModules() (excludes placeholders when strategy is data-driven)
 * - Lessons: uses getVisibleLessonsByLevel to count visible lessons (excludes allowEmpty from totals)
 * @returns {Object} Metadata object with computed totals
 */
export function getCurriculumMetadata() {
  const allModules = getAllModules();
  const placeholderModules = getPlaceholderModules();
  const availableModules = allModules.filter(m => !m.isPlaceholder);
  
  // Count lessons using buildLessonsArray logic (same as getVisibleLessonsByLevel but without circular dependency)
  // This replaces the old method of counting from modules.lessons and module03Content
  // Note: We duplicate the logic here to avoid circular dependency with selectors.js
  const allLevels = ['beginner', 'intermediate', 'advanced'];
  let totalLessons = 0;
  let totalEstimatedTimeMinutes = 0;
  
  // Count lessons from modules (same logic as getVisibleLessonsByLevel but inline)
  allLevels.forEach(levelId => {
    const modulesInLevel = allModules.filter(module => module.level === levelId);
    
    modulesInLevel.forEach(module => {
      if (!module.lessons || module.lessons.length === 0) {
        return;
      }
      
      module.lessons.forEach(lesson => {
        let sections = [];
        if (lesson.lessonData && lesson.lessonData.sections) {
          sections = lesson.lessonData.sections;
        } else if (lesson.sections) {
          sections = lesson.sections;
        }
        
        const metadata = lesson.lessonData?.metadata || lesson.metadata || {};
        const allowEmpty = metadata.allowEmpty === true;
        
        // Only count completable lessons (exclude allowEmpty and empty lessons)
        if (sections.length > 0 && !allowEmpty) {
          totalLessons++;
          totalEstimatedTimeMinutes += lesson.estimatedTime || lesson.lessonData?.estimatedTime || 0;
        }
      });
    });
    
    // Count virtual lessons from M03 (only for advanced level)
    if (levelId === 'advanced' && module03Content) {
      // Count pathology protocols
      if (module03Content.pathologyProtocols) {
        Object.values(module03Content.pathologyProtocols).forEach(lesson => {
          if (lesson && lesson.title && lesson.sections && lesson.sections.length > 0) {
            const metadata = lesson.metadata || {};
            if (!metadata.allowEmpty) {
              totalLessons++;
              totalEstimatedTimeMinutes += lesson.estimatedTime || 0;
            }
          }
        });
      }
      
      // Count protective strategies
      if (module03Content.protectiveStrategies) {
        Object.values(module03Content.protectiveStrategies).forEach(lesson => {
          if (lesson && lesson.title && lesson.sections && lesson.sections.length > 0) {
            const metadata = lesson.metadata || {};
            if (!metadata.allowEmpty) {
              totalLessons++;
              totalEstimatedTimeMinutes += lesson.estimatedTime || 0;
            }
          }
        });
      }
      
      // Count weaning content
      if (module03Content.weaningContent) {
        Object.values(module03Content.weaningContent).forEach(lesson => {
          if (lesson && lesson.title && lesson.sections && lesson.sections.length > 0) {
            const metadata = lesson.metadata || {};
            if (!metadata.allowEmpty) {
              totalLessons++;
              totalEstimatedTimeMinutes += lesson.estimatedTime || 0;
            }
          }
        });
      }
    }
  });
  
  // Calculate estimated time from lesson estimatedTime (in minutes)
  const totalHours = Math.ceil(totalEstimatedTimeMinutes / 60);
  const estimatedTotalTime = totalHours > 0 
    ? `${totalHours}-${totalHours + Math.ceil(totalLessons * 0.1)} horas`
    : 'Próximamente';
  
  return {
    totalModules: allModules.length,
    availableModules: availableModules.length,
    placeholderModules: placeholderModules.length,
    totalLessons,
    estimatedTotalTime,
    lastUpdated: curriculumData.metadata?.lastUpdated || new Date().toISOString().split('T')[0],
    version: curriculumData.metadata?.version || '1.0',
  };
}

/**
 * Get levels with computed totals
 * @returns {Array} Array of levels with computed module counts
 */
export function getLevelsWithComputedTotals() {
  const levels = curriculumData.levels || [];
  
  return levels.map(level => {
    const modules = getModulesByLevel(level.id);
    const availableModules = modules.filter(m => !m.isPlaceholder);
    const placeholderModules = modules.filter(m => m.isPlaceholder);
    
    return {
      ...level,
      totalModules: modules.length,
      availableModules: availableModules.length,
      placeholderModules: placeholderModules.length,
    };
  });
}

/**
 * Get level progress based on completed lessons
 * Uses filtered modules (excludes duplicates like respiratory-physiology)
 * @param {Array<string>} completedLessons - Array of completed lesson IDs in format "moduleId-lessonId"
 * @returns {Object} Object with progress by level (total, completed, percentage)
 */
export function getLevelProgress(completedLessons) {
  const progress = {};
  const levels = curriculumData.levels || [];
  
  // Convert completedLessons Set/Array to Set for efficient lookup
  const completedLessonsSet = new Set(completedLessons);
  
  levels.forEach(level => {
    // Use filtered modules (excludes duplicates)
    const modulesInLevel = getModulesByLevel(level.id);
    
    // Calculate level progress as average of module progress values
    // Formula: sum(moduleProgress) / totalModules
    // This allows partial module progress to contribute proportionally
    let moduleProgressSum = 0;
    let completedModules = 0; // Count for display purposes only
    
    modulesInLevel.forEach(module => {
      if (!module.lessons || module.lessons.length === 0) {
        // Modules without lessons contribute 0 to progress
        moduleProgressSum += 0;
        return;
      }
      
      // Calculate module progress: completedLessons / totalLessons
      const totalLessons = module.lessons.length;
      const completedLessons = module.lessons.filter(lesson => 
        completedLessonsSet.has(`${module.id}-${lesson.id}`)
      ).length;
      
      // Module progress value (0-1)
      const moduleProgressValue = totalLessons > 0 ? (completedLessons / totalLessons) : 0;
      
      // Add to sum for level progress calculation
      moduleProgressSum += moduleProgressValue;
      
      // Count completed modules (progress === 1) for display purposes
      if (moduleProgressValue === 1) {
        completedModules++;
      }
    });
    
    // Level progress = average of module progress values
    const totalModules = modulesInLevel.length;
    const levelProgress = totalModules > 0 ? (moduleProgressSum / totalModules) : 0;
    
    progress[level.id] = {
      total: totalModules,
      completed: completedModules,
      percentage: Math.round(levelProgress * 100)
    };
  });
  
  return progress;
}

// Export default: modules object for backward compatibility
export default {
  modules: getModulesObject(),
  getAllModules,
  getModulesObject,
  getModulesCount,
  getModulesByLevel,
  getModulesByStatus,
  getPlaceholderModules,
  isModuleComingSoon,
  getModuleById,
  getCurriculumMetadata,
  getLevelsWithComputedTotals,
  getLevelProgress,
};

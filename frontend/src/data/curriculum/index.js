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

const metadata = curriculumMeta || { strategy: 'data-driven', declaredTotal: null };

// Only import placeholder modules if strategy is "roadmap" (not "data-driven")
// For "data-driven" strategy, we only show real modules
// Note: Placeholder modules are not loaded for data-driven strategy
let generatedModulesData = { modules: [] };

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
  // - 'respiratory-physiology': duplicate/compatibility (content overlaps with module-01-fundamentals)
  // Keep only unique modules that represent actual distinct content
  const excludedIds = ['respiratory-anatomy', 'respiratory-physiology']; // Modules to exclude (duplicates/compatibility)
  
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
  // For "data-driven" strategy, only return real modules
  // Note: For roadmap strategy, placeholder modules should be loaded asynchronously
  // For now, we only return base modules since strategy is "data-driven"
  // If roadmap strategy is needed, implement async loading in the component that uses this
  const allModules = normalizedBaseModules;
  
  // Sort by level and order
  const levelOrder = { beginner: 1, intermediate: 2, advanced: 3 };
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
 * @returns {Object} Metadata object with computed totals
 */
export function getCurriculumMetadata() {
  const allModules = getAllModules();
  const placeholderModules = getPlaceholderModules();
  const availableModules = allModules.filter(m => !m.isPlaceholder);
  
  // Count lessons
  const totalLessons = allModules.reduce((acc, module) => {
    return acc + (module.lessons?.length || 0);
  }, 0);
  
  // Calculate estimated time (only for available modules)
  const estimatedTimes = availableModules
    .map(m => {
      if (m.duration) {
        const hours = Math.ceil(m.duration / 60);
        return hours;
      }
      return 0;
    })
    .filter(t => t > 0);
  
  const totalHours = estimatedTimes.reduce((acc, hours) => acc + hours, 0);
  const estimatedTotalTime = totalHours > 0 
    ? `${totalHours}-${totalHours + Math.ceil(estimatedTimes.length * 0.5)} horas`
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
};

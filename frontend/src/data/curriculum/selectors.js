/**
 * Curriculum Selectors
 * Utility functions to extract and compute data from curriculum structure
 * All selectors are data-driven (no hardcoded values)
 * 
 * NOTE: This file now uses the merged modules from index.js which includes
 * both base modules and generated placeholder modules.
 */

import curriculumModules from './index.js';
import { curriculumData } from '../curriculumData';

/**
 * Get total count of modules
 * Counts all modules regardless of status (includes coming_soon and placeholders)
 * 
 * @returns {number} Total number of modules
 */
export const getModulesCount = () => {
  return curriculumModules.getModulesCount();
};

/**
 * Get modules count by level
 * 
 * @param {string} level - Level ID (beginner, intermediate, advanced)
 * @returns {number} Number of modules in the level
 */
export const getModulesCountByLevel = (level) => {
  return curriculumModules.getModulesByLevel(level).length;
};

/**
 * Get modules count by status
 * 
 * @param {string} status - Module status ('active', 'coming_soon', 'placeholder')
 * @returns {number} Number of modules with the given status
 */
export const getModulesCountByStatus = (status) => {
  if (!curriculumData?.modules) {
    return 0;
  }
  
  return Object.values(curriculumData.modules).filter(module => {
    if (status === 'coming_soon') {
      return module.status === 'coming_soon' || module.isPlaceholder === true;
    }
    if (status === 'placeholder') {
      return module.isPlaceholder === true;
    }
    // active: not coming_soon and not placeholder
    return module.status !== 'coming_soon' && module.isPlaceholder !== true;
  }).length;
};

/**
 * Get active modules count (excludes coming_soon and placeholders)
 * 
 * @returns {number} Number of active modules
 */
export const getActiveModulesCount = () => {
  const allModules = curriculumModules.getAllModules();
  return allModules.filter(m => !m.isPlaceholder && m.status !== 'coming_soon').length;
};

/**
 * Get all modules as array
 * 
 * @returns {Array} Array of all modules
 */
export const getAllModules = () => {
  return curriculumModules.getAllModules();
};

/**
 * Get modules by level as array
 * 
 * @param {string} level - Level ID
 * @returns {Array} Array of modules in the level
 */
export const getModulesByLevel = (level) => {
  return curriculumModules.getModulesByLevel(level);
};

/**
 * Check if module is coming soon or placeholder
 * 
 * @param {string} moduleId - Module ID
 * @returns {boolean} True if module is coming soon or placeholder
 */
export const isModuleComingSoon = (moduleId) => {
  return curriculumModules.isModuleComingSoon(moduleId);
};

/**
 * Get module metadata with computed totals
 * This replaces the hardcoded metadata in curriculumData
 * 
 * @returns {Object} Metadata object with computed values
 */
export const getCurriculumMetadata = () => {
  return curriculumModules.getCurriculumMetadata();
};

/**
 * Get level metadata with computed totals
 * Replaces hardcoded totalModules in levels array
 * 
 * @returns {Array} Levels array with computed totalModules
 */
export const getLevelsWithComputedTotals = () => {
  return curriculumModules.getLevelsWithComputedTotals();
};


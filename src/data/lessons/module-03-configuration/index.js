/**
 * Module 03: Configuration and Management - Content Exports
 * 
 * This module contains all educational content related to mechanical ventilator
 * configuration and management, including:
 * - Pathology-specific protocols
 * - Protective ventilation strategies
 * - Weaning protocols
 * - Troubleshooting guides
 * - Clinical checklists
 * 
 * All content is organized by category for easy import and use.
 */

// ============================================================================
// PATHOLOGY PROTOCOLS
// ============================================================================
// Protocolos específicos para diferentes patologías que requieren ventilación mecánica

import sdraProtocol from './pathologies/sdra-protocol.json';
import copdProtocol from './pathologies/copd-protocol.json';
import asthmaProtocol from './pathologies/asthma-protocol.json';
import pneumoniaProtocol from './pathologies/pneumonia-protocol.json';

export const pathologyProtocols = {
  sdra: sdraProtocol,
  copd: copdProtocol,
  asthma: asthmaProtocol,
  pneumonia: pneumoniaProtocol,
};

// ============================================================================
// PROTECTIVE STRATEGIES
// ============================================================================
// Estrategias de protección pulmonar para prevenir VILI (Ventilator-Induced Lung Injury)

import lowTidalVolume from './protective-strategies/low-tidal-volume.json';
import permissiveHypercapnia from './protective-strategies/permissive-hypercapnia.json';
import peepStrategies from './protective-strategies/peep-strategies.json';
import lungProtectiveVentilation from './protective-strategies/lung-protective-ventilation.json';

export const protectiveStrategies = {
  lowTidalVolume,
  permissiveHypercapnia,
  peepStrategies,
  lungProtectiveVentilation,
};

// ============================================================================
// WEANING CONTENT
// ============================================================================
// Contenido relacionado con destete ventilatorio

import readinessCriteria from './weaning/readiness-criteria.json';
import sbtProtocol from './weaning/sbt-protocol.json';

// Note: weaning-methods.json and difficult-weaning.json will be added when created
export const weaningContent = {
  readinessCriteria,
  sbtProtocol,
  // weaningMethods: will be added
  // difficultWeaning: will be added
};

// ============================================================================
// TROUBLESHOOTING GUIDES
// ============================================================================
// Guías prácticas para resolver problemas comunes durante la ventilación mecánica

// Note: All troubleshooting guides will be imported when created
export const troubleshootingGuides = {
  // highPressureAlarm: will be added
  // lowTidalVolumeAlarm: will be added
  // patientVentilatorAsynchrony: will be added
  // hypoxemiaManagement: will be added
  // hypercapniaManagement: will be added
  // hemodynamicInstability: will be added
};

// ============================================================================
// CHECKLIST PROTOCOLS
// ============================================================================
// Protocolos rápidos de referencia en formato de checklist interactivo

// Note: All checklist protocols will be imported when created
export const checklistProtocols = {
  // initialSetupChecklist: will be added
  // dailyAssessmentChecklist: will be added
  // preExtubationChecklist: will be added
};

// ============================================================================
// MODULE METADATA
// ============================================================================

import metadata from './metadata.json';

export { metadata };

// ============================================================================
// DEFAULT EXPORT
// ============================================================================
// Export all content organized by category

export default {
  pathologyProtocols,
  protectiveStrategies,
  weaningContent,
  troubleshootingGuides,
  checklistProtocols,
  metadata,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all lessons in this module
 * @returns {Array} Array of all lesson objects
 */
export function getAllLessons() {
  return [
    ...Object.values(pathologyProtocols),
    ...Object.values(protectiveStrategies),
    ...Object.values(weaningContent),
    ...Object.values(troubleshootingGuides),
    ...Object.values(checklistProtocols),
  ];
}

/**
 * Get lesson by title
 * @param {string} title - Lesson title to search for
 * @returns {Object|null} Lesson object or null if not found
 */
export function getLessonByTitle(title) {
  const allLessons = getAllLessons();
  return allLessons.find(lesson => lesson.title === title) || null;
}

/**
 * Get lessons by category
 * @param {string} category - Category name (pathologyProtocols, protectiveStrategies, etc.)
 * @returns {Object} Object containing lessons in that category
 */
export function getLessonsByCategory(category) {
  const categories = {
    pathologyProtocols,
    protectiveStrategies,
    weaningContent,
    troubleshootingGuides,
    checklistProtocols,
  };
  
  return categories[category] || {};
}


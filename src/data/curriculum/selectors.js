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
import module03Content from '../lessons/module-03-configuration';

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

/**
 * Derive lessonId from filename (slug)
 * Converts filename like "sdra-protocol.json" to "sdra-protocol"
 * 
 * @param {string} filename - Filename or path
 * @returns {string} Lesson ID slug
 */
function deriveLessonIdFromFilename(filename) {
  // Extract filename from path if needed
  const name = filename.split('/').pop().replace(/\.json$/, '');
  return name;
}

/**
 * Convert module-03-configuration JSON sections to lesson sections format
 * Each section in the JSON becomes a section in the lesson
 * 
 * @param {Array} jsonSections - Sections array from JSON file
 * @returns {Array} Formatted sections array
 */
function convertSectionsToLessonFormat(jsonSections) {
  if (!Array.isArray(jsonSections)) {
    return [];
  }
  
  return jsonSections.map((section, index) => {
    // Use the section's id if available, or generate one from order
    const sectionId = section.id || `section-${section.order || index + 1}`;
    
    return {
      id: sectionId,
      title: section.title || section.heading || `Sección ${section.order || index + 1}`,
      order: section.order || index + 1,
      type: section.type || 'text',
      content: section.content || '',
      // Include any additional properties
      ...(section.media && { media: section.media }),
      ...(section.question && { question: section.question }),
      ...(section.options && { options: section.options }),
      ...(section.correctAnswer && { correctAnswer: section.correctAnswer }),
      ...(section.explanation && { explanation: section.explanation }),
    };
  });
}

/**
 * Virtual Lessons Map for Module 03 Configuration
 * Flattens module-03-configuration/index.js content into individual lessons
 * Each JSON with a title is exposed as a lesson with:
 * - moduleId='module-03-configuration'
 * - lessonId derived from filename (slug)
 * - sections calculated from blocks/sections in JSON
 * 
 * @returns {Map<string, Object>} Map of lessonId to lesson data
 */
export const getVirtualLessonsMap = () => {
  const lessonsMap = new Map();
  const MODULE_ID = 'module-03-configuration';
  
  // Category to filename mapping for deriving lessonId
  const categoryFileMap = {
    pathologyProtocols: {
      sdra: 'sdra-protocol',
      copd: 'copd-protocol',
      asthma: 'asthma-protocol',
      pneumonia: 'pneumonia-protocol',
    },
    protectiveStrategies: {
      lowTidalVolume: 'low-tidal-volume',
      permissiveHypercapnia: 'permissive-hypercapnia',
      peepStrategies: 'peep-strategies',
      lungProtectiveVentilation: 'lung-protective-ventilation',
    },
    weaningContent: {
      readinessCriteria: 'readiness-criteria',
      sbtProtocol: 'sbt-protocol',
    },
  };
  
  // Process pathology protocols (4 lessons)
  if (module03Content.pathologyProtocols) {
    Object.entries(module03Content.pathologyProtocols).forEach(([key, lessonData]) => {
      if (lessonData && lessonData.title) {
        const filename = categoryFileMap.pathologyProtocols[key] || key;
        const lessonId = deriveLessonIdFromFilename(filename);
        
        const lesson = {
          moduleId: MODULE_ID,
          lessonId: lessonId,
          title: lessonData.title,
          description: lessonData.summary || lessonData.description || '',
          estimatedTime: lessonData.estimatedTime || 30,
          difficulty: lessonData.difficulty || 'intermediate',
          order: 0, // Will be set based on category and order within category
          pages: lessonData.sections ? lessonData.sections.length : 0,
          sections: convertSectionsToLessonFormat(lessonData.sections || []),
          keyPoints: lessonData.keyPoints || [],
          references: lessonData.references || [],
          quiz: lessonData.quiz || [],
          resources: lessonData.resources || [],
          metadata: lessonData.metadata || {},
          // Store full lesson data for reference
          lessonData: lessonData,
          category: 'pathologyProtocols',
          moduleLevel: 'advanced', // Module 03 is advanced level
        };
        
        lessonsMap.set(lessonId, lesson);
      }
    });
  }
  
  // Process protective strategies (4 lessons)
  if (module03Content.protectiveStrategies) {
    Object.entries(module03Content.protectiveStrategies).forEach(([key, lessonData]) => {
      if (lessonData && lessonData.title) {
        const filename = categoryFileMap.protectiveStrategies[key] || key;
        const lessonId = deriveLessonIdFromFilename(filename);
        
        const lesson = {
          moduleId: MODULE_ID,
          lessonId: lessonId,
          title: lessonData.title,
          description: lessonData.summary || lessonData.description || '',
          estimatedTime: lessonData.estimatedTime || 30,
          difficulty: lessonData.difficulty || 'intermediate',
          order: 0,
          pages: lessonData.sections ? lessonData.sections.length : 0,
          sections: convertSectionsToLessonFormat(lessonData.sections || []),
          keyPoints: lessonData.keyPoints || [],
          references: lessonData.references || [],
          quiz: lessonData.quiz || [],
          resources: lessonData.resources || [],
          metadata: lessonData.metadata || {},
          lessonData: lessonData,
          category: 'protectiveStrategies',
          moduleLevel: 'advanced',
        };
        
        lessonsMap.set(lessonId, lesson);
      }
    });
  }
  
  // Process weaning content (2 lessons)
  if (module03Content.weaningContent) {
    Object.entries(module03Content.weaningContent).forEach(([key, lessonData]) => {
      if (lessonData && lessonData.title) {
        const filename = categoryFileMap.weaningContent[key] || key;
        const lessonId = deriveLessonIdFromFilename(filename);
        
        const lesson = {
          moduleId: MODULE_ID,
          lessonId: lessonId,
          title: lessonData.title,
          description: lessonData.summary || lessonData.description || '',
          estimatedTime: lessonData.estimatedTime || 30,
          difficulty: lessonData.difficulty || 'intermediate',
          order: 0,
          pages: lessonData.sections ? lessonData.sections.length : 0,
          sections: convertSectionsToLessonFormat(lessonData.sections || []),
          keyPoints: lessonData.keyPoints || [],
          references: lessonData.references || [],
          quiz: lessonData.quiz || [],
          resources: lessonData.resources || [],
          metadata: lessonData.metadata || {},
          lessonData: lessonData,
          category: 'weaningContent',
          moduleLevel: 'advanced',
        };
        
        lessonsMap.set(lessonId, lesson);
      }
    });
  }
  
  // Create placeholders for troubleshooting (empty category)
  const troubleshootingPlaceholders = [
    {
      id: 'high-pressure-alarm',
      title: 'Alarma de Presión Alta',
      filename: 'high-pressure-alarm',
    },
    {
      id: 'low-tidal-volume-alarm',
      title: 'Alarma de Volumen Tidal Bajo',
      filename: 'low-tidal-volume-alarm',
    },
    {
      id: 'patient-ventilator-asynchrony',
      title: 'Asincronía Paciente-Ventilador',
      filename: 'patient-ventilator-asynchrony',
    },
    {
      id: 'hypoxemia-management',
      title: 'Manejo de Hipoxemia',
      filename: 'hypoxemia-management',
    },
  ];
  
  troubleshootingPlaceholders.forEach((placeholder) => {
    const lessonId = deriveLessonIdFromFilename(placeholder.filename);
    
    const lesson = {
      moduleId: MODULE_ID,
      lessonId: lessonId,
      title: placeholder.title,
      description: 'Contenido próximamente disponible',
      estimatedTime: 25,
      difficulty: 'intermediate',
      order: 0,
      pages: 0,
      sections: [],
      keyPoints: [],
      references: [],
      quiz: [],
      resources: [],
      metadata: {
        isPlaceholder: true,
        comingSoon: true,
      },
      lessonData: null,
      category: 'troubleshootingGuides',
      moduleLevel: 'advanced',
      isPlaceholder: true,
    };
    
    lessonsMap.set(lessonId, lesson);
  });
  
  // Create placeholders for checklists (empty category)
  const checklistPlaceholders = [
    {
      id: 'initial-setup-checklist',
      title: 'Checklist de Configuración Inicial',
      filename: 'initial-setup-checklist',
    },
    {
      id: 'daily-assessment-checklist',
      title: 'Checklist de Evaluación Diaria',
      filename: 'daily-assessment-checklist',
    },
    {
      id: 'pre-extubation-checklist',
      title: 'Checklist Pre-Extubación',
      filename: 'pre-extubation-checklist',
    },
  ];
  
  checklistPlaceholders.forEach((placeholder) => {
    const lessonId = deriveLessonIdFromFilename(placeholder.filename);
    
    const lesson = {
      moduleId: MODULE_ID,
      lessonId: lessonId,
      title: placeholder.title,
      description: 'Contenido próximamente disponible',
      estimatedTime: 15,
      difficulty: 'intermediate',
      order: 0,
      pages: 0,
      sections: [],
      keyPoints: [],
      references: [],
      quiz: [],
      resources: [],
      metadata: {
        isPlaceholder: true,
        comingSoon: true,
      },
      lessonData: null,
      category: 'checklistProtocols',
      moduleLevel: 'advanced',
      isPlaceholder: true,
    };
    
    lessonsMap.set(lessonId, lesson);
  });
  
  return lessonsMap;
};

/**
 * Get all virtual lessons as an array
 * Useful for grid display and lesson listing
 * 
 * @returns {Array} Array of virtual lesson objects
 */
export const getVirtualLessonsArray = () => {
  const lessonsMap = getVirtualLessonsMap();
  return Array.from(lessonsMap.values());
};

/**
 * Get visible lessons by level
 * 
 * This function:
 * 1. Flattens M03 to virtual lessons
 * 2. Filters lessons with sections.length > 0
 * 3. Excludes empty ones except when metadata.allowEmpty === true
 * 4. Returns only lessons for the specified level
 * 
 * Lessons with allowEmpty === true are included but don't count in progress calculations
 * 
 * @param {string} levelId - Level ID (beginner, intermediate, advanced)
 * @returns {Array} Array of visible lesson objects with { moduleId, lessonId, sections, allowEmpty, ... }
 */
export const getVisibleLessonsByLevel = (levelId) => {
  if (!levelId) {
    return [];
  }
  
  const allModules = getAllModules();
  const visibleLessons = [];
  
  // Process regular modules with lessons
  const modulesInLevel = allModules.filter(module => module.level === levelId);
  
  modulesInLevel.forEach(module => {
    if (!module.lessons || module.lessons.length === 0) {
      return;
    }
    
    module.lessons.forEach(lesson => {
      // DB-migrated lessons have no lessonData (content loaded from API at runtime)
      const isDbMigrated = !lesson.lessonData && !lesson.sections;

      // Get sections from lessonData
      let sections = [];
      if (lesson.lessonData && lesson.lessonData.sections) {
        sections = lesson.lessonData.sections;
      } else if (lesson.sections) {
        sections = lesson.sections;
      }

      // Get metadata
      const metadata = lesson.lessonData?.metadata || lesson.metadata || {};
      const allowEmpty = metadata.allowEmpty === true;

      // Filter: include if DB-migrated, has sections, or allowEmpty
      if (!isDbMigrated && sections.length === 0 && !allowEmpty) {
        return; // Skip empty lessons (but never skip DB-migrated ones)
      }
      
      visibleLessons.push({
        moduleId: module.id,
        lessonId: lesson.id,
        title: lesson.title || lesson.lessonData?.title || 'Sin título',
        description: lesson.description || lesson.lessonData?.description || '',
        estimatedTime: lesson.estimatedTime || lesson.lessonData?.estimatedTime || 0,
        difficulty: lesson.difficulty || lesson.lessonData?.difficulty || module.difficulty || 'intermedio',
        order: lesson.order || lesson.lessonData?.order || 0,
        sections: sections,
        sectionsCount: sections.length,
        allowEmpty: allowEmpty,
        lessonData: lesson.lessonData || lesson,
        moduleLevel: module.level,
        moduleTitle: module.title,
      });
    });
  });
  
  // Add virtual lessons from M03 (module-03-configuration)
  // Only include if level matches
  if (levelId === 'advanced') {
    const virtualLessons = getVirtualLessonsArray();
    virtualLessons.forEach(virtualLesson => {
      // Virtual lessons from M03 are always advanced level
      if (virtualLesson.moduleLevel !== 'advanced') {
        return;
      }
      
      // Get sections and metadata
      const sections = virtualLesson.sections || [];
      const metadata = virtualLesson.metadata || {};
      const allowEmpty = metadata.allowEmpty === true;
      
      // Filter: only include if sections.length > 0 OR metadata.allowEmpty === true
      if (sections.length === 0 && !allowEmpty) {
        return; // Skip empty lessons
      }
      
      visibleLessons.push({
        moduleId: virtualLesson.moduleId,
        lessonId: virtualLesson.lessonId,
        title: virtualLesson.title,
        description: virtualLesson.description || '',
        estimatedTime: virtualLesson.estimatedTime || 0,
        difficulty: virtualLesson.difficulty || 'intermediate',
        order: virtualLesson.order || 0,
        sections: sections,
        sectionsCount: sections.length,
        allowEmpty: allowEmpty,
        lessonData: virtualLesson.lessonData,
        moduleLevel: virtualLesson.moduleLevel,
        moduleTitle: 'Configuración y Manejo del Ventilador Mecánico',
        category: virtualLesson.category,
        isPlaceholder: virtualLesson.isPlaceholder || false,
        keyPoints: virtualLesson.keyPoints,
        references: virtualLesson.references,
      });
    });
  }
  
  // Sort by order
  visibleLessons.sort((a, b) => (a.order || 0) - (b.order || 0));
  
  return visibleLessons;
};


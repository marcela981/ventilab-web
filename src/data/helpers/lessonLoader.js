/**
 * Lesson Loader Utilities
 * Helper functions for loading and managing lesson content
 * Part of HU-005: Integration with existing components
 */

import { curriculumData, getModuleById } from '../curriculumData';

/**
 * Get a lesson by its ID within a specific module
 * @param {string} moduleId - The module ID
 * @param {string} lessonId - The lesson ID
 * @returns {Object|null} The lesson object or null if not found
 */
export const getLessonById = (moduleId, lessonId) => {
  try {
    const module = getModuleById(moduleId);
    if (!module || !module.lessons) {
      console.warn(`Module ${moduleId} not found or has no lessons`);
      return null;
    }

    // Since lessons are now imported as complete JSON objects,
    // we can directly access them
    const lesson = module.lessons.find(l => l.id === lessonId);

    if (!lesson) {
      console.warn(`Lesson ${lessonId} not found in module ${moduleId}`);
      return null;
    }

    return lesson;
  } catch (error) {
    console.error(`Error loading lesson ${lessonId} from module ${moduleId}:`, error);
    return null;
  }
};

/**
 * Get the full content of a lesson including sections
 * @param {string} moduleId - The module ID
 * @param {string} lessonId - The lesson ID
 * @returns {Object|null} The lesson content or null if not found
 */
export const getLessonContent = (moduleId, lessonId) => {
  const lesson = getLessonById(moduleId, lessonId);

  if (!lesson) {
    return null;
  }

  return {
    id: lesson.id,
    moduleId: lesson.moduleId,
    title: lesson.title,
    description: lesson.description,
    estimatedTime: lesson.estimatedTime,
    level: lesson.level,
    learningObjectives: lesson.learningObjectives,
    sections: lesson.sections || [],
    resources: lesson.resources || [],
    keywords: lesson.keywords || []
  };
};

/**
 * Get the quiz for a specific lesson
 * @param {string} moduleId - The module ID
 * @param {string} lessonId - The lesson ID
 * @returns {Object|null} The quiz object or null if not found
 */
export const getQuizByLesson = (moduleId, lessonId) => {
  const lesson = getLessonById(moduleId, lessonId);

  if (!lesson || !lesson.quiz) {
    console.warn(`No quiz found for lesson ${lessonId} in module ${moduleId}`);
    return null;
  }

  return lesson.quiz;
};

/**
 * Get resources for a specific lesson
 * @param {string} moduleId - The module ID
 * @param {string} lessonId - The lesson ID
 * @returns {Array} Array of resource objects
 */
export const getLessonResources = (moduleId, lessonId) => {
  const lesson = getLessonById(moduleId, lessonId);

  if (!lesson || !lesson.resources) {
    return [];
  }

  return lesson.resources;
};

/**
 * Validate if a lesson can be accessed based on user progress
 * @param {string} lessonId - The lesson ID
 * @param {Object} userProgress - User's progress object
 * @returns {Object} Validation result with status and message
 */
export const validateLessonProgress = (lessonId, userProgress = {}) => {
  // Find the module containing this lesson
  const moduleId = Object.keys(curriculumData.modules).find(mId => {
    const module = curriculumData.modules[mId];
    return module.lessons && module.lessons.some(l => l.id === lessonId);
  });

  if (!moduleId) {
    return {
      canAccess: false,
      message: 'Lección no encontrada'
    };
  }

  const module = getModuleById(moduleId);

  // Check if module prerequisites are met
  if (module.prerequisites && module.prerequisites.length > 0) {
    const completedModules = userProgress.completedModules || [];
    const unmetPrereqs = module.prerequisites.filter(
      prereqId => !completedModules.includes(prereqId)
    );

    if (unmetPrereqs.length > 0) {
      const prereqNames = unmetPrereqs
        .map(id => getModuleById(id)?.title || id)
        .join(', ');

      return {
        canAccess: false,
        message: `Debes completar primero: ${prereqNames}`,
        missingPrerequisites: unmetPrereqs
      };
    }
  }

  return {
    canAccess: true,
    message: 'Lección disponible',
    moduleId
  };
};

/**
 * Get all lessons for a specific module
 * @param {string} moduleId - The module ID
 * @returns {Array} Array of lesson objects
 */
export const getLessonsByModule = (moduleId) => {
  const module = getModuleById(moduleId);

  if (!module || !module.lessons) {
    return [];
  }

  return module.lessons;
};

/**
 * Get the next lesson in the curriculum sequence
 * @param {string} currentModuleId - Current module ID
 * @param {string} currentLessonId - Current lesson ID
 * @returns {Object|null} Next lesson info or null if no next lesson
 */
export const getNextLesson = (currentModuleId, currentLessonId) => {
  const module = getModuleById(currentModuleId);

  if (!module || !module.lessons) {
    return null;
  }

  const currentIndex = module.lessons.findIndex(l => l.id === currentLessonId);

  // If there's a next lesson in the same module
  if (currentIndex !== -1 && currentIndex < module.lessons.length - 1) {
    return {
      moduleId: currentModuleId,
      lesson: module.lessons[currentIndex + 1]
    };
  }

  // If this was the last lesson in the module, get first lesson of next module
  const allModules = Object.values(curriculumData.modules)
    .filter(m => m.level === module.level)
    .sort((a, b) => a.order - b.order);

  const currentModuleIndex = allModules.findIndex(m => m.id === currentModuleId);

  if (currentModuleIndex !== -1 && currentModuleIndex < allModules.length - 1) {
    const nextModule = allModules[currentModuleIndex + 1];
    if (nextModule.lessons && nextModule.lessons.length > 0) {
      return {
        moduleId: nextModule.id,
        lesson: nextModule.lessons[0]
      };
    }
  }

  return null;
};

/**
 * Get the previous lesson in the curriculum sequence
 * @param {string} currentModuleId - Current module ID
 * @param {string} currentLessonId - Current lesson ID
 * @returns {Object|null} Previous lesson info or null if no previous lesson
 */
export const getPreviousLesson = (currentModuleId, currentLessonId) => {
  const module = getModuleById(currentModuleId);

  if (!module || !module.lessons) {
    return null;
  }

  const currentIndex = module.lessons.findIndex(l => l.id === currentLessonId);

  // If there's a previous lesson in the same module
  if (currentIndex > 0) {
    return {
      moduleId: currentModuleId,
      lesson: module.lessons[currentIndex - 1]
    };
  }

  // If this was the first lesson in the module, get last lesson of previous module
  const allModules = Object.values(curriculumData.modules)
    .filter(m => m.level === module.level)
    .sort((a, b) => a.order - b.order);

  const currentModuleIndex = allModules.findIndex(m => m.id === currentModuleId);

  if (currentModuleIndex > 0) {
    const previousModule = allModules[currentModuleIndex - 1];
    if (previousModule.lessons && previousModule.lessons.length > 0) {
      return {
        moduleId: previousModule.id,
        lesson: previousModule.lessons[previousModule.lessons.length - 1]
      };
    }
  }

  return null;
};

/**
 * Search lessons by keyword
 * @param {string} keyword - Keyword to search for
 * @returns {Array} Array of matching lessons with their module info
 */
export const searchLessonsByKeyword = (keyword) => {
  const results = [];
  const searchTerm = keyword.toLowerCase();

  Object.values(curriculumData.modules).forEach(module => {
    if (module.lessons) {
      module.lessons.forEach(lesson => {
        const matchesTitle = lesson.title?.toLowerCase().includes(searchTerm);
        const matchesDescription = lesson.description?.toLowerCase().includes(searchTerm);
        const matchesKeywords = lesson.keywords?.some(k =>
          k.toLowerCase().includes(searchTerm)
        );

        if (matchesTitle || matchesDescription || matchesKeywords) {
          results.push({
            moduleId: module.id,
            moduleTitle: module.title,
            lesson: lesson
          });
        }
      });
    }
  });

  return results;
};

/**
 * Get lesson statistics for a module
 * @param {string} moduleId - The module ID
 * @returns {Object} Statistics about lessons in the module
 */
export const getModuleLessonStats = (moduleId) => {
  const module = getModuleById(moduleId);

  if (!module || !module.lessons) {
    return {
      totalLessons: 0,
      totalDuration: 0,
      lessonTypes: {}
    };
  }

  const stats = {
    totalLessons: module.lessons.length,
    totalDuration: 0,
    lessonTypes: {},
    hasSections: 0,
    hasQuiz: 0,
    hasResources: 0
  };

  module.lessons.forEach(lesson => {
    // Count duration
    if (lesson.estimatedTime) {
      stats.totalDuration += lesson.estimatedTime;
    }

    // Count lesson types from sections
    if (lesson.sections) {
      stats.hasSections++;
      lesson.sections.forEach(section => {
        stats.lessonTypes[section.type] = (stats.lessonTypes[section.type] || 0) + 1;
      });
    }

    // Count lessons with quiz
    if (lesson.quiz) {
      stats.hasQuiz++;
    }

    // Count lessons with resources
    if (lesson.resources && lesson.resources.length > 0) {
      stats.hasResources++;
    }
  });

  return stats;
};

export default {
  getLessonById,
  getLessonContent,
  getQuizByLesson,
  getLessonResources,
  validateLessonProgress,
  getLessonsByModule,
  getNextLesson,
  getPreviousLesson,
  searchLessonsByKeyword,
  getModuleLessonStats
};

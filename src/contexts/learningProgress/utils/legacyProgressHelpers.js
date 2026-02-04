/**
 * Legacy compatibility helpers for progress context
 * These functions maintain backward compatibility with the old API
 */

/**
 * Convert progressByModule to legacy progressMap format
 */
/**
 * Create progress map from progressByModule
 * IMPORTANT: isCompleted is derived from progress === 1, not from flags
 * Lesson progress (0-1 float) is the single source of truth
 */
export const createProgressMap = (progressByModule) => {
  const map = {};
  for (const [moduleId, moduleData] of Object.entries(progressByModule)) {
    for (const [lessonId, lessonProgress] of Object.entries(moduleData.lessonsById)) {
      // Get progress value (0-1) - prefer progress field, then completionPercentage
      let progressValue = 0;
      if (typeof lessonProgress.progress === 'number') {
        progressValue = Math.max(0, Math.min(1, lessonProgress.progress));
      } else if (typeof lessonProgress.completionPercentage === 'number') {
        progressValue = Math.max(0, Math.min(1, lessonProgress.completionPercentage / 100));
      }
      
      // isCompleted is derived from progress === 1, not from flags
      const isCompleted = progressValue === 1;
      
      map[lessonId] = {
        ...lessonProgress,
        moduleId,
        positionSeconds: lessonProgress.timeSpent * 60, // Convert to seconds for compatibility
        progress: progressValue, // Ensure progress is 0-1
        isCompleted, // Derived from progress === 1
      };
    }
  }
  return map;
};

/**
 * Get completed lessons set from progressByModule and/or snapshot
 * Uses format: "moduleId-lessonId" for consistency with lesson availability checks
 * 
 * IMPORTANT: Lesson progress (0-1 float) is the single source of truth.
 * A lesson is completed ONLY when progress === 1, not based on flags.
 * 
 * @param {Object} progressByModule - Normalized progress state by module
 * @param {Object|null} snapshot - Optional unified snapshot from ProgressSource
 */
export const getCompletedLessons = (progressByModule, snapshot = null) => {
  const set = new Set();

  // First, add completed lessons from progressByModule (primary source when available)
  // A lesson is completed ONLY when progress === 1 (not based on flags)
  for (const [moduleId, moduleData] of Object.entries(progressByModule)) {
    if (!moduleData?.lessonsById) continue;
    for (const [lessonId, lessonProgress] of Object.entries(moduleData.lessonsById)) {
      // Get progress value (0-1) - prefer progress field, then completionPercentage
      let lessonProgressValue = 0;
      if (typeof lessonProgress.progress === 'number') {
        lessonProgressValue = Math.max(0, Math.min(1, lessonProgress.progress));
      } else if (typeof lessonProgress.completionPercentage === 'number') {
        lessonProgressValue = Math.max(0, Math.min(1, lessonProgress.completionPercentage / 100));
      }
      
      // A lesson is completed ONLY when progress === 1
      if (lessonProgressValue === 1) {
        // Use format: "moduleId-lessonId" for consistency
        set.add(`${moduleId}-${lessonId}`);
        // Also add just lessonId for backward compatibility
        set.add(lessonId);
      }
    }
  }

  // Second, add completed lessons from snapshot (ensures fresh data is included)
  // This is critical for when progressByModule is stale/empty
  // A lesson is completed ONLY when progress === 1 (not based on flags)
  if (snapshot?.lessons && Array.isArray(snapshot.lessons)) {
    for (const lesson of snapshot.lessons) {
      // Get progress value (0-1)
      const lessonProgressValue = Math.max(0, Math.min(1, lesson.progress || 0));
      
      // A lesson is completed ONLY when progress === 1
      if (lessonProgressValue === 1) {
        // Add the lessonId directly (format from backend)
        set.add(lesson.lessonId);

        // Try to extract moduleId from lessonId if it follows a pattern
        // Common patterns: "moduleId-lessonId" or "moduleId/lessonId"
        const parts = lesson.lessonId.split(/[-\/]/);
        if (parts.length >= 2) {
          // If lessonId contains module info, also add the compound key
          const possibleModuleId = parts.slice(0, -1).join('-');
          const possibleLessonId = parts[parts.length - 1];
          set.add(`${possibleModuleId}-${possibleLessonId}`);
        }
      }
    }
  }

  return set;
};

/**
 * Get module progress in legacy format
 */
export const getModuleProgressLegacy = (progressByModule, moduleId, lessonIds = []) => {
  if (!moduleId) {
    return {
      percent: 0,
      percentInt: 0,
      completedLessons: 0,
      totalLessons: 0,
    };
  }
  
  const moduleData = progressByModule[moduleId];
  if (!moduleData) {
    return {
      percent: 0,
      percentInt: 0,
      completedLessons: 0,
      totalLessons: 0,
    };
  }
  
  const lessons = lessonIds.length > 0 
    ? lessonIds.filter(id => moduleData.lessonsById[id])
    : Object.keys(moduleData.lessonsById);
  
  if (lessons.length === 0) {
    return {
      percent: 0,
      percentInt: 0,
      completedLessons: 0,
      totalLessons: 0,
    };
  }
  
  let completedCount = 0;
  let progressSum = 0;

  lessons.forEach(lessonId => {
    const lessonProgress = moduleData.lessonsById[lessonId];
    if (lessonProgress) {
      // Get progress value (0-1) - prefer progress field, then completionPercentage
      // Lesson progress (0-1 float) is the single source of truth
      let progressValue = 0;
      if (typeof lessonProgress.progress === 'number') {
        progressValue = Math.max(0, Math.min(1, lessonProgress.progress));
      } else if (typeof lessonProgress.completionPercentage === 'number') {
        // DB stores completionPercentage as 0-100, convert to 0-1
        progressValue = Math.max(0, Math.min(1, lessonProgress.completionPercentage / 100));
      }
      
      progressSum += progressValue;
      
      // A lesson is completed ONLY when progress === 1 (not based on flags)
      if (progressValue === 1) {
        completedCount++;
      }
    }
  });
  
  const totalLessons = lessons.length;
  // Module progress = completedLessons / totalLessons (0-1)
  const percent = totalLessons > 0 ? (completedCount / totalLessons) : 0;
  
  return {
    percent,
    percentInt: Math.round(percent * 100),
    completedLessons: completedCount,
    totalLessons,
  };
};

/**
 * Get curriculum progress (legacy format)
 */
export const getCurriculumProgress = (progressByModule, modules) => {
  if (!Array.isArray(modules) || modules.length === 0) {
    return {};
  }
  
  return modules.reduce((acc, module) => {
    if (!module || !module.id) {
      return acc;
    }
    
    const lessonIds = Array.isArray(module.lessons)
      ? module.lessons.map(lesson => lesson?.id).filter(Boolean)
      : [];
    
    acc[module.id] = getModuleProgressLegacy(progressByModule, module.id, lessonIds);
    return acc;
  }, {});
};

/**
 * Convert legacy update format to new format
 */
export const convertLegacyUpdate = (partial, currentLessonId, currentModuleId) => {
  const lessonId = partial.lessonId || currentLessonId;
  const moduleId = partial.moduleId || currentModuleId;
  
  const updateData = {
    lessonId,
    moduleId,
    ...(partial.progress !== undefined && { progress: partial.progress }),
    ...(partial.isCompleted !== undefined && { completed: partial.isCompleted }),
    ...(partial.positionSeconds !== undefined && { 
      timeSpentDelta: Math.floor(partial.positionSeconds / 60) 
    }),
  };
  
  return updateData;
};


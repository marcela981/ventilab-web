/**
 * Legacy compatibility helpers for progress context
 * These functions maintain backward compatibility with the old API
 */

/**
 * Convert progressByModule to legacy progressMap format
 */
export const createProgressMap = (progressByModule) => {
  const map = {};
  for (const [moduleId, moduleData] of Object.entries(progressByModule)) {
    for (const [lessonId, lessonProgress] of Object.entries(moduleData.lessonsById)) {
      map[lessonId] = {
        ...lessonProgress,
        moduleId,
        positionSeconds: lessonProgress.timeSpent * 60, // Convert to seconds for compatibility
        isCompleted: lessonProgress.completed,
      };
    }
  }
  return map;
};

/**
 * Get completed lessons set from progressByModule and/or snapshot
 * Uses format: "moduleId-lessonId" for consistency with lesson availability checks
 * @param {Object} progressByModule - Normalized progress state by module
 * @param {Object|null} snapshot - Optional unified snapshot from ProgressSource
 */
export const getCompletedLessons = (progressByModule, snapshot = null) => {
  const set = new Set();

  // First, add completed lessons from progressByModule (primary source when available)
  // ONLY mark as completed if explicitly marked completed === true
  for (const [moduleId, moduleData] of Object.entries(progressByModule)) {
    if (!moduleData?.lessonsById) continue;
    for (const [lessonId, lessonProgress] of Object.entries(moduleData.lessonsById)) {
      if (lessonProgress.completed === true) {
        // Use format: "moduleId-lessonId" for consistency
        set.add(`${moduleId}-${lessonId}`);
        // Also add just lessonId for backward compatibility
        set.add(lessonId);
      }
    }
  }

  // Second, add completed lessons from snapshot (ensures fresh data is included)
  // This is critical for when progressByModule is stale/empty
  // ONLY mark as completed if explicitly marked completed === true
  if (snapshot?.lessons && Array.isArray(snapshot.lessons)) {
    for (const lesson of snapshot.lessons) {
      if (lesson.completed === true) {
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
  
  let completed = 0;
  let progressSum = 0;

  lessons.forEach(lessonId => {
    const lessonProgress = moduleData.lessonsById[lessonId];
    if (lessonProgress) {
      // ONLY count as completed if explicitly marked completed === true
      // For progress calculation, use completionPercentage or progress, but don't mark as completed
      let progressValue;
      if (lessonProgress.completed === true) {
        progressValue = 1;
        completed += 1;
      } else if (typeof lessonProgress.completionPercentage === 'number') {
        // DB stores completionPercentage as 0-100, convert to 0-1
        progressValue = Math.max(0, Math.min(1, lessonProgress.completionPercentage / 100));
      } else if (typeof lessonProgress.progress === 'number') {
        // Fallback to progress field (already 0-1)
        progressValue = Math.max(0, Math.min(1, lessonProgress.progress));
      } else {
        progressValue = 0;
      }
      progressSum += progressValue;
    }
  });
  
  const totalLessons = lessons.length;
  const percent = totalLessons > 0 ? progressSum / totalLessons : 0;
  
  return {
    percent,
    percentInt: Math.round(percent * 100),
    completedLessons: completed,
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


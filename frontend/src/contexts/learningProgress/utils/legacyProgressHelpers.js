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
 * Get completed lessons set from progressByModule
 */
export const getCompletedLessons = (progressByModule) => {
  const set = new Set();
  for (const moduleData of Object.values(progressByModule)) {
    for (const [lessonId, lessonProgress] of Object.entries(moduleData.lessonsById)) {
      if (lessonProgress.completed) {
        set.add(lessonId);
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
      const progressValue = lessonProgress.completed ? 1 : Math.max(0, Math.min(1, lessonProgress.progress || 0));
      progressSum += progressValue;
      if (progressValue >= 1) {
        completed += 1;
      }
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


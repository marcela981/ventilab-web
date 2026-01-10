/**
 * Helper functions for progress calculations and transformations
 */

/**
 * Calculate optimistic lesson progress update
 */
export const calculateOptimisticProgress = (currentLessonProgress, updateData) => {
  return {
    ...currentLessonProgress,
    ...(updateData.progress !== undefined && { progress: Math.max(0, Math.min(1, updateData.progress)) }),
    ...(updateData.completed !== undefined && { completed: updateData.completed }),
    ...(updateData.timeSpentDelta !== undefined && { 
      timeSpent: Math.max(0, currentLessonProgress.timeSpent + (updateData.timeSpentDelta || 0))
    }),
    lastAccessed: updateData.lastAccessed || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Create default lesson progress structure
 */
export const createDefaultLessonProgress = (lessonId, progressId) => {
  return {
    id: '',
    progressId: progressId || '',
    lessonId,
    completed: false,
    timeSpent: 0,
    lastAccessed: null,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Infer moduleId from progress state by lessonId
 */
export const inferModuleIdFromLesson = (progressByModule, lessonId, fallbackModuleId = null) => {
  // Try to find moduleId from existing progress
  for (const [mid, moduleData] of Object.entries(progressByModule)) {
    if (moduleData.lessonsById[lessonId]) {
      return mid;
    }
  }
  
  // Use fallback if not found
  return fallbackModuleId;
};

/**
 * Handle rate limiting error with retry
 */
export const handleRateLimitError = async (error, retryFn, retryAfter = 5) => {
  if (error.status === 429 || error.message?.includes('Too many requests')) {
    const waitTime = error.retryAfter || error.payload?.retryAfter || error.payload?.error?.retryAfter || retryAfter;
    console.warn(`[progressHelpers] Rate limited. Retrying after ${waitTime} seconds...`);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    
    // Retry once
    return await retryFn();
  }
  
  return null;
};

/**
 * Handle 404 error by initializing empty state
 */
export const handleNotFoundError = (moduleId) => {
  console.warn(`[progressHelpers] Module "${moduleId}" not found, initializing empty progress state`);
  
  return {
    learningProgress: null,
    lessonsById: {},
    isAvailable: false,
  };
};


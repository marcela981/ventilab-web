/**
 * computeModuleProgress - Single source of truth for module progress calculation
 *
 * RULES:
 * - A lesson is considered completed ONLY if progress === 100
 * - Module progress is derived from lesson completion count
 * - progressPercentage is rounded DOWN (floor)
 *
 * @param {Array<{id?: string, lessonId?: string, progress: number}>} lessons - Array of lessons with progress values (0-100)
 * @returns {{completedLessonsCount: number, totalLessonsCount: number, progressPercentage: number}}
 *
 * @example
 * const result = computeModuleProgress([
 *   { id: '1', progress: 100 },
 *   { id: '2', progress: 50 },
 *   { id: '3', progress: 100 },
 * ]);
 * // result = { completedLessonsCount: 2, totalLessonsCount: 3, progressPercentage: 66 }
 */
export function computeModuleProgress(lessons) {
  // Handle empty or invalid input
  if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
    return {
      completedLessonsCount: 0,
      totalLessonsCount: 0,
      progressPercentage: 0,
    };
  }

  const totalLessonsCount = lessons.length;

  // Count lessons where progress === 100 (strict equality)
  // A lesson is completed ONLY when progress is exactly 100
  const completedLessonsCount = lessons.filter(lesson => {
    const progress = typeof lesson.progress === 'number' ? lesson.progress : 0;
    return progress === 100;
  }).length;

  // Calculate percentage and round DOWN (floor)
  // progressPercentage = floor((completedLessons / totalLessons) * 100)
  const progressPercentage = Math.floor((completedLessonsCount / totalLessonsCount) * 100);

  return {
    completedLessonsCount,
    totalLessonsCount,
    progressPercentage,
  };
}

/**
 * Check if a module is fully completed
 * A module is complete when all lessons have progress === 100
 *
 * @param {Array<{progress: number}>} lessons
 * @returns {boolean}
 */
export function isModuleComplete(lessons) {
  const { completedLessonsCount, totalLessonsCount } = computeModuleProgress(lessons);
  return totalLessonsCount > 0 && completedLessonsCount === totalLessonsCount;
}

export default computeModuleProgress;

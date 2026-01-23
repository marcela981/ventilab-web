/**
 * Progress Selectors
 * Reusable selectors for calculating progress metrics
 * Used by both Curriculum and Mi Progreso tabs
 */

import { ProgressSnapshot } from './ProgressSource';

/**
 * Select module progress from snapshot
 */
export const selectModuleProgress = (
  moduleId: string,
  snapshot: ProgressSnapshot | null
): {
  completedLessons: number;
  totalLessons: number;
  progress: number; // 0-1
  isCompleted: boolean;
} => {
  if (!snapshot || !snapshot.lessons) {
    return {
      completedLessons: 0,
      totalLessons: 0,
      progress: 0,
      isCompleted: false
    };
  }

  // Filter lessons for this module
  // Note: This assumes lessonId format includes module info or we have a mapping
  // For now, we'll use a simple filter based on lessonId prefix
  const moduleLessons = snapshot.lessons.filter(lesson => {
    // Adjust this logic based on your lessonId format
    return lesson.lessonId.includes(moduleId) || lesson.lessonId.startsWith(moduleId);
  });

  // ONLY count lessons explicitly marked as completed === true
  const completedLessons = moduleLessons.filter(l => l.completed === true).length;
  const totalLessons = moduleLessons.length;
  // Module progress = completedLessons / totalLessons
  const progress = totalLessons > 0 ? completedLessons / totalLessons : 0;

  return {
    completedLessons,
    totalLessons,
    progress,
    // Module is completed ONLY when ALL lessons are completed
    isCompleted: completedLessons >= totalLessons && totalLessons > 0
  };
};

/**
 * Select global progress percentage
 */
export const selectGlobalPercent = (snapshot: ProgressSnapshot | null): number => {
  if (!snapshot || !snapshot.overview) {
    return 0;
  }

  const { completedLessons, totalLessons } = snapshot.overview;
  if (totalLessons === 0) {
    return 0;
  }

  return Math.round((completedLessons / totalLessons) * 100);
};

/**
 * Select lesson progress
 */
export const selectLessonProgress = (
  lessonId: string,
  snapshot: ProgressSnapshot | null
): number => {
  if (!snapshot || !snapshot.lessons) {
    return 0;
  }

  const lesson = snapshot.lessons.find(l => l.lessonId === lessonId);
  return lesson?.progress || 0;
};

/**
 * Select completed lessons count
 */
export const selectCompletedLessonsCount = (snapshot: ProgressSnapshot | null): number => {
  if (!snapshot || !snapshot.overview) {
    return 0;
  }

  return snapshot.overview.completedLessons || 0;
};

/**
 * Select modules completed count
 */
export const selectModulesCompletedCount = (snapshot: ProgressSnapshot | null): number => {
  if (!snapshot || !snapshot.overview) {
    return 0;
  }

  return snapshot.overview.modulesCompleted || 0;
};

/**
 * Select XP total
 */
export const selectXpTotal = (snapshot: ProgressSnapshot | null): number => {
  if (!snapshot || !snapshot.overview) {
    return 0;
  }

  return snapshot.overview.xpTotal || 0;
};

/**
 * Select streak days
 */
export const selectStreakDays = (snapshot: ProgressSnapshot | null): number => {
  if (!snapshot || !snapshot.overview) {
    return 0;
  }

  return snapshot.overview.streakDays || 0;
};


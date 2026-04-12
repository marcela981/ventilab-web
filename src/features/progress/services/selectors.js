/**
 * Progress Selectors
 * Pure functions to extract/derive data from a ProgressSnapshot.
 * Components must use these instead of accessing snapshot fields directly
 * to decouple the UI from the internal snapshot structure.
 */

/**
 * Returns the number of completed lessons.
 * Primary: uses overview.completedLessons (authoritative DB value).
 * Fallback: counts lessons with progress >= 1 in the lessons array.
 */
export function selectCompletedLessonsCount(snapshot) {
  if (!snapshot) return 0;
  if (typeof snapshot.overview?.completedLessons === 'number') {
    return snapshot.overview.completedLessons;
  }
  return (snapshot.lessons || []).filter(l => l.progress >= 1).length;
}

/**
 * Returns total lessons count.
 */
export function selectTotalLessonsCount(snapshot) {
  if (!snapshot) return 0;
  return snapshot.overview?.totalLessons ?? snapshot.lessons?.length ?? 0;
}

/**
 * Returns whether the user has any recorded progress.
 */
export function selectHasAnyProgress(snapshot) {
  if (!snapshot) return false;
  return (
    selectCompletedLessonsCount(snapshot) > 0 ||
    (snapshot.overview?.modulesCompleted ?? 0) > 0 ||
    (snapshot.overview?.streakDays ?? 0) > 0
  );
}

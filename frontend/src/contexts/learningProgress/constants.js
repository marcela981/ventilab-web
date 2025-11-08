/**
 * Constants for Learning Progress Context
 */

export const PROGRESS_STATE_KEY = 'vlab:progress:state';
export const AUTOSAVE_INTERVAL_MS = 30_000;
export const RETRY_DELAY_MS = 1000;
export const MAX_RETRIES = 3;

/**
 * Normalized progress state structure:
 * {
 *   [moduleId]: {
 *     learningProgress: LearningProgressDTO | null,
 *     lessonsById: { [lessonId]: LessonProgressDTO }
 *   }
 * }
 */


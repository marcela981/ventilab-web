/**
 * Constants for Learning Progress Context
 */

export const PROGRESS_STATE_KEY = 'vlab:progress:state';
export const AUTOSAVE_INTERVAL_MS = 30_000;
export const RETRY_DELAY_MS = 1000;
export const MAX_RETRIES = 3;
export const MAX_RETRY_ATTEMPTS = 5; // Maximum retry attempts for failed events

// Outbox reconciliation settings
export const RECONCILIATION_DELAY_MS = 500; // Delay between requests during reconciliation
export const MAX_RECONCILIATION_BATCH_SIZE = 10; // Maximum events to process in one reconciliation cycle
export const RATE_LIMIT_RETRY_DELAY_MS = 5000; // Default delay when rate limited (5 seconds)

/**
 * Normalized progress state structure:
 * {
 *   [moduleId]: {
 *     learningProgress: LearningProgressDTO | null,
 *     lessonsById: { [lessonId]: LessonProgressDTO }
 *   }
 * }
 */


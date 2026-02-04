/**
 * COMPATIBILITY SHIM
 * This file re-exports from the canonical location.
 * Import from '@/services/api/legacyProgressService' instead.
 * @deprecated Use @/services/api/legacyProgressService
 *
 * Note: This uses the httpClient-based implementation.
 * For the main progress service, use @/services/api/progressService
 */
export {
  getProgressOverview,
  getModuleProgress,
  getLessonProgress,
  completeLesson,
  saveLessonProgress,
  getUserStats,
  default
} from '@/services/api/legacyProgressService';

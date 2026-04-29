/**
 * =============================================================================
 * VentyLab — progreso barrel
 * =============================================================================
 *
 * Single import point for the canonical progress pipeline.
 *
 *   import { useProgress } from '@/features/ensenanza/shared/progreso';
 *
 * Module: src/features/ensenanza/shared/progreso/index.ts
 * =============================================================================
 */

export { useProgress, default as useProgressHook } from './hooks/useProgress';
export type { UseProgressReturn } from './hooks/useProgress';
export {
  fetchProgressOverview,
  markLessonComplete,
  PROGRESS_OVERVIEW_KEY,
} from './api/progress.api';
export type {
  CompleteLessonInput,
  ProgressOverviewDTO,
  ProgressOverviewModuleDTO,
} from './types/progress.types';

/**
 * Barrel export for teaching components
 *
 * Facilita la importación de múltiples componentes desde un solo punto.
 */

// Main components exports
export * from './curriculum';

// Dashboard components (feature-based path)
export {
  DashboardHeader,
  ContinueLearningSection,
  SessionStats,
  FlashcardDashboard,
  ProgressOverview,
  ModuleInfoPanel,
  DashboardStats,
  QuickAccessLessons,
  Module3ProgressDashboard,
  ReadinessIndicator
} from '@/features/teaching/components/dashboard';

// Lesson viewer and content components
export { default as LessonViewer } from './LessonViewer';
export { default as LessonViewerWrapper } from './LessonViewerWrapper';
export { default as LessonLoadingSkeleton } from './LessonLoadingSkeleton';
export { default as LessonErrorState } from './LessonErrorState';
export { default as TeachingLessonView } from './TeachingLessonView';
export { default as TeachingTabs } from './TeachingTabs';
export { default as ProgressTabSkeleton } from './ProgressTabSkeleton';
export * from './content';
export * from './media';
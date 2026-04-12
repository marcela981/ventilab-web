/**
 * Barrel export for teaching components
 *
 * Facilita la importación de múltiples componentes desde un solo punto.
 */

// Main components exports
export * from '@/features/ensenanza/shared/components/modulos';

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
} from '@/features/ensenanza/shared/dashboard/components';

// Lesson viewer and content components
export { default as LessonViewer } from '@/features/ensenanza/shared/components/leccion/LessonViewer';
export { default as LessonViewerWrapper } from '@/features/ensenanza/shared/components/leccion/LessonViewerWrapper';
export { default as LessonLoadingSkeleton } from '@/features/ensenanza/shared/components/leccion/LessonLoadingSkeleton';
export { default as LessonErrorState } from '@/features/ensenanza/shared/components/leccion/LessonErrorState';
export { default as TeachingLessonView } from '@/features/ensenanza/shared/components/leccion/TeachingLessonView';
export { default as TeachingTabs } from '@/features/ensenanza/shared/components/pages/TeachingTabs';
export { default as ProgressTabSkeleton } from '@/features/ensenanza/shared/dashboard/components/ProgressTabSkeleton';
export * from './content';
// Explicit imports from media to avoid conflicting star exports for VideoPlayer, MediaSkeleton, MediaFallback
export { ImageGallery, InteractiveDiagram } from '@/features/ensenanza/shared/components/media';
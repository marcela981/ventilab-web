/**
 * Teaching Feature - Canonical Barrel Export
 *
 * Import all teaching-related components from '@/features/ensenanza'.
 */

// Curriculum / module UI components
export {
  CurriculumPanel,
  CurriculumSections,
  LevelStepper,
  ModuleLessonsList,
  ModuleCard,
  Module03CurriculumView,
} from './shared/components/modulos';

// Dashboard widgets
export {
  DashboardHeader,
  ProgressOverview,
  ContinueLearningSection,
  SessionStats,
  QuickAccessLessons,
  DashboardStats,
  ModuleInfoPanel,
  Module3ProgressDashboard,
  ReadinessIndicator,
  FlashcardDashboard,
} from './shared/dashboard/components';

// Page-level / route components
export { default as TeachingModule } from './shared/components/pages/TeachingModule';
export { default as LessonViewer } from './shared/components/leccion/LessonViewer';
export { default as ProgressTracker } from './shared/progreso/ProgressTracker';
export { default as LessonViewerRouteAdapter } from './shared/components/pages/LessonViewerRouteAdapter';

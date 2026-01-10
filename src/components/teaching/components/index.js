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
} from '@/pages/teaching/components/dashboard';

// Individual component exports
export { default as LessonCard } from './LessonCard';
export { default as QuizComponent } from './QuizComponent';
export { default as SimulationControls } from './SimulationControls';

// Lesson viewer and content components
export { default as LessonViewer } from './LessonViewer';
export * from './content';
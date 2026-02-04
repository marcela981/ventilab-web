/**
 * Teaching Feature - Main Export File
 *
 * This is the canonical location for teaching-related components.
 * Import from '@/features/teaching' for all teaching functionality.
 *
 * Structure:
 * - components/curriculum: Curriculum navigation and module cards
 * - components/dashboard: Dashboard widgets and stats
 * - pages: Route adapter components
 */

// Curriculum components
export {
  CurriculumPanel,
  LevelStepper,
  ModuleLessonsList,
  ModuleCard,
  Module03CurriculumView,
} from './components/curriculum';

// Dashboard components
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
} from './components/dashboard';

// Pages / Route adapters
export { default as LessonViewerRouteAdapter } from './pages/LessonViewerRouteAdapter';

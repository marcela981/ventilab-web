/**
 * Barrel export for teaching components
 *
 * Facilita la importación de múltiples componentes desde un solo punto.
 */

// Main components exports
export * from './dashboard';
export * from './curriculum';

// Individual component exports
export { default as DashboardHeader } from './DashboardHeader';
export { default as ContinueLearningSection } from './ContinueLearningSection';
export { default as SessionStats } from './SessionStats';
export { default as FlashcardDashboard } from './FlashcardDashboard';
export { default as ProgressOverview } from './ProgressOverview';
export { default as RecommendationsPanel } from './RecommendationsPanel';
export { default as LevelStepper } from './LevelStepper';
export { default as ModuleInfoPanel } from './ModuleInfoPanel';
export { default as DashboardStats } from './DashboardStats';
export { default as LessonCard } from './LessonCard';
export { default as QuizComponent } from './QuizComponent';
export { default as SimulationControls } from './SimulationControls';

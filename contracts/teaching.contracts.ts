/**
 * VENTYLAB - TEACHING MODULE CONTRACTS (Frontend)
 * Frontend contracts for educational content UI
 */

import {
  Level,
  Module,
  Lesson,
  Step,
  UserProgress,
  LessonCompletion,
  DifficultyLevel,
  ProgressStatus,
  ContentType,
  StepType,
} from '../../../ventylab-server/src/contracts/teaching.contracts';

// Re-export backend types
export {
  Level,
  Module,
  Lesson,
  Step,
  UserProgress,
  LessonCompletion,
  DifficultyLevel,
  ProgressStatus,
  ContentType,
  StepType,
};

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useModules hook
 * Fetches and manages module list
 */
export interface UseModulesReturn {
  /** Modules list */
  modules: Module[];
  
  /** Whether modules are loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Refetch modules */
    refetch: () => Promise<void>;
    
    /** Filter modules */
    filterByLevel: (levelId?: string) => void;
    
    /** Filter by difficulty */
    filterByDifficulty: (difficulty?: DifficultyLevel) => void;
  };
}

/**
 * Return type for useModulesWithProgress hook
 * Fetches modules with user progress data
 */
export interface UseModulesWithProgressReturn {
  /** Modules with progress */
  modules: ModuleWithProgressUI[];
  
  /** Overall progress percentage */
  overallProgress: number;
  
  /** Completed modules count */
  completedCount: number;
  
  /** Total modules count */
  totalCount: number;
  
  /** Whether data is loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Refetch data */
    refetch: () => Promise<void>;
  };
}

/**
 * Return type for useLesson hook
 * Fetches and manages single lesson
 */
export interface UseLessonReturn {
  /** Lesson data */
  lesson: Lesson | null;
  
  /** Lesson steps */
  steps: Step[];
  
  /** Current step index */
  currentStepIndex: number;
  
  /** Whether lesson is loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Go to next step */
    nextStep: () => void;
    
    /** Go to previous step */
    previousStep: () => void;
    
    /** Go to specific step */
    goToStep: (index: number) => void;
    
    /** Mark lesson as complete */
    completeLesson: () => Promise<void>;
  };
}

/**
 * Return type for useProgress hook
 * Manages user progress tracking
 */
export interface UseProgressReturn {
  /** User progress records */
  progress: UserProgress[];
  
  /** Whether progress is loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Update progress */
    updateProgress: (moduleId: string, lessonId?: string) => Promise<void>;
    
    /** Mark module as started */
    startModule: (moduleId: string) => Promise<void>;
    
    /** Mark lesson as complete */
    completeLesson: (moduleId: string, lessonId: string) => Promise<void>;
    
    /** Refetch progress */
    refetch: () => Promise<void>;
  };
}

/**
 * Return type for useLessonCompletion hook
 * Manages lesson completion tracking
 */
export interface UseLessonCompletionReturn {
  /** Lesson completions */
  completions: LessonCompletion[];
  
  /** Check if lesson is completed */
  isLessonCompleted: (lessonId: string) => boolean;
  
  /** Get completion data for lesson */
  getCompletion: (lessonId: string) => LessonCompletion | undefined;
  
  /** Whether data is loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Mark lesson complete */
    markComplete: (lessonId: string) => Promise<void>;
    
    /** Update quiz score */
    updateQuizScore: (lessonId: string, score: number) => Promise<void>;
    
    /** Refetch completions */
    refetch: () => Promise<void>;
  };
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Module with progress data (UI-enhanced)
 */
export interface ModuleWithProgressUI extends Module {
  /** User progress */
  userProgress?: UserProgress;
  
  /** Lesson completions */
  lessonCompletions?: LessonCompletion[];
  
  /** Total lessons */
  totalLessons: number;
  
  /** Completed lessons */
  completedLessons: number;
  
  /** Progress percentage */
  progressPercentage: number;
  
  /** Whether module is locked (prerequisites not met) */
  isLocked: boolean;
  
  /** Whether module is new */
  isNew: boolean;
}

/**
 * Props for ModuleCard component
 */
export interface ModuleCardProps {
  /** Module data */
  module: ModuleWithProgressUI;
  
  /** Callback when module is clicked */
  onClick?: (moduleId: string) => void;
  
  /** Whether card is selected */
  selected?: boolean;
  
  /** Variant */
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Props for ModulesList component
 */
export interface ModulesListProps {
  /** Modules to display */
  modules: ModuleWithProgressUI[];
  
  /** Whether to show progress */
  showProgress?: boolean;
  
  /** Grid layout columns */
  columns?: 1 | 2 | 3 | 4;
  
  /** Whether list is loading */
  loading?: boolean;
  
  /** Callback when module is selected */
  onModuleSelect?: (moduleId: string) => void;
}

/**
 * Props for LessonViewer component
 */
export interface LessonViewerProps {
  /** Lesson ID */
  lessonId: string;
  
  /** Module ID */
  moduleId: string;
  
  /** Callback when lesson is completed */
  onComplete?: () => void;
  
  /** Callback when navigating away */
  onExit?: () => void;
  
  /** Whether to show navigation */
  showNavigation?: boolean;
}

/**
 * Props for StepContent component
 */
export interface StepContentProps {
  /** Step data */
  step: Step;
  
  /** Callback when step is complete */
  onComplete?: () => void;
  
  /** Whether step is active */
  active?: boolean;
}

/**
 * Props for ProgressBar component
 */
export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Label text */
  label?: string;
  
  /** Show percentage text */
  showPercentage?: boolean;
  
  /** Color variant */
  color?: 'primary' | 'success' | 'warning' | 'error';
  
  /** Size */
  size?: 'small' | 'medium' | 'large';
  
  /** Whether to animate */
  animated?: boolean;
}

/**
 * Props for LessonStepper component
 */
export interface LessonStepperProps {
  /** Total steps */
  totalSteps: number;
  
  /** Current step index */
  currentStep: number;
  
  /** Completed steps */
  completedSteps: number[];
  
  /** Callback when step is clicked */
  onStepClick?: (index: number) => void;
  
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Props for CurriculumTree component
 */
export interface CurriculumTreeProps {
  /** Levels with modules */
  levels: LevelWithModules[];
  
  /** Callback when item is selected */
  onItemSelect?: (type: 'level' | 'module' | 'lesson', id: string) => void;
  
  /** Whether to show progress */
  showProgress?: boolean;
  
  /** Expanded items */
  expanded?: string[];
  
  /** Callback when expansion changes */
  onExpansionChange?: (expanded: string[]) => void;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Level with modules (for tree view)
 */
export interface LevelWithModules extends Level {
  /** Modules in this level */
  modules: ModuleWithProgressUI[];
}

/**
 * Lesson navigation state
 */
export interface LessonNavigationState {
  /** Current lesson ID */
  currentLessonId: string | null;
  
  /** Previous lesson ID */
  previousLessonId: string | null;
  
  /** Next lesson ID */
  nextLessonId: string | null;
  
  /** Whether can go previous */
  canGoPrevious: boolean;
  
  /** Whether can go next */
  canGoNext: boolean;
}

/**
 * Teaching UI preferences
 */
export interface TeachingUIPreferences {
  /** View mode */
  viewMode: 'grid' | 'list' | 'tree';
  
  /** Sort by */
  sortBy: 'order' | 'title' | 'progress' | 'difficulty';
  
  /** Sort order */
  sortOrder: 'asc' | 'desc';
  
  /** Show completed modules */
  showCompleted: boolean;
  
  /** Show locked modules */
  showLocked: boolean;
  
  /** Grid columns */
  gridColumns: 1 | 2 | 3 | 4;
}

// ============================================================================
// CONTENT RENDERING TYPES
// ============================================================================

/**
 * Rendered content (markdown to HTML)
 */
export interface RenderedContent {
  /** HTML content */
  html: string;
  
  /** Table of contents */
  toc?: ContentHeading[];
  
  /** Reading time (minutes) */
  readingTime: number;
}

/**
 * Content heading (for TOC)
 */
export interface ContentHeading {
  /** Heading level (1-6) */
  level: number;
  
  /** Heading text */
  text: string;
  
  /** Anchor ID */
  id: string;
}

/**
 * Interactive content data
 */
export interface InteractiveContentData {
  /** Type of interactive content */
  type: 'quiz' | 'simulation' | 'diagram' | 'video' | 'exercise';
  
  /** Content data (specific to type) */
  data: any;
  
  /** Configuration */
  config?: any;
}

// ============================================================================
// FILTERS AND SEARCH
// ============================================================================

/**
 * Module filters
 */
export interface ModuleFilters {
  /** Level ID */
  levelId?: string;
  
  /** Difficulty */
  difficulty?: DifficultyLevel;
  
  /** Status */
  status?: ProgressStatus;
  
  /** Search query */
  search?: string;
  
  /** Show only new modules */
  showOnlyNew?: boolean;
}

/**
 * Search result
 */
export interface SearchResult {
  /** Result type */
  type: 'module' | 'lesson' | 'step';
  
  /** Item ID */
  id: string;
  
  /** Item title */
  title: string;
  
  /** Matched text snippet */
  snippet: string;
  
  /** Module ID (if lesson or step) */
  moduleId?: string;
  
  /** Lesson ID (if step) */
  lessonId?: string;
  
  /** Relevance score */
  score: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Difficulty level labels
 */
export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  [DifficultyLevel.BEGINNER]: 'Principiante',
  [DifficultyLevel.INTERMEDIATE]: 'Intermedio',
  [DifficultyLevel.ADVANCED]: 'Avanzado',
};

/**
 * Difficulty level colors
 */
export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  [DifficultyLevel.BEGINNER]: '#10b981',
  [DifficultyLevel.INTERMEDIATE]: '#f59e0b',
  [DifficultyLevel.ADVANCED]: '#ef4444',
};

/**
 * Progress status labels
 */
export const PROGRESS_STATUS_LABELS: Record<ProgressStatus, string> = {
  [ProgressStatus.NOT_STARTED]: 'No iniciado',
  [ProgressStatus.IN_PROGRESS]: 'En progreso',
  [ProgressStatus.COMPLETED]: 'Completado',
};

/**
 * Progress status colors
 */
export const PROGRESS_STATUS_COLORS: Record<ProgressStatus, string> = {
  [ProgressStatus.NOT_STARTED]: '#9ca3af',
  [ProgressStatus.IN_PROGRESS]: '#3b82f6',
  [ProgressStatus.COMPLETED]: '#10b981',
};

/**
 * Auto-save interval (milliseconds)
 */
export const PROGRESS_AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Scroll progress save threshold (percentage)
 */
export const SCROLL_SAVE_THRESHOLD = 10; // Save every 10% scroll

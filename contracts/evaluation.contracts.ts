/**
 * VENTYLAB - EVALUATION MODULE CONTRACTS (Frontend)
 * Frontend contracts for assessments and quizzes UI
 */

import {
  Evaluation,
  Question,
  EvaluationAttempt,
  SubmittedAnswer,
  EvaluationType,
  QuestionType,
  EvaluationStatus,
  AttemptStatus,
} from '../../../ventylab-server/src/contracts/evaluation.contracts';

// Re-export backend types
export {
  Evaluation,
  Question,
  EvaluationAttempt,
  SubmittedAnswer,
  EvaluationType,
  QuestionType,
  EvaluationStatus,
  AttemptStatus,
};

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useEvaluations hook
 * Fetches and manages evaluations list
 */
export interface UseEvaluationsReturn {
  /** Evaluations list */
  evaluations: EvaluationWithStatus[];
  
  /** Whether evaluations are loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Refetch evaluations */
    refetch: () => Promise<void>;
    
    /** Filter by type */
    filterByType: (type?: EvaluationType) => void;
    
    /** Filter by module */
    filterByModule: (moduleId?: string) => void;
  };
}

/**
 * Return type for useEvaluation hook
 * Manages single evaluation with attempt
 */
export interface UseEvaluationReturn {
  /** Evaluation data */
  evaluation: EvaluationForStudent | null;
  
  /** Current attempt */
  currentAttempt: EvaluationAttempt | null;
  
  /** Whether evaluation is loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Start new attempt */
    startAttempt: () => Promise<void>;
    
    /** Submit attempt */
    submitAttempt: (answers: SubmittedAnswer[]) => Promise<void>;
    
    /** Save draft */
    saveDraft: (answers: SubmittedAnswer[]) => Promise<void>;
  };
}

/**
 * Return type for useEvaluationTimer hook
 * Manages evaluation countdown timer
 */
export interface UseEvaluationTimerReturn {
  /** Time remaining in seconds */
  timeRemaining: number;
  
  /** Time elapsed in seconds */
  timeElapsed: number;
  
  /** Whether timer is running */
  isRunning: boolean;
  
  /** Whether time is up */
  isTimeUp: boolean;
  
  /** Formatted time remaining (MM:SS) */
  formattedTime: string;
  
  /** Actions */
  actions: {
    /** Start timer */
    start: () => void;
    
    /** Pause timer */
    pause: () => void;
    
    /** Resume timer */
    resume: () => void;
    
    /** Reset timer */
    reset: () => void;
  };
}

/**
 * Return type for useEvaluationAnswers hook
 * Manages answer state during attempt
 */
export interface UseEvaluationAnswersReturn {
  /** Current answers */
  answers: Map<string, SubmittedAnswer>;
  
  /** Answered questions count */
  answeredCount: number;
  
  /** Total questions count */
  totalQuestions: number;
  
  /** Whether all questions are answered */
  isComplete: boolean;
  
  /** Actions */
  actions: {
    /** Set answer for question */
    setAnswer: (questionId: string, answer: SubmittedAnswer) => void;
    
    /** Get answer for question */
    getAnswer: (questionId: string) => SubmittedAnswer | undefined;
    
    /** Clear answer for question */
    clearAnswer: (questionId: string) => void;
    
    /** Clear all answers */
    clearAll: () => void;
    
    /** Get all answers as array */
    getAllAnswers: () => SubmittedAnswer[];
  };
}

/**
 * Return type for useEvaluationResults hook
 * Fetches and manages evaluation results
 */
export interface UseEvaluationResultsReturn {
  /** Attempts */
  attempts: EvaluationAttempt[];
  
  /** Best attempt */
  bestAttempt: EvaluationAttempt | null;
  
  /** Latest attempt */
  latestAttempt: EvaluationAttempt | null;
  
  /** Average score */
  averageScore: number | null;
  
  /** Whether results are loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Refetch results */
    refetch: () => Promise<void>;
  };
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Evaluation with user status (UI-enhanced)
 */
export interface EvaluationWithStatus extends Evaluation {
  /** User's best score */
  bestScore?: number;
  
  /** User's attempts count */
  attemptsCount: number;
  
  /** Remaining attempts */
  remainingAttempts?: number;
  
  /** Whether user can start attempt */
  canStartAttempt: boolean;
  
  /** Whether evaluation is locked */
  isLocked: boolean;
  
  /** Last attempt date */
  lastAttemptDate?: Date;
}

/**
 * Evaluation for student (sanitized, from backend)
 */
export interface EvaluationForStudent {
  /** Evaluation ID */
  id: string;
  
  /** Title */
  title: string;
  
  /** Description */
  description: string;
  
  /** Type */
  type: EvaluationType;
  
  /** Passing score */
  passingScore: number;
  
  /** Time limit */
  timeLimit?: number;
  
  /** Max attempts */
  maxAttempts?: number;
  
  /** Total points */
  totalPoints: number;
  
  /** Instructions */
  instructions?: string;
  
  /** Questions (sanitized) */
  questions: Question[];
  
  /** User's previous attempts */
  userAttempts: {
    id: string;
    attemptNumber: number;
    score?: number;
    passed?: boolean;
    submittedAt?: Date;
  }[];
  
  /** Remaining attempts */
  remainingAttempts?: number;
  
  /** Can start attempt */
  canStartAttempt: boolean;
}

/**
 * Props for EvaluationCard component
 */
export interface EvaluationCardProps {
  /** Evaluation data */
  evaluation: EvaluationWithStatus;
  
  /** Callback when evaluation is clicked */
  onClick?: (evaluationId: string) => void;
  
  /** Variant */
  variant?: 'default' | 'compact' | 'detailed';
  
  /** Whether card is selected */
  selected?: boolean;
}

/**
 * Props for EvaluationsList component
 */
export interface EvaluationsListProps {
  /** Evaluations to display */
  evaluations: EvaluationWithStatus[];
  
  /** Whether list is loading */
  loading?: boolean;
  
  /** Callback when evaluation is selected */
  onEvaluationSelect?: (evaluationId: string) => void;
  
  /** Filter */
  filter?: {
    type?: EvaluationType;
    moduleId?: string;
    showCompleted?: boolean;
  };
}

/**
 * Props for QuestionRenderer component
 */
export interface QuestionRendererProps {
  /** Question data */
  question: Question;
  
  /** Question number */
  questionNumber: number;
  
  /** Current answer */
  answer?: SubmittedAnswer;
  
  /** Callback when answer changes */
  onAnswerChange: (answer: SubmittedAnswer) => void;
  
  /** Whether to show correct answer (after submission) */
  showCorrectAnswer?: boolean;
  
  /** Whether question is disabled */
  disabled?: boolean;
}

/**
 * Props for EvaluationTimer component
 */
export interface EvaluationTimerProps {
  /** Time limit in minutes */
  timeLimitMinutes: number;
  
  /** Callback when time is up */
  onTimeUp: () => void;
  
  /** Whether timer is paused */
  paused?: boolean;
  
  /** Variant */
  variant?: 'default' | 'compact' | 'prominent';
}

/**
 * Props for ProgressIndicator component
 */
export interface ProgressIndicatorProps {
  /** Answered questions */
  answered: number;
  
  /** Total questions */
  total: number;
  
  /** Show percentage */
  showPercentage?: boolean;
  
  /** Variant */
  variant?: 'bar' | 'circular' | 'text';
}

/**
 * Props for EvaluationResults component
 */
export interface EvaluationResultsProps {
  /** Attempt data */
  attempt: EvaluationAttempt;
  
  /** Evaluation data */
  evaluation: Pick<Evaluation, 'id' | 'title' | 'passingScore' | 'totalPoints'>;
  
  /** Whether to show detailed feedback */
  showDetails?: boolean;
  
  /** Callback when retry is clicked */
  onRetry?: () => void;
}

/**
 * Props for ScoreDisplay component
 */
export interface ScoreDisplayProps {
  /** Score percentage */
  score: number;
  
  /** Passing score */
  passingScore: number;
  
  /** Points earned */
  pointsEarned?: number;
  
  /** Total points */
  totalPoints?: number;
  
  /** Size */
  size?: 'small' | 'medium' | 'large';
  
  /** Variant */
  variant?: 'default' | 'detailed' | 'minimal';
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Evaluation attempt UI state
 */
export interface EvaluationAttemptUIState {
  /** Current question index */
  currentQuestionIndex: number;
  
  /** Flagged questions */
  flaggedQuestions: Set<string>;
  
  /** Review mode */
  reviewMode: boolean;
  
  /** Show navigation */
  showNavigation: boolean;
  
  /** Confirm submit dialog open */
  confirmSubmitOpen: boolean;
}

/**
 * Evaluation preferences
 */
export interface EvaluationPreferences {
  /** Auto-save interval (seconds) */
  autoSaveInterval: number;
  
  /** Show timer */
  showTimer: boolean;
  
  /** Show progress */
  showProgress: boolean;
  
  /** Confirm before submit */
  confirmBeforeSubmit: boolean;
  
  /** Sound alerts */
  soundAlerts: boolean;
}

// ============================================================================
// VALIDATION AND FEEDBACK
// ============================================================================

/**
 * Answer feedback (after submission)
 */
export interface AnswerFeedback {
  /** Question ID */
  questionId: string;
  
  /** Whether answer was correct */
  isCorrect: boolean;
  
  /** Points earned */
  pointsEarned: number;
  
  /** Maximum points */
  maxPoints: number;
  
  /** Explanation */
  explanation?: string;
  
  /** Correct answer (if applicable) */
  correctAnswer?: any;
  
  /** User's answer */
  userAnswer: any;
}

/**
 * Evaluation attempt summary
 */
export interface AttemptSummary {
  /** Attempt ID */
  attemptId: string;
  
  /** Score */
  score: number;
  
  /** Points earned */
  pointsEarned: number;
  
  /** Total points */
  totalPoints: number;
  
  /** Passed */
  passed: boolean;
  
  /** Time spent (minutes) */
  timeSpent: number;
  
  /** Correct answers count */
  correctAnswers: number;
  
  /** Total questions */
  totalQuestions: number;
  
  /** Submitted at */
  submittedAt: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Evaluation type labels
 */
export const EVALUATION_TYPE_LABELS: Record<EvaluationType, string> = {
  [EvaluationType.QUIZ]: 'Quiz',
  [EvaluationType.EXAM]: 'Examen',
  [EvaluationType.WORKSHOP]: 'Taller',
  [EvaluationType.CLINICAL_CASE]: 'Caso Clínico',
  [EvaluationType.SIMULATOR_PRACTICAL]: 'Práctica de Simulador',
};

/**
 * Question type labels
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.MULTIPLE_CHOICE]: 'Opción Múltiple',
  [QuestionType.TRUE_FALSE]: 'Verdadero/Falso',
  [QuestionType.SHORT_ANSWER]: 'Respuesta Corta',
  [QuestionType.ESSAY]: 'Ensayo',
  [QuestionType.MATCHING]: 'Relacionar',
  [QuestionType.FILL_BLANK]: 'Completar',
  [QuestionType.SIMULATOR_CONFIG]: 'Configuración de Simulador',
};

/**
 * Auto-save interval (milliseconds)
 */
export const EVALUATION_AUTO_SAVE_INTERVAL = 60 * 1000; // 1 minute

/**
 * Time warning thresholds (minutes)
 */
export const TIME_WARNING_THRESHOLDS = {
  WARNING: 5,
  CRITICAL: 1,
};

/**
 * Score color thresholds
 */
export const SCORE_COLOR_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  PASSING: 60,
};

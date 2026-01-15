/**
 * Progress Type Definitions for Frontend
 * 
 * These types match the DTOs defined in backend/src/types/progress.ts
 * They provide type safety and IntelliSense for frontend code.
 * 
 * All dates are ISO 8601 strings in JSON responses.
 */

/**
 * Lesson Progress DTO
 * Represents the progress of a single lesson
 */
export interface LessonProgressDTO {
  /** Unique identifier for the lesson progress record */
  id: string;
  /** Reference to the learning progress (module-level) */
  progressId: string;
  /** Unique identifier of the lesson */
  lessonId: string;
  /** Whether the lesson is completed */
  completed: boolean;
  /** Time spent on the lesson in minutes */
  timeSpent: number;
  /** Last time the lesson was accessed (ISO 8601 string or null) */
  lastAccessed: string | null;
  /** Progress value between 0.0 and 1.0 */
  progress: number;
  /** Completion percentage (0-100) */
  completionPercentage?: number;
  /** When the record was created (ISO 8601 string) */
  createdAt: string;
  /** When the record was last updated (ISO 8601 string) */
  updatedAt: string;
}

/**
 * Learning Progress DTO
 * Represents the progress of a user in a module
 */
export interface LearningProgressDTO {
  /** Unique identifier for the learning progress record */
  id: string;
  /** Unique identifier of the user */
  userId: string;
  /** Unique identifier of the module */
  moduleId: string;
  /** When the module was completed (ISO 8601 string or null) */
  completedAt: string | null;
  /** Total time spent on the module in minutes */
  timeSpent: number;
  /** Average score for the module (0-100) or null if no scores available */
  score: number | null;
  /** When the record was created (ISO 8601 string) */
  createdAt: string;
  /** When the record was last updated (ISO 8601 string) */
  updatedAt: string;
}

/**
 * Module Progress Response DTO
 * Response from GET /api/progress/modules/:moduleId
 */
export interface ModuleProgressResponseDTO {
  /** Learning progress for the module */
  learningProgress: LearningProgressDTO;
  /** Array of lesson progress records for all lessons in the module */
  lessonProgress: LessonProgressDTO[];
  /** Whether the module is available (prerequisites met) */
  isAvailable?: boolean;
}

/**
 * Module Progress Summary Item DTO
 * Represents a module in the progress summary
 */
export interface ModuleProgressSummaryDTO {
  /** Unique identifier of the module */
  moduleId: string;
  /** Title of the module */
  moduleTitle: string;
  /** Completion percentage (0-100) */
  progressPercentage: number;
  /** Total time spent on the module in minutes */
  timeSpent: number;
  /** Average score for the module (0-100) or null */
  score: number | null;
  /** Whether the module is fully completed */
  isCompleted: boolean;
  /** When the module was completed (ISO 8601 string or null) */
  completedAt: string | null;
}

/**
 * Progress Summary Response DTO
 * Response from GET /api/progress/summary
 */
export interface ProgressSummaryResponseDTO {
  /** Array of module progress summaries */
  modules: ModuleProgressSummaryDTO[];
}

/**
 * Update Lesson Progress Request DTO
 * Request body for PUT /api/progress/lesson/:lessonId
 */
export interface UpdateLessonProgressRequestDTO {
  /** Progress value between 0.0 and 1.0 (optional) */
  progress?: number;
  /** Whether the lesson is completed (optional) */
  completed?: boolean;
  /** Completion percentage (0-100) (optional) */
  completionPercentage?: number;
  /** Time spent delta in minutes (will be added to existing timeSpent) (optional) */
  timeSpentDelta?: number;
  /** Last accessed timestamp (ISO 8601 string) (optional) */
  lastAccessed?: string;
}

/**
 * Update Lesson Progress Response DTO
 * Response from PUT /api/progress/lesson/:lessonId
 */
export interface UpdateLessonProgressResponseDTO {
  /** Updated lesson progress */
  lessonProgress: LessonProgressDTO;
  /** Updated module progress aggregates */
  moduleProgress: {
    /** Completion percentage (0-100) */
    progressPercentage: number;
    /** Total time spent in minutes */
    timeSpent: number;
    /** Average score or null */
    score: number | null;
    /** Whether module is completed */
    isCompleted: boolean;
    /** When module was completed (ISO 8601 string or null) */
    completedAt: string | null;
  };
}

/**
 * Standard API Response Wrapper
 * All endpoints return responses in this format
 */
export interface ApiResponseDTO<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data: T;
  /** Success message */
  message?: string;
  /** Error information (only present if success is false) */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}


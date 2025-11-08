/**
 * Progress Service
 * Business logic for progress tracking operations
 * Handles LearningProgress and LessonProgress operations with atomic transactions
 */

import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS } from '../config/constants';
import type {
  LessonProgressDTO,
  LearningProgressDTO,
  ModuleProgressResponseDTO,
  ProgressSummaryResponseDTO,
  ModuleProgressSummaryDTO
} from '../types/progress';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface LessonProgressUpdate {
  lessonId: string;
  progress?: number; // 0..1
  completed?: boolean;
  timeSpentDelta?: number; // in minutes, will be added to existing timeSpent
  lastAccessed?: Date;
}

// Internal types (using Date objects)
interface ModuleProgressResponseInternal {
  learningProgress: {
    id: string;
    userId: string;
    moduleId: string;
    completedAt: Date | null;
    timeSpent: number;
    score: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  lessonProgress: Array<{
    id: string;
    progressId: string;
    lessonId: string;
    completed: boolean;
    timeSpent: number;
    lastAccessed: Date | null;
    progress: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

// =============================================================================
// PURE FUNCTIONS FOR AGGREGATIONS
// =============================================================================

/**
 * Calculate module completion percentage based on lesson progress
 * Pure function - no side effects
 * 
 * @param totalLessons - Total number of lessons in module
 * @param completedLessons - Number of completed lessons
 * @returns Progress percentage (0-100)
 */
export function calculateModuleProgressPercentage(
  totalLessons: number,
  completedLessons: number
): number {
  if (totalLessons === 0) {
    return 0;
  }
  return Math.round((completedLessons / totalLessons) * 100);
}

/**
 * Calculate average score from lesson progress
 * Pure function - no side effects
 * 
 * @param lessonProgress - Array of lesson progress with scores
 * @returns Average score or null if no scores available
 */
export function calculateAverageScore(
  lessonProgress: Array<{ score?: number | null }>
): number | null {
  const scores = lessonProgress
    .map(lp => lp.score)
    .filter((score): score is number => score !== null && score !== undefined);

  if (scores.length === 0) {
    return null;
  }

  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / scores.length) * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if all lessons in a module are completed
 * Pure function - no side effects
 * 
 * @param lessonProgress - Array of lesson progress
 * @param totalLessons - Total number of lessons in module
 * @returns true if all lessons are completed
 */
export function areAllLessonsCompleted(
  lessonProgress: Array<{ completed: boolean }>,
  totalLessons: number
): boolean {
  if (totalLessons === 0) {
    return false;
  }
  
  const completedCount = lessonProgress.filter(lp => lp.completed).length;
  return completedCount === totalLessons;
}

/**
 * Calculate total time spent from lesson progress
 * Pure function - no side effects
 * 
 * @param lessonProgress - Array of lesson progress
 * @returns Total time spent in minutes
 */
export function calculateTotalTimeSpent(
  lessonProgress: Array<{ timeSpent: number }>
): number {
  return lessonProgress.reduce((sum, lp) => sum + lp.timeSpent, 0);
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Convert internal progress response to DTO (with Date to string conversion)
 */
function toModuleProgressDTO(
  internal: ModuleProgressResponseInternal
): ModuleProgressResponseDTO {
  return {
    learningProgress: {
      id: internal.learningProgress.id,
      userId: internal.learningProgress.userId,
      moduleId: internal.learningProgress.moduleId,
      completedAt: internal.learningProgress.completedAt?.toISOString() ?? null,
      timeSpent: internal.learningProgress.timeSpent,
      score: internal.learningProgress.score,
      createdAt: internal.learningProgress.createdAt.toISOString(),
      updatedAt: internal.learningProgress.updatedAt.toISOString()
    },
    lessonProgress: internal.lessonProgress.map(lp => ({
      id: lp.id,
      progressId: lp.progressId,
      lessonId: lp.lessonId,
      completed: lp.completed,
      timeSpent: lp.timeSpent,
      lastAccessed: lp.lastAccessed?.toISOString() ?? null,
      progress: lp.progress,
      createdAt: lp.createdAt.toISOString(),
      updatedAt: lp.updatedAt.toISOString()
    }))
  };
}

/**
 * Get module progress with all lesson progress
 * 
 * @param userId - User ID
 * @param moduleId - Module ID
 * @returns Module progress with lesson progress array (DTO format)
 */
export async function getModuleProgress(
  userId: string,
  moduleId: string
): Promise<ModuleProgressResponseDTO> {
  // Verify module exists
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        select: { id: true },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!module) {
    throw new AppError(
      'Module not found',
      HTTP_STATUS.NOT_FOUND,
      'MODULE_NOT_FOUND'
    );
  }

  // Get or create learning progress
  let learningProgress = await prisma.learningProgress.findUnique({
    where: {
      userId_moduleId: {
        userId,
        moduleId
      }
    },
    include: {
      lessonProgress: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  // If no learning progress exists, create it
  if (!learningProgress) {
    learningProgress = await prisma.learningProgress.create({
      data: {
        userId,
        moduleId,
        timeSpent: 0
      },
      include: {
        lessonProgress: true
      }
    });
  }

  // Ensure all lessons have progress records
  const existingLessonIds = new Set(
    learningProgress.lessonProgress.map(lp => lp.lessonId)
  );

  const missingLessons = module.lessons.filter(
    lesson => !existingLessonIds.has(lesson.id)
  );

  if (missingLessons.length > 0) {
    // Create missing lesson progress records
    await prisma.lessonProgress.createMany({
      data: missingLessons.map(lesson => ({
        progressId: learningProgress!.id,
        lessonId: lesson.id,
        completed: false,
        timeSpent: 0,
        progress: 0
      }))
    });

    // Refetch with all lesson progress
    learningProgress = await prisma.learningProgress.findUnique({
      where: { id: learningProgress.id },
      include: {
        lessonProgress: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })!;
  }

  return toModuleProgressDTO({
    learningProgress: {
      id: learningProgress.id,
      userId: learningProgress.userId,
      moduleId: learningProgress.moduleId,
      completedAt: learningProgress.completedAt,
      timeSpent: learningProgress.timeSpent,
      score: learningProgress.score,
      createdAt: learningProgress.createdAt,
      updatedAt: learningProgress.updatedAt
    },
    lessonProgress: learningProgress.lessonProgress.map(lp => ({
      id: lp.id,
      progressId: lp.progressId,
      lessonId: lp.lessonId,
      completed: lp.completed,
      timeSpent: lp.timeSpent,
      lastAccessed: lp.lastAccessed,
      progress: lp.progress,
      createdAt: lp.createdAt,
      updatedAt: lp.updatedAt
    }))
  });
}

/**
 * Update lesson progress and recalculate module aggregates
 * Uses atomic transaction to ensure consistency
 * 
 * @param userId - User ID
 * @param update - Lesson progress update data
 * @returns Updated module progress (DTO format)
 */
export async function updateLessonProgress(
  userId: string,
  update: LessonProgressUpdate
): Promise<ModuleProgressResponseDTO> {
  // Validate lesson exists and get moduleId
  const lesson = await prisma.lesson.findUnique({
    where: { id: update.lessonId },
    include: {
      module: {
        include: {
          lessons: {
            select: { id: true }
          }
        }
      }
    }
  });

  if (!lesson) {
    throw new AppError(
      'Lesson not found',
      HTTP_STATUS.NOT_FOUND,
      'LESSON_NOT_FOUND'
    );
  }

  const moduleId = lesson.moduleId;
  const totalLessons = lesson.module.lessons.length;

  // Use transaction for atomic updates
  return await prisma.$transaction(async (tx) => {
    // Get or create learning progress
    let learningProgress = await tx.learningProgress.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId
        }
      },
      include: {
        lessonProgress: true
      }
    });

    if (!learningProgress) {
      learningProgress = await tx.learningProgress.create({
        data: {
          userId,
          moduleId,
          timeSpent: 0
        },
        include: {
          lessonProgress: true
        }
      });
    }

    // Get current lesson progress or create if doesn't exist
    let currentLessonProgress = learningProgress.lessonProgress.find(
      lp => lp.lessonId === update.lessonId
    );

    // Calculate new timeSpent: if timeSpentDelta is provided, add it to existing
    // Otherwise, keep existing or default to 0
    let newTimeSpent = currentLessonProgress?.timeSpent ?? 0;
    if (update.timeSpentDelta !== undefined) {
      newTimeSpent = Math.max(0, newTimeSpent + update.timeSpentDelta);
    }

    // Prepare final update data with proper defaults and merging
    const finalUpdateData: {
      progress: number;
      completed: boolean;
      timeSpent: number;
      lastAccessed: Date | null;
    } = {
      progress: update.progress !== undefined
        ? Math.max(0, Math.min(1, update.progress)) // Clamp between 0 and 1
        : currentLessonProgress?.progress ?? 0,
      completed: update.completed !== undefined
        ? update.completed
        : currentLessonProgress?.completed ?? false,
      timeSpent: newTimeSpent,
      lastAccessed: update.lastAccessed !== undefined
        ? update.lastAccessed
        : currentLessonProgress?.lastAccessed ?? new Date()
    };

    // Auto-update lastAccessed if any field is being updated (except if explicitly provided)
    if (update.lastAccessed === undefined && (
      update.progress !== undefined ||
      update.completed !== undefined ||
      update.timeSpentDelta !== undefined
    )) {
      finalUpdateData.lastAccessed = new Date();
    }

    // Upsert lesson progress
    await tx.lessonProgress.upsert({
      where: {
        progressId_lessonId: {
          progressId: learningProgress.id,
          lessonId: update.lessonId
        }
      },
      create: {
        progressId: learningProgress.id,
        lessonId: update.lessonId,
        ...finalUpdateData
      },
      update: finalUpdateData
    });

    // Recalculate aggregates - get all lesson progress for this module
    const allLessonProgress = await tx.lessonProgress.findMany({
      where: {
        progressId: learningProgress.id
      }
    });

    // Calculate totals using pure functions
    // totalTimeSpent is sum of all lesson progress timeSpent
    const totalTimeSpent = calculateTotalTimeSpent(allLessonProgress);
    const completedLessons = allLessonProgress.filter(lp => lp.completed).length;
    const progressPercentage = calculateModuleProgressPercentage(totalLessons, completedLessons);
    const allCompleted = areAllLessonsCompleted(allLessonProgress, totalLessons);
    // Average score is calculated from lesson progress scores (if any)
    // Note: LessonProgress doesn't have score field, so this will be null
    // Score would need to come from quiz results or similar
    const averageScore = calculateAverageScore(allLessonProgress);

    // Update learning progress with aggregates
    const updatedLearningProgress = await tx.learningProgress.update({
      where: { id: learningProgress.id },
      data: {
        timeSpent: totalTimeSpent,
        score: averageScore,
        completedAt: allCompleted ? new Date() : null
      },
      include: {
        lessonProgress: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return toModuleProgressDTO({
      learningProgress: {
        id: updatedLearningProgress.id,
        userId: updatedLearningProgress.userId,
        moduleId: updatedLearningProgress.moduleId,
        completedAt: updatedLearningProgress.completedAt,
        timeSpent: updatedLearningProgress.timeSpent,
        score: updatedLearningProgress.score,
        createdAt: updatedLearningProgress.createdAt,
        updatedAt: updatedLearningProgress.updatedAt
      },
      lessonProgress: updatedLearningProgress.lessonProgress.map(lp => ({
        id: lp.id,
        progressId: lp.progressId,
        lessonId: lp.lessonId,
        completed: lp.completed,
        timeSpent: lp.timeSpent,
        lastAccessed: lp.lastAccessed,
        progress: lp.progress,
        createdAt: lp.createdAt,
        updatedAt: lp.updatedAt
      }))
    });
  });
}

/**
 * Get progress summary for all modules
 * 
 * @param userId - User ID
 * @returns Progress summary by module (DTO format)
 */
export async function getProgressSummary(
  userId: string
): Promise<ProgressSummaryResponseDTO> {
  // Get all active modules with lessons
  const modules = await prisma.module.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        select: { id: true }
      }
    }
  });

  // Get all learning progress for user
  const learningProgress = await prisma.learningProgress.findMany({
    where: { userId },
    include: {
      lessonProgress: true,
      module: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  // Create a map for quick lookup
  const progressMap = new Map(
    learningProgress.map(lp => [lp.moduleId, lp])
  );

  // Build summary items
  const summaryItems: ProgressSummaryItem[] = modules.map(module => {
    const progress = progressMap.get(module.id);
    const totalLessons = module.lessons.length;

    if (!progress) {
      return {
        moduleId: module.id,
        moduleTitle: module.title,
        progressPercentage: 0,
        timeSpent: 0,
        score: null,
        isCompleted: false,
        completedAt: null
      };
    }

    const completedLessons = progress.lessonProgress.filter(lp => lp.completed).length;
    const progressPercentage = calculateModuleProgressPercentage(
      totalLessons,
      completedLessons
    );
    const allCompleted = areAllLessonsCompleted(
      progress.lessonProgress,
      totalLessons
    );

    return {
      moduleId: module.id,
      moduleTitle: module.title,
      progressPercentage,
      timeSpent: progress.timeSpent,
      score: progress.score,
      isCompleted: allCompleted,
      completedAt: progress.completedAt?.toISOString() ?? null
    };
  });

  return {
    modules: summaryItems
  };
}


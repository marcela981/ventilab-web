/**
 * Progress Controller
 * Handles all progress tracking operations for VentyLab
 * Including module progress, lesson tracking, streaks, and recommendations
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS } from '../config/constants';
import * as achievementService from '../services/achievement.service';
import * as progressService from '../services/progress.service';
import type {
  UpdateLessonProgressResponseDTO,
  ApiResponseDTO
} from '../types/progress';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ProgressStats {
  totalModules: number;
  completedModules: number;
  totalLessons: number;
  completedLessons: number;
  totalTimeSpent: number;
  globalProgressPercentage: number;
  streak: number;
}


interface NextLessonRecommendation {
  moduleId: string;
  lessonId: string;
  moduleTitle: string;
  lessonTitle: string;
  estimatedTime: number;
  currentProgress: number;
}

interface StreakInfo {
  streak: number;
  lastSessionDate: string | null;
  isActive: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate streak of consecutive days from learning sessions
 *
 * @param sessions - Array of learning sessions ordered by startTime DESC
 * @returns Number of consecutive days with at least one session
 */
function calculateStreak(sessions: Array<{ startTime: Date }>): number {
  if (!sessions || sessions.length === 0) {
    return 0;
  }

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group sessions by day
  const sessionsByDay = new Map<string, boolean>();
  sessions.forEach(session => {
    const sessionDate = new Date(session.startTime);
    sessionDate.setHours(0, 0, 0, 0);
    const dateKey = sessionDate.toISOString().split('T')[0];
    sessionsByDay.set(dateKey, true);
  });

  // Count consecutive days from today backwards
  let currentDate = new Date(today);

  // Check if there's a session today or yesterday to start the streak
  const todayKey = currentDate.toISOString().split('T')[0];
  currentDate.setDate(currentDate.getDate() - 1);
  const yesterdayKey = currentDate.toISOString().split('T')[0];

  if (!sessionsByDay.has(todayKey) && !sessionsByDay.has(yesterdayKey)) {
    return 0; // Streak is broken
  }

  // Start counting from today or yesterday
  currentDate = new Date(today);

  while (true) {
    const dateKey = currentDate.toISOString().split('T')[0];

    if (sessionsByDay.has(dateKey)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break; // Streak is broken
    }
  }

  return streak;
}

/**
 * Check if all prerequisites for a module are met
 *
 * @param moduleId - ID of the module to check
 * @param userId - ID of the user
 * @returns true if all prerequisites are completed
 */
async function arePrerequisitesMet(moduleId: string, userId: string): Promise<boolean> {
  // Get module with prerequisites
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      prerequisites: {
        include: {
          prerequisite: true
        }
      }
    }
  });

  if (!module) {
    return false;
  }

  // If no prerequisites, module is available
  if (!module.prerequisites || module.prerequisites.length === 0) {
    return true;
  }

  // Check if all prerequisites are completed
  for (const prereq of module.prerequisites) {
    const progress = await prisma.learningProgress.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId: prereq.prerequisiteId
        }
      }
    });

    // Prerequisite must be completed
    if (!progress || !progress.completedAt) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate module progress percentage
 *
 * @param moduleId - ID of the module
 * @param userId - ID of the user
 * @returns Progress percentage (0-100)
 */
async function calculateModuleProgress(moduleId: string, userId: string): Promise<number> {
  // Get all lessons for the module
  const lessons = await prisma.lesson.findMany({
    where: { moduleId },
    select: { id: true }
  });

  if (lessons.length === 0) {
    return 0;
  }

  // Get learning progress for this module
  const learningProgress = await prisma.learningProgress.findUnique({
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
    return 0;
  }

  // Count completed lessons
  const completedCount = learningProgress.lessonProgress.filter(
    lp => lp.completed
  ).length;

  return Math.round((completedCount / lessons.length) * 100);
}

// =============================================================================
// CONTROLLER FUNCTIONS
// =============================================================================

/**
 * Get overall user progress
 *
 * @route   GET /api/progress
 * @access  Private
 * @returns Global progress statistics
 */
export const getUserProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    console.log(`[Progress] Fetching progress for user: ${userId}`);

    // Get all modules
    const allModules = await prisma.module.findMany({
      where: { isActive: true },
      select: { id: true }
    });

    // Get all lessons
    const allLessons = await prisma.lesson.findMany({
      select: { id: true }
    });

    // Get user's learning progress
    const userProgress = await prisma.learningProgress.findMany({
      where: { userId },
      include: {
        lessonProgress: {
          where: { completed: true }
        }
      }
    });

    // Get user's learning sessions for streak calculation
    const sessions = await prisma.learningSession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      select: { startTime: true }
    });

    // Calculate statistics
    const completedModules = userProgress.filter(p => p.completedAt !== null).length;
    const totalTimeSpent = userProgress.reduce((sum, p) => sum + p.timeSpent, 0);
    const completedLessons = userProgress.reduce(
      (sum, p) => sum + p.lessonProgress.length,
      0
    );
    const streak = calculateStreak(sessions);
    const globalProgressPercentage = allModules.length > 0
      ? Math.round((completedModules / allModules.length) * 100)
      : 0;

    const stats: ProgressStats = {
      totalModules: allModules.length,
      completedModules,
      totalLessons: allLessons.length,
      completedLessons,
      totalTimeSpent,
      globalProgressPercentage,
      streak
    };

    console.log(`[Progress] Stats calculated:`, stats);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
      message: 'Progress retrieved successfully'
    });
  } catch (error) {
    console.error('[Progress] Error fetching user progress:', error);
    next(error);
  }
};

/**
 * Get detailed progress for a specific module
 * Uses the new ProgressService
 *
 * @route   GET /api/progress/modules/:moduleId
 * @access  Private
 * @returns LearningProgress + array of LessonProgress
 */
export const getModuleProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { moduleId } = req.params;

    console.log(`[Progress] Fetching module progress for user: ${userId}, module: ${moduleId}`);

    const moduleProgress = await progressService.getModuleProgress(userId, moduleId);

    // Check if prerequisites are met
    const prerequisitesMet = await arePrerequisitesMet(moduleId, userId);

    const response: ApiResponseDTO<typeof moduleProgress & { isAvailable: boolean }> = {
      success: true,
      data: {
        ...moduleProgress,
        isAvailable: prerequisitesMet
      },
      message: 'Module progress retrieved successfully'
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    console.error('[Progress] Error fetching module progress:', error);
    next(error);
  }
};

/**
 * Update lesson progress (upsert)
 * Uses ProgressService for atomic updates with aggregate recalculation
 *
 * @route   PUT /api/progress/lesson
 * @access  Private
 * @body    { lessonId, progress?, completed?, timeSpentDelta?, lastAccessed? }
 * @returns Updated module progress with recalculated aggregates
 */
export const updateLessonProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { lessonId, progress, completed, timeSpentDelta, lastAccessed } = req.body;

    if (!lessonId) {
      throw new AppError(
        'lessonId is required',
        HTTP_STATUS.BAD_REQUEST,
        'LESSON_ID_REQUIRED'
      );
    }

    console.log(`[Progress] Updating lesson progress for user: ${userId}, lesson: ${lessonId}`);

    // Convert request DTO to service update format
    const updateData: progressService.LessonProgressUpdate = {
      lessonId,
      ...(progress !== undefined && { progress }),
      ...(completed !== undefined && { completed }),
      ...(timeSpentDelta !== undefined && { timeSpentDelta }),
      ...(lastAccessed !== undefined && { lastAccessed: new Date(lastAccessed) })
    };

    const moduleProgress = await progressService.updateLessonProgress(userId, updateData);

    // Get the updated lesson progress
    const updatedLessonProgress = moduleProgress.lessonProgress.find(
      lp => lp.lessonId === lessonId
    );

    if (!updatedLessonProgress) {
      throw new AppError(
        'Failed to update lesson progress',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'UPDATE_FAILED'
      );
    }

    console.log(`[Progress] Lesson progress updated successfully`);

    const response: ApiResponseDTO<UpdateLessonProgressResponseDTO> = {
      success: true,
      data: {
        lessonProgress: updatedLessonProgress,
        moduleProgress: {
          progressPercentage: progressService.calculateModuleProgressPercentage(
            moduleProgress.lessonProgress.length,
            moduleProgress.lessonProgress.filter(lp => lp.completed).length
          ),
          timeSpent: moduleProgress.learningProgress.timeSpent,
          score: moduleProgress.learningProgress.score,
          isCompleted: moduleProgress.learningProgress.completedAt !== null,
          completedAt: moduleProgress.learningProgress.completedAt
        }
      },
      message: 'Lesson progress updated successfully'
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    console.error('[Progress] Error updating lesson progress:', error);
    next(error);
  }
};

/**
 * Mark a lesson as started
 *
 * @route   POST /api/progress/lessons/:lessonId/start
 * @access  Private
 * @returns Updated lesson progress
 */
export const startLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { lessonId } = req.params;

    console.log(`[Progress] Starting lesson for user: ${userId}, lesson: ${lessonId}`);

    // Get lesson with module info
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true }
    });

    if (!lesson) {
      throw new AppError(
        'Lesson not found',
        HTTP_STATUS.NOT_FOUND,
        'LESSON_NOT_FOUND'
      );
    }

    // Check if module prerequisites are met
    const prerequisitesMet = await arePrerequisitesMet(lesson.moduleId, userId);
    if (!prerequisitesMet) {
      throw new AppError(
        'Module prerequisites not met',
        HTTP_STATUS.FORBIDDEN,
        'PREREQUISITES_NOT_MET'
      );
    }

    // Use ProgressService to update lesson progress
    const moduleProgress = await progressService.updateLessonProgress(userId, {
      lessonId,
      lastAccessed: new Date()
    });

    const lessonProgress = moduleProgress.lessonProgress.find(lp => lp.lessonId === lessonId);

    // Create or update learning session
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.learningSession.upsert({
      where: {
        id: `${userId}-${today.toISOString()}`
      },
      update: {
        lessonsViewed: { increment: 1 }
      },
      create: {
        id: `${userId}-${today.toISOString()}`,
        userId,
        startTime: new Date(),
        lessonsViewed: 1,
        quizzesTaken: 0
      }
    });

    console.log(`[Progress] Lesson started successfully`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        lessonId: lessonProgress!.lessonId,
        completed: lessonProgress!.completed,
        lastAccessed: lessonProgress!.lastAccessed
      },
      message: 'Lesson started successfully'
    });
  } catch (error) {
    console.error('[Progress] Error starting lesson:', error);
    next(error);
  }
};

/**
 * Mark a lesson as completed
 *
 * @route   POST /api/progress/lessons/:lessonId/complete
 * @access  Private
 * @body    timeSpent - Time spent on lesson in minutes
 * @returns Updated lesson progress and achievements
 */
export const completeLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { lessonId } = req.params;
    const { timeSpent = 0 } = req.body;

    console.log(`[Progress] Completing lesson for user: ${userId}, lesson: ${lessonId}`);

    // Get lesson with module info
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            lessons: true
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

    // Get learning progress for module
    let learningProgress = await prisma.learningProgress.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId: lesson.moduleId
        }
      },
      include: {
        lessonProgress: true
      }
    });

    if (!learningProgress) {
      throw new AppError(
        'Learning progress not found. Please start the lesson first.',
        HTTP_STATUS.BAD_REQUEST,
        'PROGRESS_NOT_FOUND'
      );
    }

    // Update lesson progress
    const lessonProgress = await prisma.lessonProgress.upsert({
      where: {
        progressId_lessonId: {
          progressId: learningProgress.id,
          lessonId
        }
      },
      update: {
        completed: true,
        timeSpent: { increment: timeSpent },
        lastAccessed: new Date()
      },
      create: {
        progressId: learningProgress.id,
        lessonId,
        completed: true,
        timeSpent,
        lastAccessed: new Date()
      }
    });

    // Update learning progress time spent
    learningProgress = await prisma.learningProgress.update({
      where: { id: learningProgress.id },
      data: {
        timeSpent: { increment: timeSpent }
      },
      include: {
        lessonProgress: true
      }
    });

    // Check if all lessons in module are completed
    const allLessonsCompleted = lesson.module.lessons.every(l => {
      return learningProgress!.lessonProgress.some(
        lp => lp.lessonId === l.id && lp.completed
      );
    });

    // If all lessons completed, mark module as completed
    if (allLessonsCompleted) {
      await prisma.learningProgress.update({
        where: { id: learningProgress.id },
        data: { completedAt: new Date() }
      });
    }

    // =========================================================================
    // ACHIEVEMENT SYSTEM INTEGRATION
    // Automatically check and unlock achievements when lesson is completed
    // This is non-blocking - errors won't affect the main lesson completion flow
    // =========================================================================
    let newAchievements: any[] = [];
    
    try {
      console.log(`[Progress] Checking achievements for lesson completion: ${lessonId}`);

      // Prepare event data for achievement verification
      const eventData: achievementService.AchievementEventData = {
        lessonId,
        moduleId: lesson.moduleId,
        timeSpent
      };

      // Check and unlock lesson-related achievements
      const lessonAchievements = await achievementService.checkAndUnlockAchievements(
        userId,
        'LESSON_COMPLETED',
        eventData
      );

      newAchievements.push(...lessonAchievements);

      // If module was completed, also check module-related achievements
      if (allLessonsCompleted) {
        console.log(`[Progress] Module completed! Checking module achievements: ${lesson.moduleId}`);

        // Get total modules completed for this user
        const totalModulesCompleted = await prisma.learningProgress.count({
        where: {
          userId,
            completedAt: { not: null }
          }
        });

        const moduleEventData: achievementService.AchievementEventData = {
          moduleId: lesson.moduleId,
          moduleCategory: lesson.module.category,
          moduleDifficulty: lesson.module.difficulty,
          totalModulesCompleted
        };

        const moduleAchievements = await achievementService.checkAndUnlockAchievements(
          userId,
          'MODULE_COMPLETED',
          moduleEventData
        );

        newAchievements.push(...moduleAchievements);
    }

      if (newAchievements.length > 0) {
        console.log(
          `[Progress] 🎉 ${newAchievements.length} achievement(s) unlocked: ` +
          newAchievements.map(a => a.type).join(', ')
        );
      }
    } catch (achievementError) {
      // Log error but don't fail the main operation
      console.error('[Progress] Error checking achievements (non-critical):', achievementError);
      // Continue execution - achievement errors shouldn't block lesson completion
    }

    console.log(`[Progress] Lesson completed successfully with ${newAchievements.length} new achievements`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        lessonId: lessonProgress.lessonId,
        completed: lessonProgress.completed,
        timeSpent: lessonProgress.timeSpent,
        moduleCompleted: allLessonsCompleted,
        newAchievements // Include newly unlocked achievements in response
      },
      message: 'Lesson completed successfully'
    });
  } catch (error) {
    console.error('[Progress] Error completing lesson:', error);
    next(error);
  }
};

/**
 * Get next recommended lesson
 *
 * @route   GET /api/progress/next-lesson
 * @access  Private
 * @returns Next lesson recommendation
 */
export const getNextLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    console.log(`[Progress] Finding next lesson for user: ${userId}`);

    // Get all modules in order
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // Get user's progress
    const userProgress = await prisma.learningProgress.findMany({
      where: { userId },
      include: {
        lessonProgress: {
          where: { completed: true }
        }
      }
    });

    // Iterate through modules to find next lesson
    for (const module of modules) {
      // Check if prerequisites are met
      const prerequisitesMet = await arePrerequisitesMet(module.id, userId);

      if (!prerequisitesMet) {
        continue; // Skip this module
      }

      // Find first incomplete lesson
      for (const lesson of module.lessons) {
        const moduleProgress = userProgress.find(p => p.moduleId === module.id);
        const isCompleted = moduleProgress?.lessonProgress.some(
          lp => lp.lessonId === lesson.id
        );

        if (!isCompleted) {
          const currentProgress = await calculateModuleProgress(module.id, userId);

          const recommendation: NextLessonRecommendation = {
            moduleId: module.id,
            lessonId: lesson.id,
            moduleTitle: module.title,
            lessonTitle: lesson.title,
            estimatedTime: lesson.estimatedTime,
            currentProgress
          };

          console.log(`[Progress] Next lesson found: ${lesson.title}`);

          res.status(HTTP_STATUS.OK).json({
            success: true,
            data: recommendation,
            message: 'Next lesson recommendation retrieved successfully'
          });
          return;
        }
      }
    }

    // No incomplete lessons found
    console.log(`[Progress] No next lesson found - all complete!`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: null,
      message: 'All lessons completed!'
    });
  } catch (error) {
    console.error('[Progress] Error getting next lesson:', error);
    next(error);
  }
};

/**
 * Get progress summary by module
 *
 * @route   GET /api/progress/summary
 * @access  Private
 * @returns Progress summary with % completed, timeSpent, score per module
 */
export const getProgressSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    console.log(`[Progress] Fetching progress summary for user: ${userId}`);

    const summary = await progressService.getProgressSummary(userId);

    const response: ApiResponseDTO<typeof summary> = {
      success: true,
      data: summary,
      message: 'Progress summary retrieved successfully'
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    console.error('[Progress] Error fetching progress summary:', error);
    next(error);
  }
};

/**
 * Get user's current streak
 *
 * @route   GET /api/progress/streak
 * @access  Private
 * @returns Streak information
 */
export const getStreak = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    console.log(`[Progress] Fetching streak for user: ${userId}`);

    // Get user's learning sessions
    const sessions = await prisma.learningSession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      select: { startTime: true }
    });

    const streak = calculateStreak(sessions);
    const lastSession = sessions.length > 0 ? sessions[0] : null;

    // Check if streak is active (session today or yesterday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let isActive = false;
    if (lastSession) {
      const lastSessionDate = new Date(lastSession.startTime);
      lastSessionDate.setHours(0, 0, 0, 0);
      isActive = lastSessionDate >= yesterday;
    }

    const streakInfo: StreakInfo = {
      streak,
      lastSessionDate: lastSession?.startTime.toISOString() || null,
      isActive
    };

    console.log(`[Progress] Streak calculated: ${streak} days, active: ${isActive}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: streakInfo,
      message: 'Streak information retrieved successfully'
    });
  } catch (error) {
    console.error('[Progress] Error fetching streak:', error);
    next(error);
  }
};

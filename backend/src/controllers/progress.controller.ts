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

interface ModuleProgressDetail {
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string | null;
  progressPercentage: number;
  timeSpent: number;
  isCompleted: boolean;
  completedAt: string | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  lessons: Array<{
    id: string;
    title: string;
    completed: boolean;
    timeSpent: number;
    lastAccessed: string | null;
  }>;
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
 *
 * @route   GET /api/progress/modules/:moduleId
 * @access  Private
 * @returns Detailed module progress including all lessons
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

    // Get module with lessons
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        lessons: {
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

    // Check if prerequisites are met
    const prerequisitesMet = await arePrerequisitesMet(moduleId, userId);

    // Get or create learning progress
    let learningProgress = await prisma.learningProgress.findUnique({
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

    // Calculate progress percentage
    const progressPercentage = await calculateModuleProgress(moduleId, userId);

    // Map lessons with completion status
    const lessonsWithProgress = module.lessons.map(lesson => {
      const lessonProg = learningProgress?.lessonProgress.find(
        lp => lp.lessonId === lesson.id
      );

      return {
        id: lesson.id,
        title: lesson.title,
        completed: lessonProg?.completed || false,
        timeSpent: lessonProg?.timeSpent || 0,
        lastAccessed: lessonProg?.lastAccessed?.toISOString() || null
      };
    });

    const moduleProgressDetail: ModuleProgressDetail = {
      moduleId: module.id,
      moduleTitle: module.title,
      moduleDescription: module.description,
      progressPercentage,
      timeSpent: learningProgress?.timeSpent || 0,
      isCompleted: learningProgress?.completedAt !== null,
      completedAt: learningProgress?.completedAt?.toISOString() || null,
      lessonsCompleted: lessonsWithProgress.filter(l => l.completed).length,
      lessonsTotal: module.lessons.length,
      lessons: lessonsWithProgress
    };

    console.log(`[Progress] Module progress: ${progressPercentage}%`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        ...moduleProgressDetail,
        isAvailable: prerequisitesMet
      },
      message: 'Module progress retrieved successfully'
    });
  } catch (error) {
    console.error('[Progress] Error fetching module progress:', error);
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

    // Get or create learning progress for module
    let learningProgress = await prisma.learningProgress.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId: lesson.moduleId
        }
      }
    });

    if (!learningProgress) {
      learningProgress = await prisma.learningProgress.create({
        data: {
          userId,
          moduleId: lesson.moduleId,
          timeSpent: 0
        }
      });
    }

    // Create or update lesson progress
    const lessonProgress = await prisma.lessonProgress.upsert({
      where: {
        progressId_lessonId: {
          progressId: learningProgress.id,
          lessonId
        }
      },
      update: {
        lastAccessed: new Date()
      },
      create: {
        progressId: learningProgress.id,
        lessonId,
        completed: false,
        timeSpent: 0,
        lastAccessed: new Date()
      }
    });

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
        lessonId: lessonProgress.lessonId,
        completed: lessonProgress.completed,
        lastAccessed: lessonProgress.lastAccessed
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

    // Check if this is the first lesson completed
    const totalCompletedLessons = await prisma.lessonProgress.count({
      where: {
        learningProgress: {
          userId
        },
        completed: true
      }
    });

    if (totalCompletedLessons === 1) {
      // Award FIRST_LESSON achievement
      await prisma.achievement.upsert({
        where: {
          id: `${userId}-FIRST_LESSON`
        },
        update: {},
        create: {
          id: `${userId}-FIRST_LESSON`,
          userId,
          type: 'FIRST_LESSON',
          title: 'Primera Lección',
          description: 'Completaste tu primera lección',
          points: 10
        }
      });
    }

    // Check if all lessons in module are completed
    const allLessonsCompleted = lesson.module.lessons.every(l => {
      return learningProgress!.lessonProgress.some(
        lp => lp.lessonId === l.id && lp.completed
      );
    });

    const achievements: string[] = [];

    if (allLessonsCompleted) {
      // Mark module as completed
      await prisma.learningProgress.update({
        where: { id: learningProgress.id },
        data: { completedAt: new Date() }
      });

      // Award MODULE_COMPLETE achievement
      await prisma.achievement.upsert({
        where: {
          id: `${userId}-MODULE_COMPLETE-${lesson.moduleId}`
        },
        update: {},
        create: {
          id: `${userId}-MODULE_COMPLETE-${lesson.moduleId}`,
          userId,
          type: 'MODULE_COMPLETE',
          title: 'Módulo Completado',
          description: `Completaste el módulo: ${lesson.module.title}`,
          points: 50
        }
      });

      achievements.push('MODULE_COMPLETE');
    }

    if (totalCompletedLessons === 1) {
      achievements.push('FIRST_LESSON');
    }

    console.log(`[Progress] Lesson completed. Achievements: ${achievements.join(', ')}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        lessonId: lessonProgress.lessonId,
        completed: lessonProgress.completed,
        timeSpent: lessonProgress.timeSpent,
        moduleCompleted: allLessonsCompleted,
        achievements
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

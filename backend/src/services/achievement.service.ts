// =============================================================================
// VentyLab Achievement Service
// =============================================================================
// This service handles all business logic related to achievements and gamification.
// It manages achievement unlocking, progress tracking, and status checking.
// =============================================================================

import { PrismaClient, Achievement, AchievementType } from '@prisma/client';
import {
  ACHIEVEMENT_DEFINITIONS,
  getAchievementDefinition,
  AchievementDefinition
} from '../config/achievements.config';

const prisma = new PrismaClient();

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Event types that can trigger achievement checks
 */
export type AchievementEventType =
  | 'LESSON_COMPLETED'
  | 'LESSON_ACCESSED'
  | 'MODULE_COMPLETED'
  | 'QUIZ_COMPLETED'
  | 'DAILY_LOGIN'
  | 'SEARCH_USED'
  | 'FEEDBACK_SUBMITTED'
  | 'LESSON_REVIEWED';

/**
 * Event data structure for different event types
 */
export interface AchievementEventData {
  lessonId?: string;
  moduleId?: string;
  quizId?: string;
  score?: number;
  timeSpent?: number;
  isReview?: boolean;
  [key: string]: any;
}

/**
 * Achievement with unlock status and progress information
 */
export interface AchievementWithStatus extends AchievementDefinition {
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

/**
 * Result of unlocking an achievement
 */
export interface UnlockAchievementResult {
  achievement: Achievement;
  isNew: boolean;
}

/**
 * User statistics for achievement calculations
 */
interface UserStats {
  totalLessonsCompleted: number;
  totalModulesCompleted: number;
  lessonsAccessedCount: number;
  perfectQuizCount: number;
  consecutivePerfectQuizzes: number;
  currentStreak: number;
  searchUsageCount: number;
  lessonsReviewedCount: number;
  completedModulesByDifficulty: {
    BEGINNER: number;
    INTERMEDIATE: number;
    ADVANCED: number;
  };
  totalModulesByDifficulty: {
    BEGINNER: number;
    INTERMEDIATE: number;
    ADVANCED: number;
  };
  hasStudiedMorning: boolean;
  hasStudiedNight: boolean;
  specificModulesCompleted: {
    fundamentals: boolean;
    ventilation: boolean;
    clinical: boolean;
    advanced: boolean;
  };
}

// =============================================================================
// Core Achievement Functions
// =============================================================================

/**
 * Get all achievements unlocked by a specific user
 * @param userId - User ID to fetch achievements for
 * @returns Array of achievements ordered by unlock date (newest first)
 * @example
 * const achievements = await getAchievementsByUserId('user123');
 */
export async function getAchievementsByUserId(userId: string): Promise<Achievement[]> {
  try {
    const achievements = await prisma.achievement.findMany({
      where: {
        userId
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    console.log(`[Achievement Service] Retrieved ${achievements.length} achievements for user ${userId}`);
    return achievements;
  } catch (error) {
    console.error('[Achievement Service] Error fetching user achievements:', error);
    throw new Error('Failed to fetch user achievements');
  }
}

/**
 * Get all available achievements with their unlock status and progress for a user
 * @param userId - User ID to check achievement status for
 * @returns Array of all achievements with unlock status and progress information
 * @example
 * const allAchievements = await getAllAchievementsWithStatus('user123');
 * // Returns achievements with isUnlocked flag and progress data
 */
export async function getAllAchievementsWithStatus(userId: string): Promise<AchievementWithStatus[]> {
  try {
    // Fetch user's unlocked achievements
    const unlockedAchievements = await prisma.achievement.findMany({
      where: { userId }
    });

    // Create a map for quick lookup
    const unlockedMap = new Map(
      unlockedAchievements.map(achievement => [achievement.type, achievement])
    );

    // Get user stats for progress calculation
    const userStats = await getUserStats(userId);

    // Map all achievement definitions to include status and progress
    const achievementsWithStatus: AchievementWithStatus[] = Object.values(ACHIEVEMENT_DEFINITIONS).map(
      (definition) => {
        const unlocked = unlockedMap.get(definition.type);
        const progress = calculateAchievementProgress(definition.type as AchievementType, userStats);

        return {
          ...definition,
          isUnlocked: !!unlocked,
          unlockedAt: unlocked?.unlockedAt,
          progress
        };
      }
    );

    console.log(`[Achievement Service] Retrieved status for ${achievementsWithStatus.length} achievements`);
    return achievementsWithStatus;
  } catch (error) {
    console.error('[Achievement Service] Error fetching achievement status:', error);
    throw new Error('Failed to fetch achievement status');
  }
}

/**
 * Unlock a specific achievement for a user
 * @param userId - User ID to unlock achievement for
 * @param achievementType - Type of achievement to unlock
 * @param customData - Optional custom data to override default achievement properties
 * @returns Object containing the achievement and whether it was newly unlocked
 * @example
 * const result = await unlockAchievement('user123', 'FIRST_LESSON');
 * if (result.isNew) {
 *   console.log('New achievement unlocked!', result.achievement);
 * }
 */
export async function unlockAchievement(
  userId: string,
  achievementType: AchievementType,
  customData?: Partial<Achievement>
): Promise<UnlockAchievementResult> {
  try {
    // Check if achievement already exists
    const existingAchievement = await prisma.achievement.findFirst({
      where: {
        userId,
        type: achievementType
      }
    });

    if (existingAchievement) {
      console.log(`[Achievement Service] Achievement ${achievementType} already exists for user ${userId}`);
      return {
        achievement: existingAchievement,
        isNew: false
      };
    }

    // Get achievement definition from config
    const definition = getAchievementDefinition(achievementType);
    if (!definition) {
      throw new Error(`Achievement type ${achievementType} not found in configuration`);
    }

    // Create new achievement record
    const newAchievement = await prisma.achievement.create({
      data: {
        userId,
        type: achievementType,
        title: customData?.title || definition.title,
        description: customData?.description || definition.description,
        icon: customData?.icon || definition.icon,
        points: customData?.points || definition.points
      }
    });

    console.log(`[Achievement Service] ✨ New achievement unlocked: ${achievementType} for user ${userId}`);
    return {
      achievement: newAchievement,
      isNew: true
    };
  } catch (error) {
    console.error(`[Achievement Service] Error unlocking achievement ${achievementType}:`, error);
    throw new Error('Failed to unlock achievement');
  }
}

/**
 * Check and unlock achievements based on user events
 * This is the main function that evaluates all possible achievements and unlocks them
 * @param userId - User ID to check achievements for
 * @param eventType - Type of event that triggered the check
 * @param eventData - Data associated with the event
 * @returns Array of newly unlocked achievements
 * @example
 * // When a user completes a lesson
 * const newAchievements = await checkAndUnlockAchievements(
 *   'user123',
 *   'LESSON_COMPLETED',
 *   { lessonId: 'lesson456', moduleId: 'module789' }
 * );
 * // Returns array of newly unlocked achievements
 */
export async function checkAndUnlockAchievements(
  userId: string,
  eventType: AchievementEventType,
  eventData: AchievementEventData = {}
): Promise<Achievement[]> {
  try {
    console.log(`[Achievement Service] Checking achievements for user ${userId}, event: ${eventType}`);

    // Get already unlocked achievements to avoid duplicates
    const unlockedAchievements = await prisma.achievement.findMany({
      where: { userId },
      select: { type: true }
    });
    const unlockedTypes = new Set(unlockedAchievements.map(a => a.type));

    // Collect all potential achievements to unlock based on category checks
    const achievementsToCheck: AchievementType[] = [];

    // Run category-specific checks based on event type
    if (eventType === 'LESSON_COMPLETED' || eventType === 'LESSON_ACCESSED' || eventType === 'MODULE_COMPLETED') {
      const initialAchievements = await checkInitialAchievements(userId, eventData);
      achievementsToCheck.push(...initialAchievements);
    }

    if (eventType === 'LESSON_COMPLETED' || eventType === 'MODULE_COMPLETED') {
      const progressAchievements = await checkProgressAchievements(userId, eventData);
      achievementsToCheck.push(...progressAchievements);
    }

    if (eventType === 'QUIZ_COMPLETED') {
      const excellenceAchievements = await checkExcellenceAchievements(userId, eventData);
      achievementsToCheck.push(...excellenceAchievements);
    }

    if (eventType === 'DAILY_LOGIN' || eventType === 'LESSON_COMPLETED') {
      const consistencyAchievements = await checkConsistencyAchievements(userId, eventData);
      achievementsToCheck.push(...consistencyAchievements);
    }

    if (eventType === 'SEARCH_USED' || eventType === 'FEEDBACK_SUBMITTED' || eventType === 'LESSON_REVIEWED') {
      const specialAchievements = await checkSpecialAchievements(userId, eventData);
      achievementsToCheck.push(...specialAchievements);
    }

    // For module completion, also check excellence achievements (difficulty-based completions)
    if (eventType === 'MODULE_COMPLETED') {
      const excellenceAchievements = await checkExcellenceAchievements(userId, eventData);
      achievementsToCheck.push(...excellenceAchievements);
    }

    // Remove duplicates and filter out already unlocked achievements
    const uniqueAchievements = [...new Set(achievementsToCheck)].filter(
      type => !unlockedTypes.has(type)
    );

    // Array to store newly unlocked achievements
    const newlyUnlocked: Achievement[] = [];

    // Use transaction to ensure consistency and avoid race conditions
    await prisma.$transaction(async (tx) => {
      for (const achievementType of uniqueAchievements) {
        // Double-check within transaction to avoid race conditions
        const exists = await tx.achievement.findFirst({
          where: { userId, type: achievementType }
        });

        if (!exists) {
          const definition = getAchievementDefinition(achievementType);
          if (definition) {
            const achievement = await tx.achievement.create({
              data: {
                userId,
                type: achievementType,
                title: definition.title,
                description: definition.description,
                icon: definition.icon,
                points: definition.points
              }
            });
            newlyUnlocked.push(achievement);
            console.log(`[Achievement Service] ✨ Unlocked: ${achievementType}`);
          }
        }
      }
    });

    if (newlyUnlocked.length > 0) {
      console.log(`[Achievement Service] 🎉 ${newlyUnlocked.length} new achievement(s) unlocked for user ${userId}`);
    } else {
      console.log(`[Achievement Service] No new achievements unlocked for user ${userId}`);
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('[Achievement Service] Error checking achievements:', error);
    throw new Error('Failed to check and unlock achievements');
  }
}

// =============================================================================
// Helper Functions - Category-Specific Achievement Checks
// =============================================================================

/**
 * Check and return initial/exploration achievements to unlock
 * Evaluates: FIRST_LESSON, FIRST_MODULE, EXPLORING
 * @param userId - User ID to check achievements for
 * @param eventData - Event data containing relevant information
 * @returns Array of achievement types that should be unlocked
 */
async function checkInitialAchievements(
  userId: string,
  eventData: AchievementEventData
): Promise<AchievementType[]> {
  const toUnlock: AchievementType[] = [];

  try {
    // Check FIRST_LESSON - Triggered when user completes their first lesson
    const completedLessonsCount = await prisma.lessonProgress.count({
      where: {
        learningProgress: {
          userId
        },
        completed: true
      }
    });

    if (completedLessonsCount === 1) {
      toUnlock.push(AchievementType.FIRST_LESSON);
      console.log('[Achievement Check] FIRST_LESSON condition met');
    }

    // Check FIRST_MODULE - Triggered when user completes their first module
    const completedModulesCount = await prisma.learningProgress.count({
      where: {
        userId,
        completedAt: {
          not: null
        }
      }
    });

    if (completedModulesCount === 1) {
      toUnlock.push(AchievementType.FIRST_MODULE);
      console.log('[Achievement Check] FIRST_MODULE condition met');
    }

    // Check EXPLORING - Triggered when user has accessed 5 different lessons
    // Use Set to count unique lessons accessed (not necessarily completed)
    const accessedLessons = await prisma.lessonProgress.findMany({
      where: {
        learningProgress: {
          userId
        },
        lastAccessed: {
          not: null
        }
      },
      select: {
        lessonId: true
      }
    });

    const uniqueLessonsAccessed = new Set(accessedLessons.map(lp => lp.lessonId));
    
    if (uniqueLessonsAccessed.size >= 5) {
      toUnlock.push(AchievementType.EXPLORING);
      console.log(`[Achievement Check] EXPLORING condition met (${uniqueLessonsAccessed.size} lessons accessed)`);
    }

  } catch (error) {
    console.error('[Achievement Check] Error checking initial achievements:', error);
  }

  return toUnlock;
}

/**
 * Check and return progress-based achievements to unlock
 * Evaluates: LESSONS_10/25/50, MODULE_FUNDAMENTALS, MODULE_VENTILATION, 
 *            MODULE_CLINICAL, MODULE_ADVANCED
 * @param userId - User ID to check achievements for
 * @param eventData - Event data containing moduleId if applicable
 * @returns Array of achievement types that should be unlocked
 */
async function checkProgressAchievements(
  userId: string,
  eventData: AchievementEventData
): Promise<AchievementType[]> {
  const toUnlock: AchievementType[] = [];

  try {
    // Check lesson completion milestones (LESSONS_10, LESSONS_25, LESSONS_50)
    const completedLessonsCount = await prisma.lessonProgress.count({
      where: {
        learningProgress: {
          userId
        },
        completed: true
      }
    });

    if (completedLessonsCount >= 10) {
      toUnlock.push(AchievementType.LESSONS_10);
    }
    if (completedLessonsCount >= 25) {
      toUnlock.push(AchievementType.LESSONS_25);
    }
    if (completedLessonsCount >= 50) {
      toUnlock.push(AchievementType.LESSONS_50);
    }

    if (toUnlock.length > 0) {
      console.log(`[Achievement Check] Lesson milestones met (${completedLessonsCount} lessons completed)`);
    }

    // Check specific module category completions
    // Get all completed modules with their categories
    const completedModulesWithCategories = await prisma.learningProgress.findMany({
      where: {
        userId,
        completedAt: {
          not: null
        }
      },
      select: {
        module: {
          select: {
            category: true,
            id: true
          }
        }
      }
    });

    // Create a Set of completed module categories
    const completedCategories = new Set(
      completedModulesWithCategories.map(lp => lp.module.category)
    );

    // Check MODULE_FUNDAMENTALS
    if (completedCategories.has('FUNDAMENTALS')) {
      toUnlock.push(AchievementType.MODULE_FUNDAMENTALS);
      console.log('[Achievement Check] MODULE_FUNDAMENTALS condition met');
    }

    // Check MODULE_VENTILATION
    if (completedCategories.has('VENTILATION_PRINCIPLES')) {
      toUnlock.push(AchievementType.MODULE_VENTILATION);
      console.log('[Achievement Check] MODULE_VENTILATION condition met');
    }

    // Check MODULE_CLINICAL
    if (completedCategories.has('CLINICAL_APPLICATIONS')) {
      toUnlock.push(AchievementType.MODULE_CLINICAL);
      console.log('[Achievement Check] MODULE_CLINICAL condition met');
    }

    // Check MODULE_ADVANCED
    if (completedCategories.has('ADVANCED_TECHNIQUES')) {
      toUnlock.push(AchievementType.MODULE_ADVANCED);
      console.log('[Achievement Check] MODULE_ADVANCED condition met');
    }

    // Check generic MODULE_COMPLETE (any module completed)
    if (completedModulesWithCategories.length > 0) {
      toUnlock.push(AchievementType.MODULE_COMPLETE);
    }

  } catch (error) {
    console.error('[Achievement Check] Error checking progress achievements:', error);
  }

  return toUnlock;
}

/**
 * Check and return consistency-based achievements to unlock
 * Evaluates: STREAK_3_DAYS, STREAK_7_DAYS, STREAK_30_DAYS,
 *            MORNING_LEARNER, NIGHT_OWL, DEDICATED_STUDENT
 * @param userId - User ID to check achievements for
 * @param eventData - Event data (not heavily used for this check)
 * @returns Array of achievement types that should be unlocked
 */
async function checkConsistencyAchievements(
  userId: string,
  eventData: AchievementEventData
): Promise<AchievementType[]> {
  const toUnlock: AchievementType[] = [];

  try {
    // Calculate learning streak based on learning sessions
    // Fetch all learning sessions ordered by date (most recent first)
    const learningSessions = await prisma.learningSession.findMany({
      where: {
        userId
      },
      select: {
        startTime: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    if (learningSessions.length > 0) {
      // Calculate current streak
      // Convert sessions to unique days (ignoring time)
      const sessionDays = learningSessions.map(session => {
        const date = new Date(session.startTime);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      });

      // Remove duplicates and sort (most recent first)
      const uniqueDays = Array.from(new Set(sessionDays)).sort((a, b) => b - a);

      // Calculate streak: count consecutive days starting from today/yesterday
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      let currentStreak = 0;
      let expectedDay = todayTime;

      // If the most recent session is not today, check if it's yesterday
      if (uniqueDays[0] !== todayTime) {
        expectedDay = todayTime - oneDayMs;
        if (uniqueDays[0] !== expectedDay) {
          // No session today or yesterday - streak is broken
          currentStreak = 0;
        }
      }

      // Count consecutive days
      if (currentStreak === 0 && (uniqueDays[0] === todayTime || uniqueDays[0] === expectedDay)) {
        for (const dayTime of uniqueDays) {
          if (dayTime === expectedDay) {
            currentStreak++;
            expectedDay -= oneDayMs; // Move to previous day
          } else if (dayTime < expectedDay) {
            // Gap found - streak ends
            break;
          }
        }
      }

      console.log(`[Achievement Check] Current streak: ${currentStreak} days`);

      // Check streak achievements
      if (currentStreak >= 3) {
        toUnlock.push(AchievementType.STREAK_3_DAYS);
      }
      if (currentStreak >= 7) {
        toUnlock.push(AchievementType.STREAK_7_DAYS);
      }
      if (currentStreak >= 30) {
        toUnlock.push(AchievementType.STREAK_30_DAYS);
      }

      // Check time-based habits: MORNING_LEARNER (before 7am)
      const morningSession = learningSessions.find(session => {
        const hour = new Date(session.startTime).getHours();
        return hour < 7;
      });

      if (morningSession) {
        toUnlock.push(AchievementType.MORNING_LEARNER);
        console.log('[Achievement Check] MORNING_LEARNER condition met');
      }

      // Check time-based habits: NIGHT_OWL (after 10pm / 22:00)
      const nightSession = learningSessions.find(session => {
        const hour = new Date(session.startTime).getHours();
        return hour >= 22;
      });

      if (nightSession) {
        toUnlock.push(AchievementType.NIGHT_OWL);
        console.log('[Achievement Check] NIGHT_OWL condition met');
      }

      // Check DEDICATED_STUDENT (has at least 15 learning sessions)
      if (learningSessions.length >= 15) {
        toUnlock.push(AchievementType.DEDICATED_STUDENT);
        console.log(`[Achievement Check] DEDICATED_STUDENT condition met (${learningSessions.length} sessions)`);
      }
    }

  } catch (error) {
    console.error('[Achievement Check] Error checking consistency achievements:', error);
  }

  return toUnlock;
}

/**
 * Check and return excellence-based achievements to unlock
 * Evaluates: FIVE_PERFECT_QUIZZES, ALL_BEGINNER, ALL_INTERMEDIATE,
 *            ALL_ADVANCED, COMPLETE_KNOWLEDGE, PERFECT_QUIZ, SPEED_LEARNER
 * @param userId - User ID to check achievements for
 * @param eventData - Event data containing quiz information if applicable
 * @returns Array of achievement types that should be unlocked
 */
async function checkExcellenceAchievements(
  userId: string,
  eventData: AchievementEventData
): Promise<AchievementType[]> {
  const toUnlock: AchievementType[] = [];

  try {
    // Check PERFECT_QUIZ and FIVE_PERFECT_QUIZZES
    // Get the last 5 quiz attempts (most recent first)
    const recentQuizAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId
      },
      select: {
        isCorrect: true,
        attemptedAt: true
      },
      orderBy: {
        attemptedAt: 'desc'
      },
      take: 5
    });

    // Check if user has at least one perfect quiz
    if (recentQuizAttempts.length > 0 && recentQuizAttempts.some(qa => qa.isCorrect)) {
      toUnlock.push(AchievementType.PERFECT_QUIZ);
    }

    // Check FIVE_PERFECT_QUIZZES - last 5 consecutive attempts must all be correct
    if (recentQuizAttempts.length >= 5 && recentQuizAttempts.every(qa => qa.isCorrect)) {
      toUnlock.push(AchievementType.FIVE_PERFECT_QUIZZES);
      console.log('[Achievement Check] FIVE_PERFECT_QUIZZES condition met (5 consecutive perfect quizzes)');
    }

    // Check difficulty-based completion achievements
    // Get all active modules grouped by difficulty
    const allModulesByDifficulty = await prisma.module.groupBy({
      by: ['difficulty'],
      where: {
        isActive: true
      },
      _count: {
        id: true
      }
    });

    // Get user's completed modules with difficulty
    const completedModulesWithDifficulty = await prisma.learningProgress.findMany({
      where: {
        userId,
        completedAt: {
          not: null
        }
      },
      select: {
        module: {
          select: {
            difficulty: true
          }
        }
      }
    });

    // Count completed modules by difficulty
    const completedByDifficulty = {
      BEGINNER: completedModulesWithDifficulty.filter(lp => lp.module.difficulty === 'BEGINNER').length,
      INTERMEDIATE: completedModulesWithDifficulty.filter(lp => lp.module.difficulty === 'INTERMEDIATE').length,
      ADVANCED: completedModulesWithDifficulty.filter(lp => lp.module.difficulty === 'ADVANCED').length
    };

    // Count total modules by difficulty
    const totalByDifficulty = {
      BEGINNER: allModulesByDifficulty.find(m => m.difficulty === 'BEGINNER')?._count.id || 0,
      INTERMEDIATE: allModulesByDifficulty.find(m => m.difficulty === 'INTERMEDIATE')?._count.id || 0,
      ADVANCED: allModulesByDifficulty.find(m => m.difficulty === 'ADVANCED')?._count.id || 0
    };

    // Check ALL_BEGINNER - completed all beginner modules
    if (totalByDifficulty.BEGINNER > 0 && 
        completedByDifficulty.BEGINNER >= totalByDifficulty.BEGINNER) {
      toUnlock.push(AchievementType.ALL_BEGINNER);
      console.log(`[Achievement Check] ALL_BEGINNER condition met (${completedByDifficulty.BEGINNER}/${totalByDifficulty.BEGINNER})`);
    }

    // Check ALL_INTERMEDIATE - completed all intermediate modules
    if (totalByDifficulty.INTERMEDIATE > 0 && 
        completedByDifficulty.INTERMEDIATE >= totalByDifficulty.INTERMEDIATE) {
      toUnlock.push(AchievementType.ALL_INTERMEDIATE);
      console.log(`[Achievement Check] ALL_INTERMEDIATE condition met (${completedByDifficulty.INTERMEDIATE}/${totalByDifficulty.INTERMEDIATE})`);
    }

    // Check ALL_ADVANCED - completed all advanced modules
    if (totalByDifficulty.ADVANCED > 0 && 
        completedByDifficulty.ADVANCED >= totalByDifficulty.ADVANCED) {
      toUnlock.push(AchievementType.ALL_ADVANCED);
      console.log(`[Achievement Check] ALL_ADVANCED condition met (${completedByDifficulty.ADVANCED}/${totalByDifficulty.ADVANCED})`);
    }

    // Check COMPLETE_KNOWLEDGE - completed ALL modules regardless of difficulty
    const totalModules = totalByDifficulty.BEGINNER + totalByDifficulty.INTERMEDIATE + totalByDifficulty.ADVANCED;
    const totalCompleted = completedByDifficulty.BEGINNER + completedByDifficulty.INTERMEDIATE + completedByDifficulty.ADVANCED;

    if (totalModules > 0 && totalCompleted >= totalModules) {
      toUnlock.push(AchievementType.COMPLETE_KNOWLEDGE);
      console.log(`[Achievement Check] COMPLETE_KNOWLEDGE condition met (${totalCompleted}/${totalModules} modules)`);
    }

    // Check MASTER_LEVEL - if user has completed knowledge, they're a master
    if (totalCompleted >= totalModules && totalModules > 0) {
      toUnlock.push(AchievementType.MASTER_LEVEL);
    }

    // Check SPEED_LEARNER - completed lessons faster than estimated time
    // This requires comparing actual time spent vs estimated time
    const fastLessons = await prisma.lessonProgress.findMany({
      where: {
        learningProgress: {
          userId
        },
        completed: true
      },
      select: {
        timeSpent: true,
        lesson: {
          select: {
            estimatedTime: true
          }
        }
      }
    });

    // Count how many lessons were completed faster than estimated
    const speedCompletions = fastLessons.filter(lp => 
      lp.timeSpent > 0 && lp.timeSpent < lp.lesson.estimatedTime
    );

    // If user has completed at least 5 lessons faster than estimated, unlock
    if (speedCompletions.length >= 5) {
      toUnlock.push(AchievementType.SPEED_LEARNER);
      console.log(`[Achievement Check] SPEED_LEARNER condition met (${speedCompletions.length} fast completions)`);
    }

  } catch (error) {
    console.error('[Achievement Check] Error checking excellence achievements:', error);
  }

  return toUnlock;
}

/**
 * Check and return special achievements to unlock
 * Evaluates: REVIEWING_PRO, CURIOUS_SEARCHER, FEEDBACK_CONTRIBUTOR
 * @param userId - User ID to check achievements for
 * @param eventData - Event data containing search or feedback information
 * @returns Array of achievement types that should be unlocked
 */
async function checkSpecialAchievements(
  userId: string,
  eventData: AchievementEventData
): Promise<AchievementType[]> {
  const toUnlock: AchievementType[] = [];

  try {
    // Check REVIEWING_PRO - user has revisited 10+ completed lessons
    // A lesson is considered "reviewed" if it was marked complete more than 24 hours ago
    // and was accessed again after that completion
    const completedLessons = await prisma.lessonProgress.findMany({
      where: {
        learningProgress: {
          userId
        },
        completed: true,
        lastAccessed: {
          not: null
        }
      },
      select: {
        lessonId: true,
        lastAccessed: true,
        updatedAt: true,
        createdAt: true
      }
    });

    // Count lessons that were reviewed (lastAccessed is significantly after completion)
    const reviewedLessons = completedLessons.filter(lp => {
      if (!lp.lastAccessed) return false;
      
      // Calculate time between creation/update and last access
      // If lastAccessed is more than 24 hours after updatedAt, it's likely a review
      const lastAccessTime = new Date(lp.lastAccessed).getTime();
      const completionTime = new Date(lp.updatedAt).getTime();
      const hoursDifference = (lastAccessTime - completionTime) / (1000 * 60 * 60);
      
      return hoursDifference > 24;
    });

    if (reviewedLessons.length >= 10) {
      toUnlock.push(AchievementType.REVIEWING_PRO);
      console.log(`[Achievement Check] REVIEWING_PRO condition met (${reviewedLessons.length} lessons reviewed)`);
    }

    // Check CURIOUS_SEARCHER - user has performed 20+ searches
    const searchCount = await prisma.searchLog.count({
      where: {
        userId
      }
    });

    if (searchCount >= 20) {
      toUnlock.push(AchievementType.CURIOUS_SEARCHER);
      console.log(`[Achievement Check] CURIOUS_SEARCHER condition met (${searchCount} searches)`);
    }

    // Check FEEDBACK_CONTRIBUTOR - if feedback system is implemented
    // This would require a Feedback model in the schema
    // For now, we'll trigger it based on eventData flag
    if (eventData.hasFeedback || eventData.feedbackSubmitted) {
      toUnlock.push(AchievementType.FEEDBACK_CONTRIBUTOR);
      console.log('[Achievement Check] FEEDBACK_CONTRIBUTOR condition met');
    }

  } catch (error) {
    console.error('[Achievement Check] Error checking special achievements:', error);
  }

  return toUnlock;
}

// =============================================================================
// Helper Functions - User Statistics
// =============================================================================

/**
 * Get comprehensive user statistics for achievement evaluation
 * @param userId - User ID to get stats for
 * @returns User statistics object
 */
async function getUserStats(userId: string): Promise<UserStats> {
  try {
    // Get lesson completion count
    const completedLessons = await prisma.lessonProgress.count({
      where: {
        learningProgress: {
          userId
        },
        completed: true
      }
    });

    // Get lessons accessed (including incomplete)
    const lessonsAccessed = await prisma.lessonProgress.count({
      where: {
        learningProgress: {
          userId
        },
        lastAccessed: {
          not: null
        }
      }
    });

    // Get completed modules count
    const completedModules = await prisma.learningProgress.count({
      where: {
        userId,
        completedAt: {
          not: null
        }
      }
    });

    // Get modules by difficulty
    const allModules = await prisma.module.groupBy({
      by: ['difficulty'],
      _count: true,
      where: {
        isActive: true
      }
    });

    const completedByDifficulty = await prisma.learningProgress.groupBy({
      by: ['moduleId'],
      where: {
        userId,
        completedAt: {
          not: null
        }
      }
    });

    // Get module details for completed modules
    const completedModuleDetails = await prisma.module.findMany({
      where: {
        id: {
          in: completedByDifficulty.map(m => m.moduleId)
        }
      },
      select: {
        difficulty: true,
        category: true
      }
    });

    // Count by difficulty
    const difficultyCount = {
      BEGINNER: completedModuleDetails.filter(m => m.difficulty === 'BEGINNER').length,
      INTERMEDIATE: completedModuleDetails.filter(m => m.difficulty === 'INTERMEDIATE').length,
      ADVANCED: completedModuleDetails.filter(m => m.difficulty === 'ADVANCED').length
    };

    const totalByDifficulty = {
      BEGINNER: allModules.find(m => m.difficulty === 'BEGINNER')?._count || 0,
      INTERMEDIATE: allModules.find(m => m.difficulty === 'INTERMEDIATE')?._count || 0,
      ADVANCED: allModules.find(m => m.difficulty === 'ADVANCED')?._count || 0
    };

    // Check specific module categories completed
    const specificModules = {
      fundamentals: completedModuleDetails.some(m => m.category === 'FUNDAMENTALS'),
      ventilation: completedModuleDetails.some(m => m.category === 'VENTILATION_PRINCIPLES'),
      clinical: completedModuleDetails.some(m => m.category === 'CLINICAL_APPLICATIONS'),
      advanced: completedModuleDetails.some(m => m.category === 'ADVANCED_TECHNIQUES')
    };

    // Get quiz statistics
    const recentQuizzes = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { attemptedAt: 'desc' },
      take: 5,
      select: { isCorrect: true }
    });

    const perfectQuizzes = await prisma.quizAttempt.groupBy({
      by: ['quizId'],
      where: {
        userId,
        isCorrect: true
      },
      _count: true
    });

    // Calculate consecutive perfect quizzes
    let consecutivePerfect = 0;
    for (const quiz of recentQuizzes) {
      if (quiz.isCorrect) {
        consecutivePerfect++;
      } else {
        break;
      }
    }

    // Get learning streak (simplified - check last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = await prisma.learningSession.findMany({
      where: {
        userId,
        startTime: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      select: {
        startTime: true
      }
    });

    const currentStreak = calculateStreak(recentSessions.map(s => s.startTime));

    // Check time-based patterns
    const morningSession = await prisma.learningSession.findFirst({
      where: {
        userId,
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      select: {
        startTime: true
      }
    });

    const hasStudiedMorning = morningSession ? morningSession.startTime.getHours() < 7 : false;
    const hasStudiedNight = morningSession ? morningSession.startTime.getHours() >= 22 : false;

    // Get search usage count
    const searchCount = await prisma.searchLog.count({
      where: { userId }
    });

    // Get reviewed lessons count
    const reviewedLessons = await prisma.lessonProgress.count({
      where: {
        learningProgress: {
          userId
        },
        completed: true,
        lastAccessed: {
          not: null
        }
      }
    });

    return {
      totalLessonsCompleted: completedLessons,
      totalModulesCompleted: completedModules,
      lessonsAccessedCount: lessonsAccessed,
      perfectQuizCount: perfectQuizzes.length,
      consecutivePerfectQuizzes: consecutivePerfect,
      currentStreak,
      searchUsageCount: searchCount,
      lessonsReviewedCount: reviewedLessons,
      completedModulesByDifficulty: difficultyCount,
      totalModulesByDifficulty: totalByDifficulty,
      hasStudiedMorning,
      hasStudiedNight,
      specificModulesCompleted: specificModules
    };
  } catch (error) {
    console.error('[Achievement Service] Error fetching user stats:', error);
    throw error;
  }
}


/**
 * Calculate progress for a specific achievement
 * @param achievementType - Type of achievement to calculate progress for
 * @param userStats - Current user statistics
 * @returns Progress object or undefined if not applicable
 */
function calculateAchievementProgress(
  achievementType: AchievementType,
  userStats: UserStats
): { current: number; target: number; percentage: number } | undefined {
  const progress = (current: number, target: number) => ({
    current: Math.min(current, target),
    target,
    percentage: Math.min(100, Math.round((current / target) * 100))
  });

  switch (achievementType) {
    case AchievementType.LESSONS_10:
      return progress(userStats.totalLessonsCompleted, 10);
    case AchievementType.LESSONS_25:
      return progress(userStats.totalLessonsCompleted, 25);
    case AchievementType.LESSONS_50:
      return progress(userStats.totalLessonsCompleted, 50);
    case AchievementType.EXPLORING:
      return progress(userStats.lessonsAccessedCount, 5);
    case AchievementType.STREAK_3_DAYS:
      return progress(userStats.currentStreak, 3);
    case AchievementType.STREAK_7_DAYS:
      return progress(userStats.currentStreak, 7);
    case AchievementType.STREAK_30_DAYS:
      return progress(userStats.currentStreak, 30);
    case AchievementType.FIVE_PERFECT_QUIZZES:
      return progress(userStats.consecutivePerfectQuizzes, 5);
    case AchievementType.CURIOUS_SEARCHER:
      return progress(userStats.searchUsageCount, 20);
    case AchievementType.REVIEWING_PRO:
      return progress(userStats.lessonsReviewedCount, 10);
    default:
      return undefined;
  }
}

/**
 * Calculate current learning streak from session dates
 * @param sessionDates - Array of session start dates (sorted desc)
 * @returns Number of consecutive days with sessions
 */
function calculateStreak(sessionDates: Date[]): number {
  if (sessionDates.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if there's a session today or yesterday
  const lastSession = new Date(sessionDates[0]);
  lastSession.setHours(0, 0, 0, 0);
  
  const daysSinceLastSession = Math.floor((today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastSession > 1) {
    return 0; // Streak broken
  }

  // Count consecutive days
  const uniqueDays = new Set<string>();
  for (const date of sessionDates) {
    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);
    uniqueDays.add(sessionDate.toISOString().split('T')[0]);
  }

  const sortedDays = Array.from(uniqueDays).sort().reverse();
  
  let currentDate = new Date(today);
  for (const day of sortedDays) {
    const sessionDay = new Date(day);
    const diff = Math.floor((currentDate.getTime() - sessionDay.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 0 || diff === 1) {
      streak++;
      currentDate = sessionDay;
    } else {
      break;
    }
  }

  return streak;
}

// =============================================================================
// Exports
// =============================================================================

export default {
  getAchievementsByUserId,
  getAllAchievementsWithStatus,
  unlockAchievement,
  checkAndUnlockAchievements
};


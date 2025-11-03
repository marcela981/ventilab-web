/**
 * Level Evaluation Service
 * Evaluates student learning performance and suggests level changes
 * Based on completion rates, quiz scores, and time management
 */

import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES, ERROR_MESSAGES } from '../config/constants';
import { UserLevel, ModuleDifficulty } from '@prisma/client';

/**
 * Evaluation result interface
 */
export interface LevelEvaluationResult {
  currentLevel: UserLevel;
  suggestedLevel: UserLevel | null;
  shouldLevelUp: boolean;
  reason: string;
  metrics: {
    totalLessonsCompleted: number;
    lessonsByDifficulty: {
      BEGINNER: number;
      INTERMEDIATE: number;
      ADVANCED: number;
    };
    modulesCompleted: number;
    averageQuizScore: number | null;
    averageTimeEfficiency: number; // Percentage: (estimatedTime / actualTime) * 100
    recentLessonsScore: number | null; // Score of last 10 lessons
    consistencyScore: number; // How consistent the performance is
  };
}

/**
 * Evaluates if a user should change their learning level
 *
 * @param userId - The ID of the user to evaluate
 * @returns Evaluation result with current level, suggested level, and metrics
 * @throws {AppError} If user is not found or evaluation fails
 */
export const evaluateUserLevel = async (userId: string): Promise<LevelEvaluationResult> => {
  try {
    // Fetch user with current level
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        userLevel: true,
        role: true
      },
    });

    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND
      );
    }

    // Get all learning progress with necessary relations
    const learningProgress = await prisma.learningProgress.findMany({
      where: { userId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            estimatedTime: true,
          },
        },
        lessonProgress: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                estimatedTime: true,
                moduleId: true,
              },
            },
          },
        },
      },
    });

    // Get all quiz attempts for score calculation
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { attemptedAt: 'desc' },
    });

    // Calculate metrics
    const metrics = await calculateMetrics(learningProgress, quizAttempts);

    // Determine if user should level up and the reason
    const evaluation = determineLevel(user.userLevel, metrics);

    console.log(`📊 [LevelEvaluation] Usuario ${user.email} evaluado:`, {
      currentLevel: user.userLevel,
      suggestedLevel: evaluation.suggestedLevel,
      shouldLevelUp: evaluation.shouldLevelUp,
    });

    return {
      currentLevel: user.userLevel,
      ...evaluation,
      metrics,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('❌ [LevelEvaluation] Error al evaluar nivel del usuario:', error);
    throw new AppError(
      'Error al evaluar nivel del usuario',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Calculate learning metrics from progress data
 */
async function calculateMetrics(
  learningProgress: any[],
  quizAttempts: any[]
): Promise<LevelEvaluationResult['metrics']> {
  // Flatten all lesson progress
  const allLessonProgress = learningProgress.flatMap(p => p.lessonProgress);

  // Count completed lessons
  const completedLessons = allLessonProgress.filter(lp => lp.completed);
  const totalLessonsCompleted = completedLessons.length;

  // Get module difficulty for each completed lesson
  const lessonsByDifficulty = {
    BEGINNER: 0,
    INTERMEDIATE: 0,
    ADVANCED: 0,
  };

  // Map lessons to their module difficulty
  for (const progress of learningProgress) {
    const moduleDifficulty = progress.module.difficulty;
    const completedInModule = progress.lessonProgress.filter((lp: any) => lp.completed).length;
    lessonsByDifficulty[moduleDifficulty] += completedInModule;
  }

  // Count completed modules
  const modulesCompleted = learningProgress.filter(
    p => p.completedAt !== null
  ).length;

  // Calculate average quiz score (percentage of correct answers)
  let averageQuizScore: number | null = null;
  if (quizAttempts.length > 0) {
    const correctAttempts = quizAttempts.filter(qa => qa.isCorrect).length;
    averageQuizScore = (correctAttempts / quizAttempts.length) * 100;
  }

  // Calculate average time efficiency
  let averageTimeEfficiency = 0;
  let efficiencyCount = 0;

  for (const lessonProg of completedLessons) {
    const estimatedTime = lessonProg.lesson.estimatedTime;
    const actualTime = lessonProg.timeSpent;

    if (estimatedTime > 0 && actualTime > 0) {
      // Efficiency = estimatedTime / actualTime * 100
      // 100% means completed exactly on time
      // >100% means completed faster than expected
      // <100% means took longer than expected
      const efficiency = (estimatedTime / actualTime) * 100;
      averageTimeEfficiency += efficiency;
      efficiencyCount++;
    }
  }

  if (efficiencyCount > 0) {
    averageTimeEfficiency = averageTimeEfficiency / efficiencyCount;
  }

  // Calculate recent lessons score (last 10 completed lessons)
  const recentCompletedLessons = completedLessons
    .sort((a, b) => {
      const dateA = a.lastAccessed || a.updatedAt;
      const dateB = b.lastAccessed || b.updatedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, 10);

  // Get quiz attempts for recent lessons
  const recentLessonIds = recentCompletedLessons.map(lp => lp.lessonId);

  // Get quizzes from these lessons
  const recentQuizzes = await prisma.quiz.findMany({
    where: {
      lessonId: { in: recentLessonIds }
    },
    select: { id: true }
  });

  const recentQuizIds = recentQuizzes.map(q => q.id);
  const recentQuizAttempts = quizAttempts.filter(qa =>
    recentQuizIds.includes(qa.quizId)
  );

  let recentLessonsScore: number | null = null;
  if (recentQuizAttempts.length > 0) {
    const correctRecent = recentQuizAttempts.filter(qa => qa.isCorrect).length;
    recentLessonsScore = (correctRecent / recentQuizAttempts.length) * 100;
  }

  // Calculate consistency score
  // Consistency is measured by the standard deviation of quiz scores
  // Lower deviation = more consistent performance
  let consistencyScore = 0;
  if (quizAttempts.length >= 5) {
    // Calculate rolling success rate for each set of 5 attempts
    const windowSize = 5;
    const successRates: number[] = [];

    for (let i = 0; i <= quizAttempts.length - windowSize; i++) {
      const window = quizAttempts.slice(i, i + windowSize);
      const correctInWindow = window.filter(qa => qa.isCorrect).length;
      successRates.push((correctInWindow / windowSize) * 100);
    }

    // Calculate standard deviation
    const mean = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
    const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / successRates.length;
    const stdDev = Math.sqrt(variance);

    // Convert to consistency score (100 - normalized std deviation)
    // Lower std dev = higher consistency
    consistencyScore = Math.max(0, 100 - stdDev);
  }

  return {
    totalLessonsCompleted,
    lessonsByDifficulty,
    modulesCompleted,
    averageQuizScore,
    averageTimeEfficiency,
    recentLessonsScore,
    consistencyScore,
  };
}

/**
 * Determine if user should level up based on metrics
 */
function determineLevel(
  currentLevel: UserLevel,
  metrics: LevelEvaluationResult['metrics']
): Pick<LevelEvaluationResult, 'suggestedLevel' | 'shouldLevelUp' | 'reason'> {

  // BEGINNER -> INTERMEDIATE criteria
  if (currentLevel === 'BEGINNER') {
    const beginnerLessons = metrics.lessonsByDifficulty.BEGINNER;
    const hasEnoughLessons = beginnerLessons >= 5;
    const hasGoodScore = metrics.averageQuizScore !== null && metrics.averageQuizScore >= 80;
    const hasGoodEfficiency = metrics.averageTimeEfficiency >= 80; // Within 80% of estimated time

    if (hasEnoughLessons && hasGoodScore && hasGoodEfficiency) {
      return {
        suggestedLevel: 'INTERMEDIATE',
        shouldLevelUp: true,
        reason: `¡Excelente progreso! Has completado ${beginnerLessons} lecciones de nivel principiante con un score promedio de ${metrics.averageQuizScore?.toFixed(1)}% y buena gestión del tiempo (${metrics.averageTimeEfficiency.toFixed(1)}% de eficiencia). Estás listo para avanzar al nivel intermedio.`,
      };
    }

    // Provide feedback on what's missing
    const missingCriteria: string[] = [];
    if (!hasEnoughLessons) {
      missingCriteria.push(`completar ${5 - beginnerLessons} lecciones más de nivel principiante`);
    }
    if (!hasGoodScore) {
      missingCriteria.push(`mejorar tu score promedio (actual: ${metrics.averageQuizScore?.toFixed(1) || 'N/A'}%, objetivo: 80%)`);
    }
    if (!hasGoodEfficiency) {
      missingCriteria.push(`mejorar tu eficiencia de tiempo (actual: ${metrics.averageTimeEfficiency.toFixed(1)}%, objetivo: 80%)`);
    }

    return {
      suggestedLevel: null,
      shouldLevelUp: false,
      reason: `Continúa en nivel principiante. Para avanzar necesitas: ${missingCriteria.join(', ')}.`,
    };
  }

  // INTERMEDIATE -> ADVANCED criteria
  if (currentLevel === 'INTERMEDIATE') {
    const intermediateLessons = metrics.lessonsByDifficulty.INTERMEDIATE;
    const hasEnoughLessons = intermediateLessons >= 8;
    const hasGoodScore = metrics.averageQuizScore !== null && metrics.averageQuizScore >= 85;
    const hasGoodRecentScore = metrics.recentLessonsScore !== null && metrics.recentLessonsScore >= 85;
    const hasConsistency = metrics.consistencyScore >= 70; // At least 70% consistency

    if (hasEnoughLessons && hasGoodScore && hasGoodRecentScore && hasConsistency) {
      return {
        suggestedLevel: 'ADVANCED',
        shouldLevelUp: true,
        reason: `¡Sobresaliente! Has completado ${intermediateLessons} lecciones de nivel intermedio con un score promedio de ${metrics.averageQuizScore?.toFixed(1)}%, score reciente de ${metrics.recentLessonsScore?.toFixed(1)}%, y consistencia de ${metrics.consistencyScore.toFixed(1)}%. Estás preparado para el nivel avanzado.`,
      };
    }

    // Provide feedback on what's missing
    const missingCriteria: string[] = [];
    if (!hasEnoughLessons) {
      missingCriteria.push(`completar ${8 - intermediateLessons} lecciones más de nivel intermedio`);
    }
    if (!hasGoodScore) {
      missingCriteria.push(`mejorar tu score promedio (actual: ${metrics.averageQuizScore?.toFixed(1) || 'N/A'}%, objetivo: 85%)`);
    }
    if (!hasGoodRecentScore) {
      missingCriteria.push(`mejorar tu score reciente (actual: ${metrics.recentLessonsScore?.toFixed(1) || 'N/A'}%, objetivo: 85%)`);
    }
    if (!hasConsistency) {
      missingCriteria.push(`mejorar tu consistencia (actual: ${metrics.consistencyScore.toFixed(1)}%, objetivo: 70%)`);
    }

    return {
      suggestedLevel: null,
      shouldLevelUp: false,
      reason: `Continúa en nivel intermedio. Para avanzar necesitas: ${missingCriteria.join(', ')}.`,
    };
  }

  // Already at ADVANCED level
  if (currentLevel === 'ADVANCED') {
    const advancedLessons = metrics.lessonsByDifficulty.ADVANCED;
    return {
      suggestedLevel: null,
      shouldLevelUp: false,
      reason: `Ya estás en el nivel más alto. Has completado ${advancedLessons} lecciones avanzadas. ¡Sigue así!`,
    };
  }

  // Fallback
  return {
    suggestedLevel: null,
    shouldLevelUp: false,
    reason: 'No se pudo determinar una recomendación de nivel en este momento.',
  };
}

/**
 * Updates a user's level in the database
 *
 * @param userId - The ID of the user
 * @param newLevel - The new level to set
 * @returns The updated user
 * @throws {AppError} If user is not found or update fails
 */
export const updateUserLevel = async (
  userId: string,
  newLevel: UserLevel
): Promise<any> => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { userLevel: newLevel },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userLevel: true,
        updatedAt: true,
      },
    });

    console.log(`✅ [LevelEvaluation] Nivel actualizado para ${updatedUser.email}: ${newLevel}`);

    return updatedUser;
  } catch (error) {
    console.error('❌ [LevelEvaluation] Error al actualizar nivel del usuario:', error);
    throw new AppError(
      'Error al actualizar nivel del usuario',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

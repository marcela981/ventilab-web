/**
 * Quiz Controller
 * Handles quiz attempts and achievement verification for quiz-related accomplishments
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS } from '../config/constants';
import { sendSuccess } from '../utils/response';
import * as achievementService from '../services/achievement.service';

/**
 * Submit a quiz attempt
 *
 * @route   POST /api/quizzes/:quizId/attempt
 * @desc    Submit an answer for a quiz question and check for perfect quiz achievements
 * @access  Private
 * @body    answer - The user's answer to the quiz question
 * @returns Quiz attempt result with achievement notifications
 * 
 * @example
 * POST /api/quizzes/quiz123/attempt
 * Authorization: Bearer <token>
 * Body: { "answer": "Option A", "timeSpent": 45 }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "attemptId": "attempt123",
 *     "isCorrect": true,
 *     "perfectQuizStreak": 3,
 *     "newAchievements": [...]
 *   },
 *   "message": "Quiz attempt submitted successfully"
 * }
 */
export const submitQuizAttempt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate user authentication
    if (!req.user || !req.user.id) {
      throw new AppError(
        'Usuario no autenticado',
        HTTP_STATUS.UNAUTHORIZED,
        'UNAUTHORIZED'
      );
    }

    const userId = req.user.id;
    const { quizId } = req.params;
    const { answer, timeSpent = 0 } = req.body;

    // Validate required fields
    if (!answer) {
      throw new AppError(
        'La respuesta es requerida',
        HTTP_STATUS.BAD_REQUEST,
        'VALIDATION_ERROR'
      );
    }

    console.log(`[Quiz] Submitting quiz attempt - User: ${userId}, Quiz: ${quizId}`);

    // Get quiz with correct answer
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          select: {
            id: true,
            moduleId: true
          }
        }
      }
    });

    if (!quiz) {
      throw new AppError(
        'Quiz no encontrado',
        HTTP_STATUS.NOT_FOUND,
        'QUIZ_NOT_FOUND'
      );
    }

    // Check if answer is correct
    const isCorrect = answer.trim().toLowerCase() === quiz.correctAnswer.trim().toLowerCase();

    // Create quiz attempt record
    const quizAttempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        answer,
        isCorrect,
        timeSpent
      }
    });

    console.log(`[Quiz] Quiz attempt created - Correct: ${isCorrect}`);

    // =========================================================================
    // QUIZ ACHIEVEMENT VERIFICATION
    // Check for perfect quiz achievements and consecutive perfect quiz streaks
    // Uses optimized query to fetch recent attempts for streak calculation
    // =========================================================================
    let newAchievements: any[] = [];
    let perfectQuizStreak = 0;

    try {
      // Optimize: Get last 5 quiz attempts in a single query
      // This is sufficient to check for FIVE_PERFECT_QUIZZES achievement
      const recentAttempts = await prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { attemptedAt: 'desc' },
        take: 5,
        select: {
          isCorrect: true,
          attemptedAt: true
        }
      });

      // Calculate current perfect quiz streak
      // Count consecutive correct answers from most recent
      for (const attempt of recentAttempts) {
        if (attempt.isCorrect) {
          perfectQuizStreak++;
        } else {
          break; // Streak broken
        }
      }

      console.log(`[Quiz] Perfect quiz streak: ${perfectQuizStreak}`);

      // Prepare event data for achievement verification
      const eventData: achievementService.AchievementEventData = {
        quizId,
        lessonId: quiz.lesson.id,
        moduleId: quiz.lesson.moduleId,
        isCorrect,
        perfectQuizStreak,
        score: isCorrect ? 100 : 0
      };

      // Check and unlock quiz-related achievements
      // This includes: PERFECT_QUIZ (first perfect quiz), 
      // FIVE_PERFECT_QUIZZES (5 consecutive perfect quizzes)
      newAchievements = await achievementService.checkAndUnlockAchievements(
        userId,
        'QUIZ_COMPLETED',
        eventData
      );

      if (newAchievements.length > 0) {
        console.log(
          `[Quiz] 🎉 ${newAchievements.length} achievement(s) unlocked: ` +
          newAchievements.map(a => a.type).join(', ')
        );
      }
    } catch (achievementError) {
      // Log error but don't fail the main operation
      console.error('[Quiz] Error checking achievements (non-critical):', achievementError);
      // Continue execution - achievement errors shouldn't block quiz submission
    }

    console.log(`[Quiz] Quiz attempt processed successfully with ${newAchievements.length} new achievements`);

    // Send response with attempt result and achievements
    sendSuccess(
      res,
      HTTP_STATUS.OK,
      isCorrect ? 'Respuesta correcta! 🎉' : 'Respuesta incorrecta. Intenta nuevamente.',
      {
        attemptId: quizAttempt.id,
        isCorrect,
        correctAnswer: isCorrect ? undefined : quiz.correctAnswer, // Only show if incorrect
        explanation: quiz.explanation,
        points: isCorrect ? quiz.points : 0,
        perfectQuizStreak,
        newAchievements
      }
    );
  } catch (error) {
    console.error('[Quiz] Error submitting quiz attempt:', error);
    next(error);
  }
};

/**
 * Get user's quiz attempts for a specific lesson
 *
 * @route   GET /api/lessons/:lessonId/quiz-attempts
 * @desc    Get all quiz attempts by the user for quizzes in a specific lesson
 * @access  Private
 * @returns Array of quiz attempts with results
 */
export const getLessonQuizAttempts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError(
        'Usuario no autenticado',
        HTTP_STATUS.UNAUTHORIZED,
        'UNAUTHORIZED'
      );
    }

    const userId = req.user.id;
    const { lessonId } = req.params;

    console.log(`[Quiz] Fetching quiz attempts - User: ${userId}, Lesson: ${lessonId}`);

    // Get all quiz attempts for this lesson's quizzes
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quiz: {
          lessonId
        }
      },
      include: {
        quiz: {
          select: {
            id: true,
            question: true,
            points: true
          }
        }
      },
      orderBy: {
        attemptedAt: 'desc'
      }
    });

    // Calculate statistics
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.isCorrect).length;
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Quiz attempts retrieved successfully',
      {
        attempts,
        statistics: {
          totalAttempts,
          correctAttempts,
          accuracy
        }
      }
    );
  } catch (error) {
    console.error('[Quiz] Error fetching quiz attempts:', error);
    next(error);
  }
};


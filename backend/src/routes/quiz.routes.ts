/**
 * Quiz Routes
 * API routes for quiz attempts and achievement verification
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import * as quizController from '../controllers/quiz.controller';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   POST /api/quizzes/:quizId/attempt
 * @desc    Submit an answer for a quiz question
 * @access  Private - all authenticated users
 * @body    answer - User's answer to the quiz question
 * @body    timeSpent - Time spent on the quiz in seconds (optional)
 * @returns Quiz attempt result with correctness, streak info, and new achievements
 */
router.post(
  '/:quizId/attempt',
  validateRequest([
    param('quizId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Quiz ID is required'),
    body('answer')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Answer is required'),
    body('timeSpent')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Time spent must be a non-negative integer')
      .toInt()
  ]),
  quizController.submitQuizAttempt
);

/**
 * @route   GET /api/lessons/:lessonId/quiz-attempts
 * @desc    Get all quiz attempts for a specific lesson
 * @access  Private - all authenticated users
 * @returns Array of quiz attempts with statistics
 */
router.get(
  '/lessons/:lessonId/attempts',
  validateRequest([
    param('lessonId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Lesson ID is required')
  ]),
  quizController.getLessonQuizAttempts
);

export default router;


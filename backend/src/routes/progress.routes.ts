/**
 * Progress Routes
 * API routes for user progress tracking, streaks, and recommendations
 * All routes require authentication
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import * as progressController from '../controllers/progress.controller';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   GET /api/progress
 * @desc    Get overall user progress statistics
 * @access  Private
 * @returns {Object} Global progress statistics including:
 *          - totalModules: Total number of modules in curriculum
 *          - completedModules: Number of modules completed by user
 *          - totalLessons: Total number of lessons across all modules
 *          - completedLessons: Number of lessons completed by user
 *          - totalTimeSpent: Total time spent learning (in minutes)
 *          - globalProgressPercentage: Overall progress percentage (0-100)
 *          - streak: Current streak of consecutive days studying
 * @errors  401 - Unauthorized (invalid or missing token)
 *          500 - Internal server error
 */
router.get('/', progressController.getUserProgress);

/**
 * @route   GET /api/progress/modules/:moduleId
 * @desc    Get detailed progress for a specific module
 * @access  Private
 * @param   moduleId - ID of the module
 * @returns {Object} Detailed module progress including:
 *          - moduleId: Module identifier
 *          - moduleTitle: Title of the module
 *          - moduleDescription: Description of the module
 *          - progressPercentage: Completion percentage (0-100)
 *          - timeSpent: Time spent on this module (in minutes)
 *          - isCompleted: Whether the module is fully completed
 *          - completedAt: Timestamp when module was completed (or null)
 *          - lessonsCompleted: Number of lessons completed in this module
 *          - lessonsTotal: Total number of lessons in this module
 *          - lessons: Array of lesson progress objects
 *          - isAvailable: Whether module is available (prerequisites met)
 * @errors  400 - Bad request (invalid module ID format)
 *          401 - Unauthorized (invalid or missing token)
 *          404 - Module not found
 *          500 - Internal server error
 */
router.get(
  '/modules/:moduleId',
  validateRequest([
    param('moduleId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Module ID is required and must be a valid string')
  ]),
  progressController.getModuleProgress
);

/**
 * @route   POST /api/progress/lessons/:lessonId/start
 * @desc    Mark a lesson as started
 * @access  Private
 * @param   lessonId - ID of the lesson to start
 * @returns {Object} Updated lesson progress:
 *          - lessonId: Lesson identifier
 *          - completed: Whether lesson is completed (false for started)
 *          - lastAccessed: Timestamp when lesson was last accessed
 * @effects - Creates or updates LessonProgress record
 *          - Updates lastAccessed timestamp
 *          - Creates LearningSession if not exists for today
 *          - Creates LearningProgress for module if not exists
 * @errors  400 - Bad request (invalid lesson ID format)
 *          401 - Unauthorized (invalid or missing token)
 *          403 - Forbidden (module prerequisites not met)
 *          404 - Lesson not found
 *          500 - Internal server error
 */
router.post(
  '/lessons/:lessonId/start',
  validateRequest([
    param('lessonId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Lesson ID is required and must be a valid string')
  ]),
  progressController.startLesson
);

/**
 * @route   POST /api/progress/lessons/:lessonId/complete
 * @desc    Mark a lesson as completed
 * @access  Private
 * @param   lessonId - ID of the lesson to complete
 * @body    {number} timeSpent - Time spent on lesson in minutes (optional, default: 0)
 * @returns {Object} Updated lesson progress and achievements:
 *          - lessonId: Lesson identifier
 *          - completed: Whether lesson is completed (true)
 *          - timeSpent: Total time spent on this lesson
 *          - moduleCompleted: Whether entire module is now completed
 *          - achievements: Array of achievement IDs unlocked
 * @effects - Marks LessonProgress as completed
 *          - Updates timeSpent for lesson and module
 *          - Checks if module is fully completed
 *          - Awards achievements (FIRST_LESSON, MODULE_COMPLETE)
 *          - Updates module completedAt if all lessons done
 * @errors  400 - Bad request (invalid lesson ID or timeSpent)
 *          401 - Unauthorized (invalid or missing token)
 *          404 - Lesson or progress not found
 *          500 - Internal server error
 */
router.post(
  '/lessons/:lessonId/complete',
  validateRequest([
    param('lessonId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Lesson ID is required and must be a valid string'),
    body('timeSpent')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Time spent must be a non-negative integer')
      .toInt()
  ]),
  progressController.completeLesson
);

/**
 * @route   GET /api/progress/next-lesson
 * @desc    Get the next recommended lesson for the user
 * @access  Private
 * @returns {Object|null} Next lesson recommendation:
 *          - moduleId: ID of the module containing next lesson
 *          - lessonId: ID of the next lesson
 *          - moduleTitle: Title of the module
 *          - lessonTitle: Title of the lesson
 *          - estimatedTime: Estimated time to complete (minutes)
 *          - currentProgress: Current progress in this module (0-100)
 *          Returns null if all lessons are completed
 * @algorithm Iterates through modules in order:
 *          1. Checks if module prerequisites are met
 *          2. Finds first incomplete lesson in available modules
 *          3. Returns first match or null if all complete
 * @errors  401 - Unauthorized (invalid or missing token)
 *          500 - Internal server error
 */
router.get('/next-lesson', progressController.getNextLesson);

/**
 * @route   PUT /api/progress/lesson
 * @desc    Update lesson progress (upsert)
 * @access  Private
 * @body    {Object} Progress update data:
 *          - lessonId: (required) ID of the lesson
 *          - progress: (optional) Progress value 0..1
 *          - completed: (optional) Whether lesson is completed
 *          - timeSpentDelta: (optional) Time spent delta in minutes (added to existing)
 *          - lastAccessed: (optional) Last accessed timestamp
 * @returns {Object} Updated lesson progress and module aggregates:
 *          - lessonProgress: Updated lesson progress object
 *          - moduleProgress: Module progress with recalculated aggregates
 * @effects - Upserts LessonProgress record
 *          - Recalculates module aggregates (timeSpent, score, completedAt)
 *          - Uses atomic transaction for consistency
 * @errors  400 - Bad request (missing lessonId or invalid data)
 *          401 - Unauthorized (invalid or missing token)
 *          404 - Lesson not found
 *          500 - Internal server error
 */
router.put(
  '/lesson',
  validateRequest([
    body('lessonId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('lessonId is required and must be a valid string'),
    body('progress')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('progress must be a number between 0 and 1'),
    body('completed')
      .optional()
      .isBoolean()
      .withMessage('completed must be a boolean'),
    body('timeSpentDelta')
      .optional()
      .isInt({ min: 0 })
      .withMessage('timeSpentDelta must be a non-negative integer')
      .toInt(),
    body('lastAccessed')
      .optional()
      .isISO8601()
      .withMessage('lastAccessed must be a valid ISO 8601 date string')
  ]),
  progressController.updateLessonProgress
);

/**
 * @route   GET /api/progress/summary
 * @desc    Get progress summary by module
 * @access  Private
 * @returns {Object} Progress summary:
 *          - modules: Array of module progress items with:
 *            - moduleId: Module identifier
 *            - moduleTitle: Title of the module
 *            - progressPercentage: Completion percentage (0-100)
 *            - timeSpent: Time spent on module (in minutes)
 *            - score: Average score (or null)
 *            - isCompleted: Whether module is completed
 *            - completedAt: Timestamp when module was completed (or null)
 * @errors  401 - Unauthorized (invalid or missing token)
 *          500 - Internal server error
 */
router.get('/summary', progressController.getProgressSummary);

/**
 * @route   GET /api/progress/streak
 * @desc    Get user's current learning streak
 * @access  Private
 * @returns {Object} Streak information:
 *          - streak: Number of consecutive days with activity
 *          - lastSessionDate: Timestamp of last learning session (or null)
 *          - isActive: Whether streak is currently active (session today or yesterday)
 * @algorithm Analyzes LearningSession records:
 *          1. Groups sessions by day
 *          2. Counts consecutive days from most recent backwards
 *          3. Streak breaks if a day is skipped
 *          4. Considers streak active if session within last 2 days
 * @errors  401 - Unauthorized (invalid or missing token)
 *          500 - Internal server error
 */
router.get('/streak', progressController.getStreak);

export default router;

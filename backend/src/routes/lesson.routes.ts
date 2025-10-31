/**
 * Lesson Routes
 * Routes for lesson management and progress tracking
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { authenticate, isAdmin, isTeacher, isStudent } from '../middleware/auth';
import * as lessonController from '../controllers/lesson.controller';

const router = Router();

// =============================================================================
// AUTHENTICATED USER ROUTES - View lessons and track progress
// =============================================================================

/**
 * @route   GET /api/lessons/:id
 * @desc    Get lesson by ID with user progress
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id',
  authenticate,
  isStudent, // All authenticated users (STUDENT, TEACHER, ADMIN)
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de lección inválido'),
  ]),
  lessonController.getLessonById
);

/**
 * @route   GET /api/lessons/:id/next
 * @desc    Get next lesson in the same module
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id/next',
  authenticate,
  isStudent, // All authenticated users
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de lección inválido'),
  ]),
  lessonController.getNextLesson
);

/**
 * @route   GET /api/lessons/:id/previous
 * @desc    Get previous lesson in the same module
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id/previous',
  authenticate,
  isStudent, // All authenticated users
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de lección inválido'),
  ]),
  lessonController.getPreviousLesson
);

/**
 * @route   POST /api/lessons/:id/complete
 * @desc    Mark lesson as completed
 * @access  Private (All authenticated users)
 */
router.post(
  '/:id/complete',
  authenticate,
  isStudent, // All authenticated users can complete lessons
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de lección inválido'),
    body('timeSpent')
      .isInt({ min: 0 })
      .withMessage('timeSpent debe ser un número entero no negativo (en minutos)'),
  ]),
  lessonController.markLessonCompleted
);

// =============================================================================
// TEACHER/ADMIN ROUTES - Create and edit lessons
// =============================================================================

/**
 * @route   POST /api/lessons
 * @desc    Create a new lesson
 * @access  Private (TEACHER, ADMIN)
 */
router.post(
  '/',
  authenticate,
  isTeacher, // Allows TEACHER and ADMIN
  validateRequest([
    body('moduleId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('moduleId es requerido'),
    body('title')
      .isString()
      .trim()
      .notEmpty()
      .isLength({ min: 3, max: 200 })
      .withMessage('El título debe tener entre 3 y 200 caracteres'),
    body('content')
      .notEmpty()
      .withMessage('El contenido es requerido')
      .custom((value) => {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          if (!parsed.type || !parsed.sections || !Array.isArray(parsed.sections)) {
            throw new Error('El contenido debe tener campos type y sections');
          }
          if (parsed.sections.length === 0) {
            throw new Error('El contenido debe tener al menos una sección');
          }
          return true;
        } catch (error) {
          throw new Error('El contenido debe ser un JSON válido con la estructura correcta');
        }
      }),
    body('order')
      .isInt({ min: 1 })
      .withMessage('El orden debe ser un número entero positivo'),
    body('estimatedTime')
      .isInt({ min: 1 })
      .withMessage('El tiempo estimado debe ser un número entero positivo (en minutos)'),
    body('aiGenerated')
      .optional()
      .isBoolean()
      .withMessage('aiGenerated debe ser un booleano'),
    body('sourcePrompt')
      .optional()
      .isString()
      .trim()
      .withMessage('sourcePrompt debe ser un string'),
  ]),
  lessonController.createLesson
);

/**
 * @route   PUT /api/lessons/:id
 * @desc    Update an existing lesson
 * @access  Private (TEACHER, ADMIN)
 */
router.put(
  '/:id',
  authenticate,
  isTeacher, // Allows TEACHER and ADMIN
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de lección inválido'),
    body('title')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('El título debe tener entre 3 y 200 caracteres'),
    body('content')
      .optional()
      .custom((value) => {
        if (value === undefined) return true;
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          if (!parsed.type || !parsed.sections || !Array.isArray(parsed.sections)) {
            throw new Error('El contenido debe tener campos type y sections');
          }
          if (parsed.sections.length === 0) {
            throw new Error('El contenido debe tener al menos una sección');
          }
          return true;
        } catch (error) {
          throw new Error('El contenido debe ser un JSON válido con la estructura correcta');
        }
      }),
    body('order')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El orden debe ser un número entero positivo'),
    body('estimatedTime')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El tiempo estimado debe ser un número entero positivo (en minutos)'),
    body('aiGenerated')
      .optional()
      .isBoolean()
      .withMessage('aiGenerated debe ser un booleano'),
    body('sourcePrompt')
      .optional()
      .isString()
      .trim()
      .withMessage('sourcePrompt debe ser un string'),
  ]),
  lessonController.updateLesson
);

// =============================================================================
// ADMIN ONLY ROUTES - Delete operations
// =============================================================================

/**
 * @route   DELETE /api/lessons/:id
 * @desc    Delete a lesson
 * @access  Private (ADMIN only)
 */
router.delete(
  '/:id',
  authenticate,
  isAdmin, // Only ADMIN can delete lessons
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de lección inválido'),
  ]),
  lessonController.deleteLesson
);

export default router;

/**
 * Module Routes
 * Routes for module management and lesson access
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { authenticate, optionalAuth, isAdmin, isTeacher, isStudent } from '../middleware/auth';
import { USER_ROLES } from '../config/constants';
import * as moduleController from '../controllers/module.controller';

const router = Router();

/**
 * @route   GET /api/modules
 * @desc    Get all modules with optional filtering and pagination
 * @access  Public
 * @query   category - Filter by category (optional)
 * @query   difficulty - Filter by difficulty (optional)
 * @query   page - Page number (optional, default: 1)
 * @query   limit - Items per page (optional, default: 10, max: 100)
 */
router.get(
  '/',
  validateRequest([
    query('category')
      .optional()
      .isString()
      .trim()
      .isIn(['FUNDAMENTALS', 'VENTILATION_PRINCIPLES', 'CLINICAL_APPLICATIONS', 'ADVANCED_TECHNIQUES', 'TROUBLESHOOTING', 'PATIENT_SAFETY'])
      .withMessage('Categoría inválida'),
    query('difficulty')
      .optional()
      .isString()
      .trim()
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
      .withMessage('Dificultad inválida'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page debe ser un número entero positivo')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit debe ser un número entre 1 y 100')
      .toInt(),
  ]),
  moduleController.getAllModules
);

/**
 * @route   GET /api/modules/:id
 * @desc    Get a single module by ID
 * @access  Public (includes progress if authenticated)
 */
router.get(
  '/:id',
  optionalAuth, // Optional authentication to include progress
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de módulo inválido'),
  ]),
  moduleController.getModuleById
);

// =============================================================================
// TEACHER/ADMIN ROUTES - Create and edit content
// =============================================================================

/**
 * @route   POST /api/modules
 * @desc    Create a new module
 * @access  Private (TEACHER, ADMIN)
 */
router.post(
  '/',
  authenticate,
  isTeacher, // Allows TEACHER and ADMIN
  validateRequest([
    body('title')
      .trim()
      .notEmpty()
      .withMessage('El título es requerido')
      .isLength({ min: 3, max: 200 })
      .withMessage('El título debe tener entre 3 y 200 caracteres'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('La descripción no debe exceder 1000 caracteres'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('La categoría es requerida')
      .isIn(['FUNDAMENTALS', 'VENTILATION_PRINCIPLES', 'CLINICAL_APPLICATIONS', 'ADVANCED_TECHNIQUES', 'TROUBLESHOOTING', 'PATIENT_SAFETY'])
      .withMessage('Categoría inválida'),
    body('difficulty')
      .trim()
      .notEmpty()
      .withMessage('La dificultad es requerida')
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
      .withMessage('Dificultad inválida'),
    body('estimatedTime')
      .isInt({ min: 1 })
      .withMessage('El tiempo estimado debe ser un número positivo (en minutos)')
      .toInt(),
    body('order')
      .isInt({ min: 0 })
      .withMessage('El orden debe ser un número entero no negativo')
      .toInt(),
    body('prerequisiteIds')
      .optional()
      .isArray()
      .withMessage('prerequisiteIds debe ser un array'),
    body('prerequisiteIds.*')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Cada prerequisiteId debe ser una cadena válida'),
    body('thumbnail')
      .optional()
      .trim()
      .isURL()
      .withMessage('El thumbnail debe ser una URL válida'),
  ]),
  moduleController.createModule
);

/**
 * @route   PUT /api/modules/:id
 * @desc    Update an existing module
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
      .withMessage('ID de módulo inválido'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('El título debe tener entre 3 y 200 caracteres'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('La descripción no debe exceder 1000 caracteres'),
    body('difficulty')
      .optional()
      .trim()
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
      .withMessage('Dificultad inválida'),
    body('estimatedTime')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El tiempo estimado debe ser un número positivo')
      .toInt(),
    body('order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('El orden debe ser un número entero no negativo')
      .toInt(),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive debe ser un booleano')
      .toBoolean(),
    body('thumbnail')
      .optional()
      .trim()
      .isURL()
      .withMessage('El thumbnail debe ser una URL válida'),
  ]),
  moduleController.updateModule
);

// =============================================================================
// ADMIN ONLY ROUTES - Delete operations
// =============================================================================

/**
 * @route   DELETE /api/modules/:id
 * @desc    Delete a module (soft delete)
 * @access  Private (ADMIN only)
 */
router.delete(
  '/:id',
  authenticate,
  isAdmin, // Only ADMIN can delete modules
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de módulo inválido'),
  ]),
  moduleController.deleteModule
);

/**
 * @route   GET /api/modules/:id/lessons
 * @desc    Get all lessons for a module
 * @access  Public (includes progress if authenticated)
 */
router.get(
  '/:id/lessons',
  optionalAuth,
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de módulo inválido'),
  ]),
  moduleController.getModuleLessons
);

// =============================================================================
// AUTHENTICATED USER ROUTES - Progress and personal data
// =============================================================================

/**
 * @route   GET /api/modules/:id/progress
 * @desc    Get user's progress in a module
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id/progress',
  authenticate,
  isStudent, // All authenticated users (STUDENT, TEACHER, ADMIN)
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de módulo inválido'),
  ]),
  moduleController.getUserModuleProgress
);

/**
 * @route   POST /api/modules/:id/prerequisites
 * @desc    Add a prerequisite to a module
 * @access  Private (TEACHER, ADMIN)
 */
router.post(
  '/:id/prerequisites',
  authenticate,
  isTeacher, // Allows TEACHER and ADMIN
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de módulo inválido'),
    body('prerequisiteId')
      .trim()
      .notEmpty()
      .withMessage('prerequisiteId es requerido')
      .isString()
      .withMessage('prerequisiteId debe ser una cadena'),
  ]),
  moduleController.addPrerequisite
);

/**
 * @route   DELETE /api/modules/:id/prerequisites/:prerequisiteId
 * @desc    Remove a prerequisite from a module
 * @access  Private (TEACHER, ADMIN)
 */
router.delete(
  '/:id/prerequisites/:prerequisiteId',
  authenticate,
  isTeacher, // Allows TEACHER and ADMIN
  validateRequest([
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('ID de módulo inválido'),
    param('prerequisiteId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('prerequisiteId inválido'),
  ]),
  moduleController.removePrerequisite
);

export default router;

/**
 * Search Routes
 * Routes for search and autocomplete functionality
 */

import { Router } from 'express';
import { query, body } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import * as searchController from '../controllers/search.controller';
import * as analyticsController from '../controllers/searchAnalytics.controller';

const router = Router();

/**
 * @route   GET /api/search
 * @desc    Search for content across modules and lessons
 * @access  Private (All authenticated users)
 * @query   q - Search query (required, min 2 characters)
 * @query   category - Filter by categories (optional, array or comma-separated)
 * @query   difficulty - Filter by difficulties (optional, array or comma-separated)
 * @query   duration - Filter by duration (optional: SHORT, MEDIUM, LONG)
 * @query   status - Filter by completion status (optional: all, not_started, in_progress, completed)
 * @query   type - Filter by type (optional: lesson, module, both - default: both)
 * @query   page - Page number (optional, default: 1)
 * @query   limit - Items per page (optional, default: 10, max: 100)
 * @query   sortBy - Sort order (optional: relevance, date, popularity, duration - default: relevance)
 */
router.get(
  '/',
  authenticate, // Require authentication
  validateRequest([
    query('q')
      .trim()
      .notEmpty()
      .withMessage('El término de búsqueda "q" es requerido')
      .isLength({ min: 2 })
      .withMessage('El término de búsqueda debe tener al menos 2 caracteres')
      .isLength({ max: 200 })
      .withMessage('El término de búsqueda no debe exceder 200 caracteres'),
    query('category')
      .optional()
      .customSanitizer((value) => {
        // Convert comma-separated string to array
        if (typeof value === 'string') {
          return value.split(',').map(v => v.trim());
        }
        return value;
      })
      .custom((value) => {
        const validCategories = [
          'FUNDAMENTALS',
          'VENTILATION_PRINCIPLES',
          'CLINICAL_APPLICATIONS',
          'ADVANCED_TECHNIQUES',
          'TROUBLESHOOTING',
          'PATIENT_SAFETY'
        ];
        
        const categories = Array.isArray(value) ? value : [value];
        const invalidCategories = categories.filter(
          (cat: string) => !validCategories.includes(cat)
        );
        
        if (invalidCategories.length > 0) {
          throw new Error(
            `Categorías inválidas: ${invalidCategories.join(', ')}. Categorías válidas: ${validCategories.join(', ')}`
          );
        }
        
        return true;
      }),
    query('difficulty')
      .optional()
      .customSanitizer((value) => {
        // Convert comma-separated string to array
        if (typeof value === 'string') {
          return value.split(',').map(v => v.trim());
        }
        return value;
      })
      .custom((value) => {
        const validDifficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
        const difficulties = Array.isArray(value) ? value : [value];
        const invalidDifficulties = difficulties.filter(
          (diff: string) => !validDifficulties.includes(diff)
        );
        
        if (invalidDifficulties.length > 0) {
          throw new Error(
            `Dificultades inválidas: ${invalidDifficulties.join(', ')}. Dificultades válidas: ${validDifficulties.join(', ')}`
          );
        }
        
        return true;
      }),
    query('duration')
      .optional()
      .isString()
      .trim()
      .toUpperCase()
      .isIn(['SHORT', 'MEDIUM', 'LONG'])
      .withMessage('Duration debe ser uno de: SHORT (< 15 min), MEDIUM (15-30 min), LONG (> 30 min)'),
    query('status')
      .optional()
      .isString()
      .trim()
      .isIn(['all', 'not_started', 'in_progress', 'completed'])
      .withMessage('Status debe ser uno de: all, not_started, in_progress, completed'),
    query('type')
      .optional()
      .isString()
      .trim()
      .isIn(['lesson', 'module', 'both'])
      .withMessage('Type debe ser uno de: lesson, module, both'),
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
    query('sortBy')
      .optional()
      .isString()
      .trim()
      .isIn(['relevance', 'date', 'popularity', 'duration'])
      .withMessage('SortBy debe ser uno de: relevance, date, popularity, duration'),
  ]),
  searchController.searchContent
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions for autocomplete
 * @access  Private (All authenticated users)
 * @query   q - Search query (required, min 2 characters)
 * @query   limit - Maximum number of suggestions (optional, default: 5, max: 20)
 */
router.get(
  '/suggestions',
  authenticate, // Require authentication
  validateRequest([
    query('q')
      .trim()
      .notEmpty()
      .withMessage('El término de búsqueda "q" es requerido')
      .isLength({ min: 2 })
      .withMessage('El término de búsqueda debe tener al menos 2 caracteres')
      .isLength({ max: 100 })
      .withMessage('El término de búsqueda no debe exceder 100 caracteres'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit debe ser un número entre 1 y 20')
      .toInt(),
  ]),
  searchController.getSearchSuggestions
);

/**
 * @route   POST /api/search/log-click
 * @desc    Log a click on a search result for analytics
 * @access  Private (All authenticated users)
 * @body    query - The original search query
 * @body    selectedResult - ID of the selected result
 * @body    selectedType - Type of result: 'module' or 'lesson'
 * @body    sessionId - Optional session identifier
 */
router.post(
  '/log-click',
  authenticate,
  validateRequest([
    body('query')
      .trim()
      .notEmpty()
      .withMessage('El término de búsqueda "query" es requerido')
      .isLength({ min: 2, max: 200 })
      .withMessage('El término de búsqueda debe tener entre 2 y 200 caracteres'),
    body('selectedResult')
      .trim()
      .notEmpty()
      .withMessage('El ID del resultado "selectedResult" es requerido'),
    body('selectedType')
      .trim()
      .notEmpty()
      .withMessage('El tipo de resultado "selectedType" es requerido')
      .isIn(['module', 'lesson'])
      .withMessage('selectedType debe ser "module" o "lesson"'),
    body('sessionId')
      .optional()
      .isString()
      .trim(),
  ]),
  analyticsController.logClick
);

export default router;


/**
 * Admin Routes
 * Routes for administrative functions (analytics, reports, etc.)
 */

import { Router } from 'express';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import * as analyticsController from '../controllers/searchAnalytics.controller';

const router = Router();

/**
 * @route   GET /api/admin/search-analytics
 * @desc    Get search analytics for admin dashboard
 * @access  Private (Admin and Teacher only)
 * @query   startDate - Start date for analytics range (optional, ISO string)
 * @query   endDate - End date for analytics range (optional, ISO string)
 */
router.get(
  '/search-analytics',
  authenticate,
  validateRequest([
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('startDate debe ser una fecha válida en formato ISO 8601'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('endDate debe ser una fecha válida en formato ISO 8601'),
  ]),
  analyticsController.getAnalytics
);

export default router;


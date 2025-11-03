/**
 * Recommendation Routes
 * Routes for personalized content recommendations
 */

import { Router } from 'express';
import { authenticate, isStudent } from '../middleware/auth';
import { getRecommendations } from '../controllers/recommendation.controller';

const router = Router();

// =============================================================================
// RECOMMENDATION ROUTES
// =============================================================================

/**
 * @route   GET /api/recommendations
 * @desc    Get personalized content recommendations for the authenticated user
 * @access  Private (All authenticated users)
 * @returns Array of recommended modules with reasons and metadata
 */
router.get(
  '/',
  authenticate,
  isStudent, // All authenticated users can get recommendations
  getRecommendations
);

export default router;

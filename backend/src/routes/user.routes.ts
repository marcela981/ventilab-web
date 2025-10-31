/**
 * User Routes
 * Routes for user management and profile operations
 */

import { Router } from 'express';
import { authenticate, isAdmin, isStudent } from '../middleware/auth';
import { getProfile, updateProfile, getAllUsers } from '../controllers/user.controller';

const router = Router();

// =============================================================================
// AUTHENTICATED USER ROUTES - Personal profile management
// =============================================================================

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private (All authenticated users)
 */
router.get(
  '/profile',
  authenticate,
  isStudent, // All authenticated users can view their profile
  getProfile
);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private (All authenticated users)
 */
router.put(
  '/profile',
  authenticate,
  isStudent, // All authenticated users can update their profile
  updateProfile
);

// =============================================================================
// ADMIN ONLY ROUTES - User management
// =============================================================================

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private (ADMIN only)
 */
router.get(
  '/',
  authenticate,
  isAdmin, // Only ADMIN can list all users
  getAllUsers
);

export default router;

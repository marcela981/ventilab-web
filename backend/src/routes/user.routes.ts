/**
 * User Routes
 * Routes for user management and profile operations
 */

import { Router } from 'express';
import { authenticate, isAdmin, isStudent } from '../middleware/auth';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  changeUserPassword,
  getUserStats,
  getAllUsers,
  updateUserLevel,
  evaluateAndUpdateUserLevel
} from '../controllers/user.controller';

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
 * @desc    Update current user profile (name, bio)
 * @access  Private (All authenticated users)
 */
router.put(
  '/profile',
  authenticate,
  isStudent, // All authenticated users can update their profile
  updateProfile
);

/**
 * @route   POST /api/users/profile/avatar
 * @desc    Upload/update user avatar
 * @access  Private (All authenticated users)
 */
router.post(
  '/profile/avatar',
  authenticate,
  isStudent, // All authenticated users can update their avatar
  uploadAvatar
);

/**
 * @route   PUT /api/users/profile/password
 * @desc    Change user password
 * @access  Private (All authenticated users)
 */
router.put(
  '/profile/password',
  authenticate,
  isStudent, // All authenticated users can change their password
  changeUserPassword
);

/**
 * @route   GET /api/users/profile/stats
 * @desc    Get user statistics and learning progress
 * @access  Private (All authenticated users)
 */
router.get(
  '/profile/stats',
  authenticate,
  isStudent, // All authenticated users can view their stats
  getUserStats
);

// =============================================================================
// USER LEVEL MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   PUT /api/users/:id/level
 * @desc    Update user learning level (manual update)
 * @access  Private (User can update their own level, or ADMIN/TEACHER can update any user's level)
 */
router.put(
  '/:id/level',
  authenticate,
  isStudent, // All authenticated users, but authorization checked in controller
  updateUserLevel
);

/**
 * @route   POST /api/users/:id/evaluate-level
 * @desc    Evaluate user level and optionally apply the suggested change
 * @query   autoApply - Boolean (default: false) - If true, automatically apply level change if suggested
 * @access  Private (User can evaluate their own level, or ADMIN/TEACHER can evaluate any user's level)
 * @example POST /api/users/123/evaluate-level?autoApply=true
 */
router.post(
  '/:id/evaluate-level',
  authenticate,
  isStudent, // All authenticated users, but authorization checked in controller
  evaluateAndUpdateUserLevel
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

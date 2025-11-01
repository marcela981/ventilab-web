/**
 * User Routes
 * Routes for user management and profile operations
 */

import { Router } from 'express';
import { authenticate, isAdmin, isStudent } from '../middleware/auth';
import { getProfile, updateProfile, uploadAvatar, changeUserPassword, getUserStats, getAllUsers } from '../controllers/user.controller';

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

/**
 * User Routes
 * Routes for user management
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { USER_ROLES } from '../config/constants';
import { getProfile, updateProfile, getAllUsers } from '../controllers/user.controller';

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', authenticate, updateProfile);

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  getAllUsers
);

export default router;

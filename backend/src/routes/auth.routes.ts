/**
 * Authentication Routes
 * Routes for user authentication (login, register, etc.)
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { VALIDATION } from '../config/constants';
import { authenticate } from '../middleware/auth';
import { register, login, logout, getMe } from '../controllers/auth.controller';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  validateRequest([
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address')
      .isLength({ max: VALIDATION.EMAIL_MAX_LENGTH })
      .withMessage(`Email must be less than ${VALIDATION.EMAIL_MAX_LENGTH} characters`),
    body('password')
      .isLength({ min: VALIDATION.PASSWORD_MIN_LENGTH })
      .withMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
      .isLength({ max: VALIDATION.PASSWORD_MAX_LENGTH })
      .withMessage(`Password must be less than ${VALIDATION.PASSWORD_MAX_LENGTH} characters`),
    body('name')
      .trim()
      .isLength({ min: VALIDATION.NAME_MIN_LENGTH })
      .withMessage(`Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`)
      .isLength({ max: VALIDATION.NAME_MAX_LENGTH })
      .withMessage(`Name must be less than ${VALIDATION.NAME_MAX_LENGTH} characters`),
  ]),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post(
  '/login',
  validateRequest([
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ]),
  login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (optional - mainly for token blacklisting if implemented)
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate, getMe);

export default router;

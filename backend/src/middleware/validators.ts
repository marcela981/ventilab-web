/**
 * Validation & Sanitization Middleware
 * Provides reusable validators for common input validation patterns
 * Uses express-validator for robust validation and sanitization
 */

import { body, param, query, ValidationChain } from 'express-validator';
import { VALIDATION, USER_ROLES } from '../config/constants';

/**
 * User Registration Validator
 * Validates and sanitizes user registration input
 *
 * Validates:
 * - email: Must be a valid email format
 * - password: Minimum 8 characters, maximum 128 characters
 * - name: Minimum 2 characters, maximum 100 characters
 * - role: Must be one of: STUDENT, INSTRUCTOR, ADMIN
 */
export const registerValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: VALIDATION.EMAIL_MAX_LENGTH })
    .withMessage(`Email must not exceed ${VALIDATION.EMAIL_MAX_LENGTH} characters`),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: VALIDATION.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
    .isLength({ max: VALIDATION.PASSWORD_MAX_LENGTH })
    .withMessage(`Password must not exceed ${VALIDATION.PASSWORD_MAX_LENGTH} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: VALIDATION.NAME_MIN_LENGTH })
    .withMessage(`Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`)
    .isLength({ max: VALIDATION.NAME_MAX_LENGTH })
    .withMessage(`Name must not exceed ${VALIDATION.NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Name must contain only letters and spaces'),

  body('role')
    .optional()
    .trim()
    .isIn([USER_ROLES.STUDENT, USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN])
    .withMessage(`Role must be one of: ${USER_ROLES.STUDENT}, ${USER_ROLES.INSTRUCTOR}, ${USER_ROLES.ADMIN}`)
    .customSanitizer((value) => value || USER_ROLES.STUDENT), // Default to STUDENT if not provided
];

/**
 * Login Validator
 * Validates user login credentials
 *
 * Validates:
 * - email: Must be provided and valid format
 * - password: Must be provided
 */
export const loginValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Update Profile Validator
 * Validates profile update input
 *
 * Validates:
 * - name: Optional, but if provided must meet requirements
 * - email: Optional, but if provided must be valid
 */
export const updateProfileValidator: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: VALIDATION.NAME_MIN_LENGTH })
    .withMessage(`Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`)
    .isLength({ max: VALIDATION.NAME_MAX_LENGTH })
    .withMessage(`Name must not exceed ${VALIDATION.NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Name must contain only letters and spaces'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: VALIDATION.EMAIL_MAX_LENGTH })
    .withMessage(`Email must not exceed ${VALIDATION.EMAIL_MAX_LENGTH} characters`),
];

/**
 * Change Password Validator
 * Validates password change request
 *
 * Validates:
 * - currentPassword: Must be provided
 * - newPassword: Must meet password requirements and differ from current
 * - confirmPassword: Must match newPassword
 */
export const changePasswordValidator: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: VALIDATION.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
    .isLength({ max: VALIDATION.PASSWORD_MAX_LENGTH })
    .withMessage(`Password must not exceed ${VALIDATION.PASSWORD_MAX_LENGTH} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Password confirmation does not match new password'),
];

/**
 * ID Parameter Validator
 * Validates UUID parameters in routes
 *
 * Usage: router.get('/users/:id', idValidator, getUser)
 */
export const idValidator: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('ID is required')
    .isUUID()
    .withMessage('Invalid ID format. ID must be a valid UUID'),
];

/**
 * Module Creation Validator
 * Validates input for creating educational modules
 *
 * Validates:
 * - title: Required, 3-200 characters
 * - description: Required, 10-1000 characters
 * - difficulty: Optional, must be 'beginner', 'intermediate', or 'advanced'
 * - estimatedDuration: Optional, must be positive integer (minutes)
 */
export const createModuleValidator: ValidationChain[] = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Module title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .escape(), // Prevent XSS

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Module description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters')
    .escape(),

  body('difficulty')
    .optional()
    .trim()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be one of: beginner, intermediate, advanced'),

  body('estimatedDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated duration must be a positive integer (in minutes)')
    .toInt(),
];

/**
 * Lesson Creation Validator
 * Validates input for creating lessons within modules
 *
 * Validates:
 * - title: Required, 3-200 characters
 * - content: Required, minimum 20 characters
 * - moduleId: Required, must be valid UUID
 * - order: Optional, must be positive integer
 * - type: Optional, must be valid lesson type
 */
export const createLessonValidator: ValidationChain[] = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Lesson title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .escape(),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Lesson content is required')
    .isLength({ min: 20 })
    .withMessage('Content must be at least 20 characters'),

  body('moduleId')
    .trim()
    .notEmpty()
    .withMessage('Module ID is required')
    .isUUID()
    .withMessage('Module ID must be a valid UUID'),

  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
    .toInt(),

  body('type')
    .optional()
    .trim()
    .isIn(['theory', 'practice', 'quiz', 'simulation'])
    .withMessage('Type must be one of: theory, practice, quiz, simulation'),
];

/**
 * Pagination Validator
 * Validates pagination query parameters
 *
 * Validates:
 * - page: Optional, must be positive integer, defaults to 1
 * - limit: Optional, must be positive integer, defaults to 10, max 100
 */
export const paginationValidator: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt()
    .customSanitizer((value) => value || 1),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a positive integer between 1 and 100')
    .toInt()
    .customSanitizer((value) => value || 10),
];

/**
 * Search Query Validator
 * Validates search query parameters
 *
 * Validates:
 * - q: Required search query, 1-100 characters
 * - category: Optional filter category
 */
export const searchValidator: ValidationChain[] = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape(),

  query('category')
    .optional()
    .trim()
    .isAlpha()
    .withMessage('Category must contain only letters'),
];

/**
 * Email Validator
 * Validates single email addresses
 */
export const emailValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

/**
 * Sanitize HTML Content
 * Removes potentially dangerous HTML tags and attributes
 * Use this for user-generated content that may contain HTML
 */
export const sanitizeHtmlContent = (field: string): ValidationChain => {
  return body(field)
    .trim()
    .customSanitizer((value) => {
      // Basic sanitization - in production, use a library like DOMPurify
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '');
    });
};

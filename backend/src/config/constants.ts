/**
 * Application Constants
 * Centralized location for all constant values used throughout the application
 */

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Error Codes
 * Custom error codes for better error handling
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // User Related
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // General
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'You are not authorized to access this resource',
  FORBIDDEN: 'Access forbidden',
  TOKEN_EXPIRED: 'Your session has expired, please login again',
  TOKEN_INVALID: 'Invalid authentication token',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  EMAIL_ALREADY_EXISTS: 'Email already in use',
  VALIDATION_ERROR: 'Validation failed',
  INVALID_INPUT: 'Invalid input provided',
  NOT_FOUND: 'Resource not found',
  INTERNAL_SERVER_ERROR: 'An internal server error occurred',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
} as const;

/**
 * User Roles
 */
export const USER_ROLES = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
} as const;

/**
 * Validation Constants
 */
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
} as const;

/**
 * Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

/**
 * User Permissions by Role
 * Defines granular permissions for each user role
 */
export const PERMISSIONS = {
  STUDENT: [
    'view_modules',
    'view_lessons',
    'complete_lessons',
    'view_own_progress',
    'update_own_profile',
  ],
  TEACHER: [
    'view_modules',
    'view_lessons',
    'complete_lessons',
    'view_own_progress',
    'update_own_profile',
    'create_modules',
    'edit_modules',
    'delete_own_modules',
    'create_lessons',
    'edit_lessons',
    'delete_own_lessons',
    'view_all_progress',
    'generate_ai_content',
  ],
  ADMIN: [
    'view_modules',
    'view_lessons',
    'complete_lessons',
    'view_own_progress',
    'update_own_profile',
    'create_modules',
    'edit_modules',
    'delete_own_modules',
    'create_lessons',
    'edit_lessons',
    'delete_own_lessons',
    'view_all_progress',
    'generate_ai_content',
    'manage_users',
    'change_user_roles',
    'delete_any_module',
    'delete_any_lesson',
    'view_system_stats',
    'manage_system_config',
  ],
} as const;

/**
 * Check if a role has a specific permission
 * @param role - The user role (STUDENT, TEACHER, or ADMIN)
 * @param permission - The permission to check
 * @returns True if the role has the permission, false otherwise
 */
export const hasPermission = (role: string, permission: string): boolean => {
  const rolePermissions = PERMISSIONS[role as keyof typeof PERMISSIONS];
  if (!rolePermissions) {
    return false;
  }
  return rolePermissions.includes(permission as any);
};

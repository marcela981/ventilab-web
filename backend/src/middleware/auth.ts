/**
 * Authentication & Authorization Middleware
 * Handles JWT token verification and role-based access control
 * For medical education application - VentyLab
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { AppError } from './errorHandler';
import { HTTP_STATUS, ERROR_CODES, ERROR_MESSAGES, USER_ROLES, PERMISSIONS, hasPermission } from '../config/constants';
import prisma from '../config/database';

/**
 * Extended Request interface with user information
 * This interface extends Express's Request to include authenticated user data
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * JWT Payload Interface
 * Defines the structure of data encoded in JWT tokens
 */
interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user information to the request
 *
 * This middleware:
 * 1. Extracts the token from the Authorization header
 * 2. Verifies the token is valid and not expired
 * 3. Checks if the user still exists in the database
 * 4. Attaches user info to req.user for use in subsequent middleware/controllers
 *
 * @throws {AppError} 401 - If token is missing, invalid, or user not found
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      throw new AppError(
        'No authentication token provided',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Please provide a valid authentication token in the Authorization header']
      );
    }

    // Check if token follows Bearer scheme
    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'Invalid authentication format',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Authorization header must follow the format: Bearer <token>']
      );
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    if (!token || token.trim() === '') {
      throw new AppError(
        'Authentication token is empty',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Please provide a valid authentication token']
      );
    }

    // Verify token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(
          ERROR_MESSAGES.TOKEN_EXPIRED,
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.TOKEN_EXPIRED,
          true,
          ['Your session has expired. Please log in again']
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(
          ERROR_MESSAGES.TOKEN_INVALID,
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.TOKEN_INVALID,
          true,
          ['The authentication token is invalid or malformed']
        );
      }
      throw error;
    }

    // Verify user still exists in database
    // This prevents deleted users from accessing the system with old tokens
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new AppError(
        'User associated with this token no longer exists',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.USER_NOT_FOUND,
        true,
        ['The user account may have been deleted']
      );
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization Middleware Factory
 * Creates middleware that checks if user has one of the allowed roles
 *
 * Usage:
 * router.get('/admin', authenticate, authorize(USER_ROLES.ADMIN), controller);
 * router.get('/content', authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.TEACHER), controller);
 *
 * @param allowedRoles - One or more roles that are allowed to access the resource
 * @returns Middleware function that checks user role
 * @throws {AppError} 401 - If user is not authenticated
 * @throws {AppError} 403 - If user doesn't have the required role
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new AppError(
          ERROR_MESSAGES.UNAUTHORIZED,
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
          true,
          ['You must be logged in to access this resource']
        );
      }

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(
          ERROR_MESSAGES.FORBIDDEN,
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN,
          true,
          [
            `Access denied. This resource requires one of the following roles: ${allowedRoles.join(', ')}`,
            `Your current role: ${req.user.role}`
          ]
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Permission-Based Authorization Middleware Factory
 * Creates middleware that checks if user has at least one of the required permissions
 *
 * This middleware provides fine-grained access control based on specific permissions
 * rather than broad roles. It consults the PERMISSIONS matrix to check if the user's
 * role grants them any of the specified permissions.
 *
 * Usage:
 * router.post('/modules', authenticate, authorizePermission('create_modules'), createModule);
 * router.put('/lessons/:id', authenticate, authorizePermission('edit_lessons', 'edit_own_lessons'), updateLesson);
 * router.delete('/users/:id', authenticate, authorizePermission('manage_users'), deleteUser);
 *
 * @param requiredPermissions - One or more permissions that grant access to the resource
 * @returns Middleware function that checks if user has any of the required permissions
 * @throws {AppError} 401 - If user is not authenticated
 * @throws {AppError} 403 - If user doesn't have any of the required permissions
 *
 * @example
 * // Only users with 'create_modules' permission (TEACHER, ADMIN) can access
 * router.post('/modules', authenticate, authorizePermission('create_modules'), controller);
 *
 * @example
 * // Users with either 'delete_any_module' or 'delete_own_modules' can access
 * router.delete('/modules/:id', authenticate, authorizePermission('delete_any_module', 'delete_own_modules'), controller);
 */
export const authorizePermission = (...requiredPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new AppError(
          ERROR_MESSAGES.UNAUTHORIZED,
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
          true,
          ['You must be logged in to access this resource']
        );
      }

      // Check if user has at least one of the required permissions
      const userRole = req.user.role;
      const hasRequiredPermission = requiredPermissions.some(permission =>
        hasPermission(userRole, permission)
      );

      if (!hasRequiredPermission) {
        throw new AppError(
          ERROR_MESSAGES.FORBIDDEN,
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN,
          true,
          [
            `Access denied. This resource requires one of the following permissions: ${requiredPermissions.join(', ')}`,
            `Your current role (${userRole}) does not have any of these permissions`
          ]
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Admin Only Middleware
 * Convenience middleware that only allows ADMIN role
 *
 * Usage: router.delete('/users/:id', authenticate, isAdmin, deleteUser);
 */
export const isAdmin = authorize(USER_ROLES.ADMIN);

/**
 * Teacher or Admin Middleware
 * Allows both TEACHER and ADMIN roles
 *
 * Usage: router.post('/modules', authenticate, isTeacher, createModule);
 */
export const isTeacher = authorize(USER_ROLES.TEACHER, USER_ROLES.ADMIN);

/**
 * Student, Teacher, or Admin Middleware
 * Allows any authenticated user (all roles)
 *
 * Usage: router.get('/modules', authenticate, isStudent, getModules);
 */
export const isStudent = authorize(
  USER_ROLES.STUDENT,
  USER_ROLES.TEACHER,
  USER_ROLES.ADMIN
);

/**
 * Optional Authentication Middleware
 * Attaches user information if token is present, but doesn't throw error if missing
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 *
 * Usage: router.get('/public-content', optionalAuth, getContent);
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // If no auth header, continue without user info
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    // If token is empty, continue without user info
    if (!token || token.trim() === '') {
      return next();
    }

    // Try to verify token
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

      // Try to fetch user
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true },
      });

      // If user exists, attach to request
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }
    } catch (error) {
      // Silently fail - this is optional auth
      // Don't throw error, just continue without user info
    }

    next();
  } catch (error) {
    // Even if there's an error, don't block the request
    next();
  }
};

/**
 * Resource Owner or Admin Middleware
 * Checks if the authenticated user is the owner of the resource or an admin
 *
 * This middleware expects a 'userId' parameter in the route
 * Usage: router.put('/users/:userId/profile', authenticate, isOwnerOrAdmin, updateProfile);
 *
 * @throws {AppError} 403 - If user is not the owner and not an admin
 */
export const isOwnerOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['You must be logged in to access this resource']
      );
    }

    const userId = req.params.userId || req.params.id;

    // Allow if user is admin or is accessing their own resource
    if (req.user.role === USER_ROLES.ADMIN || req.user.id === userId) {
      return next();
    }

    throw new AppError(
      'You do not have permission to access this resource',
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FORBIDDEN,
      true,
      ['You can only access your own resources unless you are an administrator']
    );
  } catch (error) {
    next(error);
  }
};

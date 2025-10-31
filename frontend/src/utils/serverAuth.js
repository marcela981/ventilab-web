/**
 * =============================================================================
 * Server-Side Authentication Utilities for VentyLab
 * =============================================================================
 * Helper functions for authentication and authorization in server-side contexts:
 * - API Routes
 * - getServerSideProps
 * - Server Components (App Router)
 *
 * These utilities provide a consistent way to verify user identity and
 * permissions across all server-side code.
 * =============================================================================
 */

import { getServerSession as nextAuthGetServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { USER_ROLES } from '@/lib/auth-config';

/**
 * Get the current session from server context
 *
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @returns {Promise<Object|null>} Session object or null if not authenticated
 *
 * @example
 * // In API route
 * export default async function handler(req, res) {
 *   const session = await getServerSession(req, res);
 *   if (!session) {
 *     return res.status(401).json({ error: 'Unauthorized' });
 *   }
 *   // Use session.user
 * }
 *
 * @example
 * // In getServerSideProps
 * export async function getServerSideProps(context) {
 *   const session = await getServerSession(context.req, context.res);
 *   return { props: { session } };
 * }
 */
export async function getServerSession(req, res) {
  try {
    const session = await nextAuthGetServerSession(req, res, authOptions);
    return session;
  } catch (error) {
    console.error('[ServerAuth] Error getting session:', error);
    return null;
  }
}

/**
 * Require authentication in API routes or SSR
 * Returns the user if authenticated, otherwise sends 401 response
 *
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @returns {Promise<Object|null>} User object if authenticated, null otherwise
 *
 * @example
 * export default async function handler(req, res) {
 *   const user = await requireAuth(req, res);
 *   if (!user) return; // requireAuth already sent 401 response
 *
 *   // User is authenticated, continue with logic
 *   res.json({ data: 'protected data', user });
 * }
 */
export async function requireAuth(req, res) {
  const session = await getServerSession(req, res);

  if (!session || !session.user) {
    console.warn('[ServerAuth] Unauthenticated API access attempt:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Debes iniciar sesión para acceder a este recurso',
      code: 'AUTH_REQUIRED',
    });

    return null;
  }

  // Check if user account is active
  if (session.user.isActive === false) {
    console.warn('[ServerAuth] Inactive user attempted API access:', {
      email: session.user.email,
      url: req.url,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Tu cuenta ha sido desactivada',
      code: 'ACCOUNT_INACTIVE',
    });

    return null;
  }

  return session.user;
}

/**
 * Require specific role(s) in API routes or SSR
 * Returns the user if they have the required role, otherwise sends 403 response
 *
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @param {string|string[]} allowedRoles - Role or array of roles that are allowed
 * @returns {Promise<Object|null>} User object if authorized, null otherwise
 *
 * @example
 * // Single role
 * export default async function handler(req, res) {
 *   const user = await requireRole(req, res, 'ADMIN');
 *   if (!user) return; // Already sent 403 response
 *
 *   // User is admin, continue
 * }
 *
 * @example
 * // Multiple roles
 * export default async function handler(req, res) {
 *   const user = await requireRole(req, res, ['INSTRUCTOR', 'ADMIN']);
 *   if (!user) return;
 *
 *   // User is instructor or admin
 * }
 */
export async function requireRole(req, res, allowedRoles) {
  // First check authentication
  const user = await requireAuth(req, res);
  if (!user) return null; // requireAuth already sent response

  // Normalize to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // Check if user has one of the allowed roles
  if (!roles.includes(user.role)) {
    console.warn('[ServerAuth] Insufficient permissions:', {
      user: user.email,
      userRole: user.role,
      requiredRoles: roles,
      url: req.url,
      method: req.method,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: `Se requiere uno de estos roles: ${roles.join(', ')}`,
      code: 'INSUFFICIENT_PERMISSIONS',
      userRole: user.role,
      requiredRoles: roles,
    });

    return null;
  }

  return user;
}

/**
 * Check if user has permission for a specific action on a resource
 * This is a basic permission system that can be expanded
 *
 * @param {Object} user - User object with role
 * @param {string} resource - Resource name (e.g., 'lesson', 'user', 'evaluation')
 * @param {string} action - Action name (e.g., 'create', 'read', 'update', 'delete')
 * @returns {boolean} True if user has permission
 *
 * @example
 * const canEdit = checkPermission(user, 'lesson', 'update');
 * if (!canEdit) {
 *   return res.status(403).json({ error: 'Cannot edit lessons' });
 * }
 */
export function checkPermission(user, resource, action) {
  if (!user || !user.role) return false;

  const role = user.role;

  // Permission matrix
  // Format: { resource: { action: [allowed_roles] } }
  const permissions = {
    lesson: {
      create: ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
      read: ['STUDENT', 'INSTRUCTOR', 'EXPERT', 'ADMIN'],
      update: ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
      delete: ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
    },
    user: {
      create: ['ADMIN'],
      read: ['ADMIN'],
      update: ['ADMIN'],
      delete: ['ADMIN'],
    },
    evaluation: {
      create: ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
      read: ['STUDENT', 'INSTRUCTOR', 'EXPERT', 'ADMIN'],
      update: ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
      delete: ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
    },
    analytics: {
      read: ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
    },
    settings: {
      update: ['ADMIN'],
    },
  };

  // Check if resource and action exist in permissions
  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) {
    console.warn('[ServerAuth] Unknown resource:', resource);
    return false;
  }

  const actionPermissions = resourcePermissions[action];
  if (!actionPermissions) {
    console.warn('[ServerAuth] Unknown action:', action, 'for resource:', resource);
    return false;
  }

  // Check if user's role is in allowed roles
  return actionPermissions.includes(role);
}

/**
 * Higher-Order Function to wrap API routes with authentication/authorization
 *
 * @param {Function} handler - The API route handler function
 * @param {Object} options - Options for auth requirements
 * @param {boolean} options.requireAuth - Require authentication (default: true)
 * @param {string|string[]} options.requiredRole - Required role(s)
 * @param {Object} options.requiredPermission - Required permission { resource, action }
 * @returns {Function} Wrapped handler function
 *
 * @example
 * // Require authentication only
 * const handler = async (req, res) => {
 *   res.json({ message: 'Authenticated user data' });
 * };
 * export default withAuth(handler);
 *
 * @example
 * // Require specific role
 * const handler = async (req, res) => {
 *   res.json({ message: 'Admin data' });
 * };
 * export default withAuth(handler, { requiredRole: 'ADMIN' });
 *
 * @example
 * // Require multiple roles
 * const handler = async (req, res) => {
 *   res.json({ message: 'Instructor or Admin data' });
 * };
 * export default withAuth(handler, {
 *   requiredRole: ['INSTRUCTOR', 'ADMIN']
 * });
 *
 * @example
 * // Require specific permission
 * const handler = async (req, res) => {
 *   res.json({ message: 'Can create lessons' });
 * };
 * export default withAuth(handler, {
 *   requiredPermission: { resource: 'lesson', action: 'create' }
 * });
 */
export function withAuth(handler, options = {}) {
  const {
    requireAuth = true,
    requiredRole = null,
    requiredPermission = null,
  } = options;

  return async (req, res) => {
    try {
      // Check authentication if required
      if (requireAuth) {
        const user = await requireAuth(req, res);
        if (!user) return; // requireAuth already sent response

        // Attach user to request for handler to use
        req.user = user;

        // Check role if specified
        if (requiredRole) {
          const authorizedUser = await requireRole(req, res, requiredRole);
          if (!authorizedUser) return; // requireRole already sent response
        }

        // Check permission if specified
        if (requiredPermission) {
          const { resource, action } = requiredPermission;
          const hasPermission = checkPermission(user, resource, action);

          if (!hasPermission) {
            console.warn('[ServerAuth] Permission denied:', {
              user: user.email,
              role: user.role,
              resource,
              action,
            });

            return res.status(403).json({
              error: 'Forbidden',
              message: `No tienes permiso para ${action} en ${resource}`,
              code: 'PERMISSION_DENIED',
            });
          }
        }
      }

      // All checks passed, execute handler
      return await handler(req, res);
    } catch (error) {
      console.error('[ServerAuth] Error in withAuth wrapper:', error);

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Error al procesar la solicitud',
        ...(process.env.NODE_ENV === 'development' && {
          debug: error.message,
        }),
      });
    }
  };
}

/**
 * Get redirect object for unauthorized access in getServerSideProps
 *
 * @param {string} destination - Where to redirect (default: '/auth/login')
 * @param {string} callbackUrl - URL to return to after login
 * @returns {Object} Next.js redirect object
 *
 * @example
 * export async function getServerSideProps(context) {
 *   const session = await getServerSession(context.req, context.res);
 *
 *   if (!session) {
 *     return getAuthRedirect('/auth/login', context.resolvedUrl);
 *   }
 *
 *   return { props: { user: session.user } };
 * }
 */
export function getAuthRedirect(destination = '/auth/login', callbackUrl = null) {
  const redirectUrl = callbackUrl
    ? `${destination}?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : destination;

  return {
    redirect: {
      destination: redirectUrl,
      permanent: false,
    },
  };
}

/**
 * Check if user has admin role
 *
 * @param {Object} user - User object
 * @returns {boolean} True if user is admin
 */
export function isAdmin(user) {
  return user?.role === USER_ROLES.ADMIN;
}

/**
 * Check if user has instructor role or higher
 *
 * @param {Object} user - User object
 * @returns {boolean} True if user is instructor, expert, or admin
 */
export function isInstructorOrAbove(user) {
  return [USER_ROLES.INSTRUCTOR, USER_ROLES.EXPERT, USER_ROLES.ADMIN].includes(
    user?.role
  );
}

/**
 * Check if user has expert or admin role
 *
 * @param {Object} user - User object
 * @returns {boolean} True if user is expert or admin
 */
export function isExpertOrAdmin(user) {
  return [USER_ROLES.EXPERT, USER_ROLES.ADMIN].includes(user?.role);
}

// Export all utilities
export default {
  getServerSession,
  requireAuth,
  requireRole,
  checkPermission,
  withAuth,
  getAuthRedirect,
  isAdmin,
  isInstructorOrAbove,
  isExpertOrAdmin,
};

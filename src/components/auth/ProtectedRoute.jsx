/**
 * =============================================================================
 * ProtectedRoute Component for VentyLab
 * =============================================================================
 * Higher-order component that wraps pages/components to protect them based
 * on authentication status and user roles.
 *
 * Features:
 * - Authentication-based protection
 * - Role-based access control
 * - Automatic redirects for unauthorized access
 * - Loading states
 * - Query parameter preservation
 * =============================================================================
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';

/**
 * Loading fallback component
 */
const DefaultLoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: 2,
    }}
  >
    <CircularProgress size={60} />
    <Typography variant="body1" color="text.secondary">
      Verificando permisos...
    </Typography>
  </Box>
);

/**
 * ProtectedRoute component
 *
 * Protects routes based on authentication and roles. Automatically redirects
 * unauthorized users to appropriate pages.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string|string[]} props.requiredRole - Required role(s) to access (optional)
 * @param {boolean} props.requireAuth - Whether authentication is required (default: true)
 * @param {string} props.redirectTo - URL to redirect if not authenticated (default: '/auth/login')
 * @param {React.ReactNode} props.fallback - Custom loading component (optional)
 * @param {boolean} props.preserveQuery - Preserve query params in redirect (default: true)
 * @param {Function} props.onAccessDenied - Callback when access is denied (optional)
 * @param {Function} props.onAccessGranted - Callback when access is granted (optional)
 *
 * @example
 * // Require authentication only
 * <ProtectedRoute>
 *   <UserProfile />
 * </ProtectedRoute>
 *
 * @example
 * // Require specific role
 * <ProtectedRoute requiredRole="ADMIN">
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * @example
 * // Require one of multiple roles
 * <ProtectedRoute requiredRole={['INSTRUCTOR', 'ADMIN']}>
 *   <ContentManager />
 * </ProtectedRoute>
 *
 * @example
 * // Custom loading and redirect
 * <ProtectedRoute
 *   fallback={<CustomLoader />}
 *   redirectTo="/login"
 *   preserveQuery={false}
 * >
 *   <Dashboard />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  requiredRole = null,
  requireAuth = true,
  redirectTo = '/auth/login',
  fallback = null,
  preserveQuery = true,
  onAccessDenied = null,
  onAccessGranted = null,
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasRole, hasAnyRole, role, user } = useAuth();

  /**
   * Check if user has required permissions
   */
  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // If authentication is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      console.warn('[ProtectedRoute] Access denied: User not authenticated');

      // Execute callback
      if (typeof onAccessDenied === 'function') {
        onAccessDenied({ reason: 'not_authenticated' });
      }

      // Build redirect URL
      let redirectUrl = redirectTo;
      if (preserveQuery) {
        const callbackUrl = encodeURIComponent(router.asPath);
        redirectUrl = `${redirectTo}?callbackUrl=${callbackUrl}`;
      }

      // Redirect to login
      router.replace(redirectUrl);
      return;
    }

    // If specific role(s) are required
    if (requiredRole && isAuthenticated) {
      const hasPermission = Array.isArray(requiredRole)
        ? hasAnyRole(requiredRole)
        : hasRole(requiredRole);

      if (!hasPermission) {
        console.warn('[ProtectedRoute] Access denied: Insufficient permissions', {
          userRole: role,
          requiredRole,
        });

        // Execute callback
        if (typeof onAccessDenied === 'function') {
          onAccessDenied({
            reason: 'insufficient_permissions',
            userRole: role,
            requiredRole,
          });
        }

        // Redirect to access denied page
        const reason = Array.isArray(requiredRole)
          ? `Se requiere uno de estos roles: ${requiredRole.join(', ')}`
          : `Se requiere el rol: ${requiredRole}`;
        router.replace(`/auth/access-denied?reason=${encodeURIComponent(reason)}`);
        return;
      }
    }

    // Access granted
    if (!isLoading && isAuthenticated) {
      console.log('[ProtectedRoute] Access granted', {
        user: user?.email,
        role: role,
      });

      // Execute callback
      if (typeof onAccessGranted === 'function') {
        onAccessGranted({ user, role });
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    requiredRole,
    requireAuth,
    router,
    redirectTo,
    preserveQuery,
    hasRole,
    hasAnyRole,
    role,
    user,
    onAccessDenied,
    onAccessGranted,
  ]);

  // Show loading state
  if (isLoading) {
    return fallback || <DefaultLoadingFallback />;
  }

  // If not authenticated and auth is required, don't render (redirect will happen)
  if (requireAuth && !isAuthenticated) {
    return fallback || <DefaultLoadingFallback />;
  }

  // If role is required and user doesn't have it, don't render (redirect will happen)
  if (requiredRole && isAuthenticated) {
    const hasPermission = Array.isArray(requiredRole)
      ? hasAnyRole(requiredRole)
      : hasRole(requiredRole);

    if (!hasPermission) {
      return fallback || <DefaultLoadingFallback />;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  requireAuth: PropTypes.bool,
  redirectTo: PropTypes.string,
  fallback: PropTypes.node,
  preserveQuery: PropTypes.bool,
  onAccessDenied: PropTypes.func,
  onAccessGranted: PropTypes.func,
};

ProtectedRoute.defaultProps = {
  requiredRole: null,
  requireAuth: true,
  redirectTo: '/auth/login',
  fallback: null,
  preserveQuery: true,
  onAccessDenied: null,
  onAccessGranted: null,
};

export default ProtectedRoute;

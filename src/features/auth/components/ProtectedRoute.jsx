/**
 * =============================================================================
 * ProtectedRoute Component for VentyLab
 * =============================================================================
 * Higher-order component that protects pages/components based on
 * authentication status and user roles.
 *
 * Features:
 * - Authentication-based protection
 * - Role-based access control with hierarchy support
 * - superuser automatically satisfies admin/teacher requirements
 * - Automatic redirects for unauthorized access
 * - Loading states with customizable fallback
 * =============================================================================
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/shared/hooks/useAuth';
import { ROLES } from '@/lib/roles';

/**
 * Default loading fallback component
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
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string|string[]} props.requiredRole - Required role(s) to access
 * @param {boolean} props.requireAuth - Whether authentication is required (default: true)
 * @param {string} props.redirectTo - URL to redirect if not authenticated
 * @param {React.ReactNode} props.fallback - Custom loading component
 * @param {boolean} props.preserveQuery - Preserve query params in redirect
 * @param {Function} props.onAccessDenied - Callback when access is denied
 * @param {Function} props.onAccessGranted - Callback when access is granted
 *
 * @example
 * // Require authentication only
 * <ProtectedRoute>
 *   <UserProfile />
 * </ProtectedRoute>
 *
 * @example
 * // Require admin role (superuser also passes)
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * @example
 * // Require teacher or admin (superuser also passes)
 * <ProtectedRoute requiredRole={['teacher', 'admin']}>
 *   <ContentManager />
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
  const { isAuthenticated, isLoading, role, user, canAccess } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // Not authenticated but auth is required
    if (requireAuth && !isAuthenticated) {
      console.warn('[ProtectedRoute] Access denied: User not authenticated');

      if (typeof onAccessDenied === 'function') {
        onAccessDenied({ reason: 'not_authenticated' });
      }

      // Build redirect URL with callback
      let redirectUrl = redirectTo;
      if (preserveQuery) {
        const callbackUrl = encodeURIComponent(router.asPath);
        redirectUrl = `${redirectTo}?callbackUrl=${callbackUrl}`;
      }

      router.replace(redirectUrl);
      return;
    }

    // Role check required
    if (requiredRole && isAuthenticated) {
      // canAccess handles role hierarchy (superuser > admin > teacher > student)
      const hasPermission = canAccess(requiredRole);

      if (!hasPermission) {
        console.warn('[ProtectedRoute] Access denied: Insufficient permissions', {
          userRole: role,
          requiredRole,
        });

        if (typeof onAccessDenied === 'function') {
          onAccessDenied({
            reason: 'insufficient_permissions',
            userRole: role,
            requiredRole,
          });
        }

        // Redirect to access denied page with reason
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
        role,
      });

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
    role,
    user,
    canAccess,
    onAccessDenied,
    onAccessGranted,
  ]);

  // Show loading state
  if (isLoading) {
    return fallback || <DefaultLoadingFallback />;
  }

  // Not authenticated - show loading while redirecting
  if (requireAuth && !isAuthenticated) {
    return fallback || <DefaultLoadingFallback />;
  }

  // Role required but insufficient - show loading while redirecting
  if (requiredRole && isAuthenticated && !canAccess(requiredRole)) {
    return fallback || <DefaultLoadingFallback />;
  }

  // All checks passed
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

// Export ROLES for convenience when using ProtectedRoute
export { ROLES };

export default ProtectedRoute;

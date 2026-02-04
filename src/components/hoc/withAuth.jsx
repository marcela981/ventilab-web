/**
 * =============================================================================
 * withAuth Higher Order Component
 * =============================================================================
 *
 * HOC that protects routes by checking authentication and authorization.
 * Uses centralized role system with superuser inheritance.
 *
 * Features:
 * - Authentication verification
 * - Role-based authorization with hierarchy (superuser > admin > teacher > student)
 * - Automatic redirects for unauthorized users
 * - Loading state handling
 * - Preserves callback URL for post-login redirect
 *
 * @example
 * // Any authenticated user
 * export default withAuth(Dashboard);
 *
 * // Admin only (superuser also passes)
 * export default withAuth(AdminPanel, ['admin']);
 *
 * // Teacher or admin (superuser also passes)
 * export default withAuth(CreateModule, ['teacher', 'admin']);
 * =============================================================================
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Box } from '@mui/material';
import PropTypes from 'prop-types';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES, canAccessWithRoles } from '@/lib/roles';

/**
 * Higher Order Component for route protection
 *
 * @param {React.Component} WrappedComponent - The component to protect
 * @param {string[]} [allowedRoles] - Array of allowed roles. If not provided, only
 *                                    authentication is checked. superuser automatically
 *                                    passes all role checks.
 * @returns {React.Component} Protected component with auth checks
 *
 * @example
 * const ProtectedDashboard = withAuth(Dashboard, [ROLES.ADMIN]);
 */
function withAuth(WrappedComponent, allowedRoles = null) {
  function ProtectedComponent(props) {
    const { user, isAuthenticated, isLoading, role, canAccess } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // Skip checks while loading
      if (isLoading) return;

      // Check authentication
      if (!isAuthenticated) {
        const returnUrl = router.asPath;
        router.push({
          pathname: '/auth/login',
          query: { returnUrl },
        });
        return;
      }

      // Check role authorization if roles are specified
      if (allowedRoles && allowedRoles.length > 0) {
        // canAccess handles role hierarchy (superuser can access everything)
        const hasRequiredRole = canAccess(allowedRoles);

        if (!hasRequiredRole) {
          router.push({
            pathname: '/auth/access-denied',
            query: {
              required: allowedRoles.join(', '),
              current: role,
            },
          });
          return;
        }
      }
    }, [isAuthenticated, isLoading, user, router, role, canAccess]);

    // Loading state
    if (isLoading) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          flexDirection="column"
          gap={2}
        >
          <CircularProgress size={60} />
          <Box sx={{ color: 'text.secondary', fontSize: '1.1rem' }}>
            Verificando autenticación...
          </Box>
        </Box>
      );
    }

    // Not authenticated - redirecting
    if (!isAuthenticated) {
      return null;
    }

    // Check authorization
    if (allowedRoles && allowedRoles.length > 0) {
      const hasRequiredRole = canAccess(allowedRoles);
      if (!hasRequiredRole) {
        return null; // Redirecting
      }
    }

    // All checks passed
    return <WrappedComponent {...props} />;
  }

  // Set display name for debugging
  const wrappedComponentName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';
  ProtectedComponent.displayName = `withAuth(${wrappedComponentName})`;

  // Preserve static methods for Next.js
  if (WrappedComponent.getInitialProps) {
    ProtectedComponent.getInitialProps = WrappedComponent.getInitialProps;
  }
  if (WrappedComponent.getServerSideProps) {
    ProtectedComponent.getServerSideProps = WrappedComponent.getServerSideProps;
  }
  if (WrappedComponent.getStaticProps) {
    ProtectedComponent.getStaticProps = WrappedComponent.getStaticProps;
  }

  ProtectedComponent.propTypes = {
    ...WrappedComponent.propTypes,
  };

  return ProtectedComponent;
}

withAuth.propTypes = {
  WrappedComponent: PropTypes.elementType.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};

export default withAuth;

// =============================================================================
// Convenience HOCs with new role values
// =============================================================================

/**
 * HOC for Student-only routes
 * Note: teachers, admins, and superusers can also access
 * @example export default withStudentAuth(MyStudentPage);
 */
export function withStudentAuth(Component) {
  return withAuth(Component, [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPERUSER]);
}

/**
 * HOC for Teacher-level routes
 * Allows: teacher, admin, superuser
 * @example export default withTeacherAuth(CreateModulePage);
 */
export function withTeacherAuth(Component) {
  return withAuth(Component, [ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPERUSER]);
}

/**
 * HOC for Admin-level routes
 * Allows: admin, superuser
 * @example export default withAdminAuth(AdminPanel);
 */
export function withAdminAuth(Component) {
  return withAuth(Component, [ROLES.ADMIN, ROLES.SUPERUSER]);
}

/**
 * HOC for Superuser-only routes
 * @example export default withSuperuserAuth(SystemSettings);
 */
export function withSuperuserAuth(Component) {
  return withAuth(Component, [ROLES.SUPERUSER]);
}

/**
 * HOC for any authenticated user (all roles)
 * @example export default withAnyAuth(ProfilePage);
 */
export function withAnyAuth(Component) {
  return withAuth(Component, [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPERUSER]);
}

// Export ROLES for convenience
export { ROLES };

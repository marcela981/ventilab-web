/**
 * =============================================================================
 * withAuth Higher Order Component
 * =============================================================================
 *
 * HOC (Higher Order Component) that protects routes by checking authentication
 * and authorization status. It wraps components and automatically handles
 * redirects for unauthenticated users and unauthorized access.
 *
 * Features:
 * - Authentication verification
 * - Role-based authorization
 * - Automatic redirect to login for unauthenticated users
 * - Automatic redirect to forbidden page for unauthorized users
 * - Loading state handling
 * - Preserves callback URL for post-login redirect
 * - Type-safe with PropTypes
 *
 * =============================================================================
 * Usage Examples
 * =============================================================================
 *
 * @example
 * // Basic authentication (any authenticated user)
 * import withAuth from '@/components/hoc/withAuth';
 *
 * function Dashboard() {
 *   return <div>Dashboard Content</div>;
 * }
 *
 * export default withAuth(Dashboard);
 *
 * @example
 * // Single role protection (Admin only)
 * import withAuth from '@/components/hoc/withAuth';
 *
 * function AdminPanel() {
 *   return <div>Admin Panel</div>;
 * }
 *
 * export default withAuth(AdminPanel, ['ADMIN']);
 *
 * @example
 * // Multiple roles (Teacher or Admin)
 * import withAuth from '@/components/hoc/withAuth';
 *
 * function CreateModule() {
 *   return <div>Create New Module</div>;
 * }
 *
 * export default withAuth(CreateModule, ['TEACHER', 'ADMIN']);
 *
 * @example
 * // With Next.js getServerSideProps
 * import withAuth from '@/components/hoc/withAuth';
 *
 * function ProfilePage({ userData }) {
 *   return <div>Profile: {userData.name}</div>;
 * }
 *
 * export const getServerSideProps = async (context) => {
 *   return {
 *     props: {
 *       userData: { name: 'John' }
 *     }
 *   };
 * };
 *
 * export default withAuth(ProfilePage);
 *
 * @example
 * // Student-only page
 * import withAuth from '@/components/hoc/withAuth';
 *
 * function LessonViewer() {
 *   return <div>Lesson Content</div>;
 * }
 *
 * export default withAuth(LessonViewer, ['STUDENT', 'TEACHER', 'ADMIN']);
 *
 * =============================================================================
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Box } from '@mui/material';
import PropTypes from 'prop-types';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Higher Order Component for route protection
 *
 * Wraps a component and adds authentication/authorization checks.
 * Automatically redirects unauthorized users to appropriate pages.
 *
 * @param {React.Component} WrappedComponent - The component to protect
 * @param {string[]} [allowedRoles] - Array of allowed roles (STUDENT, TEACHER, ADMIN)
 *                                     If not provided, only authentication is checked
 * @returns {React.Component} Protected component with auth checks
 *
 * @example
 * const ProtectedDashboard = withAuth(Dashboard, ['ADMIN']);
 */
function withAuth(WrappedComponent, allowedRoles = null) {
  /**
   * ProtectedComponent - The wrapper component that handles auth checks
   *
   * This component:
   * 1. Checks if user is authenticated
   * 2. Checks if user has required role (if allowedRoles specified)
   * 3. Shows loading state while checking
   * 4. Redirects to login or forbidden page as needed
   * 5. Renders wrapped component if all checks pass
   */
  function ProtectedComponent(props) {
    // ==========================================================================
    // STEP 1: Get authentication state from AuthContext
    // ==========================================================================
    const { user, isAuthenticated, isLoading } = useAuth();

    // ==========================================================================
    // STEP 2: Get Next.js router for navigation
    // ==========================================================================
    const router = useRouter();

    // ==========================================================================
    // STEP 3: Authentication and Authorization checks
    // ==========================================================================
    useEffect(() => {
      // Skip checks while loading to avoid false redirects
      if (isLoading) {
        return;
      }

      // ========================================================================
      // Check 1: User must be authenticated
      // ========================================================================
      if (!isAuthenticated) {
        // Save the current URL to redirect back after login
        const returnUrl = router.asPath;

        // Redirect to login page with return URL as query parameter
        router.push({
          pathname: '/login',
          query: { returnUrl },
        });

        return; // Exit early to prevent further checks
      }

      // ========================================================================
      // Check 2: User must have one of the allowed roles (if specified)
      // ========================================================================
      if (allowedRoles && allowedRoles.length > 0) {
        // Check if user's role is in the allowed roles array
        const hasRequiredRole = allowedRoles.includes(user.role);

        if (!hasRequiredRole) {
          // User is authenticated but doesn't have the required role
          // Redirect to forbidden/access denied page
          router.push({
            pathname: '/forbidden',
            query: {
              required: allowedRoles.join(', '),
              current: user.role,
            },
          });

          return; // Exit early
        }
      }

      // All checks passed - user is authenticated and authorized
      // Component will render normally
    }, [isAuthenticated, isLoading, user, router]);

    // ==========================================================================
    // STEP 4: Show loading state while checking authentication
    // ==========================================================================
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

    // ==========================================================================
    // STEP 5: Don't render anything while redirecting
    // ==========================================================================
    // If not authenticated or not authorized, useEffect will redirect
    // Return null to prevent flash of content
    if (!isAuthenticated) {
      return null;
    }

    // Check authorization if roles are specified
    if (allowedRoles && allowedRoles.length > 0) {
      const hasRequiredRole = allowedRoles.includes(user.role);
      if (!hasRequiredRole) {
        return null; // Redirecting, don't show content
      }
    }

    // ==========================================================================
    // STEP 6: Render the wrapped component with all props
    // ==========================================================================
    // All checks passed - render the protected component
    // Spread all props to maintain prop forwarding
    return <WrappedComponent {...props} />;
  }

  // ============================================================================
  // Set display name for debugging
  // ============================================================================
  // This helps identify the component in React DevTools
  const wrappedComponentName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  ProtectedComponent.displayName = `withAuth(${wrappedComponentName})`;

  // ============================================================================
  // Copy static properties from wrapped component
  // ============================================================================
  // Preserve static methods like getInitialProps, getServerSideProps, etc.
  // This is important for Next.js data fetching
  if (WrappedComponent.getInitialProps) {
    ProtectedComponent.getInitialProps = WrappedComponent.getInitialProps;
  }

  if (WrappedComponent.getServerSideProps) {
    ProtectedComponent.getServerSideProps = WrappedComponent.getServerSideProps;
  }

  if (WrappedComponent.getStaticProps) {
    ProtectedComponent.getStaticProps = WrappedComponent.getStaticProps;
  }

  // ============================================================================
  // PropTypes for the HOC
  // ============================================================================
  ProtectedComponent.propTypes = {
    // Accept any props that the wrapped component accepts
    ...WrappedComponent.propTypes,
  };

  return ProtectedComponent;
}

// ==============================================================================
// PropTypes for withAuth function
// ==============================================================================
withAuth.propTypes = {
  WrappedComponent: PropTypes.elementType.isRequired,
  allowedRoles: PropTypes.arrayOf(
    PropTypes.oneOf(['STUDENT', 'TEACHER', 'ADMIN'])
  ),
};

// ==============================================================================
// Export
// ==============================================================================
export default withAuth;

// ==============================================================================
// Additional Utility HOCs
// ==============================================================================

/**
 * HOC for Student-only routes
 * Shorthand for withAuth(Component, ['STUDENT'])
 *
 * @param {React.Component} Component - Component to protect
 * @returns {React.Component} Protected component
 *
 * @example
 * export default withStudentAuth(MyStudentPage);
 */
export function withStudentAuth(Component) {
  return withAuth(Component, ['STUDENT']);
}

/**
 * HOC for Teacher-only routes
 * Shorthand for withAuth(Component, ['TEACHER', 'ADMIN'])
 *
 * @param {React.Component} Component - Component to protect
 * @returns {React.Component} Protected component
 *
 * @example
 * export default withTeacherAuth(CreateModulePage);
 */
export function withTeacherAuth(Component) {
  return withAuth(Component, ['TEACHER', 'ADMIN']);
}

/**
 * HOC for Admin-only routes
 * Shorthand for withAuth(Component, ['ADMIN'])
 *
 * @param {React.Component} Component - Component to protect
 * @returns {React.Component} Protected component
 *
 * @example
 * export default withAdminAuth(AdminPanel);
 */
export function withAdminAuth(Component) {
  return withAuth(Component, ['ADMIN']);
}

/**
 * HOC for any authenticated user (all roles)
 * Shorthand for withAuth(Component, ['STUDENT', 'TEACHER', 'ADMIN'])
 *
 * @param {React.Component} Component - Component to protect
 * @returns {React.Component} Protected component
 *
 * @example
 * export default withAnyAuth(ProfilePage);
 */
export function withAnyAuth(Component) {
  return withAuth(Component, ['STUDENT', 'TEACHER', 'ADMIN']);
}

// ==============================================================================
// Usage Notes
// ==============================================================================

/**
 * IMPORTANT NOTES:
 *
 * 1. Login Page Setup:
 *    Create a login page at /pages/login.js that handles the returnUrl query param:
 *
 *    // pages/login.js
 *    function LoginPage() {
 *      const router = useRouter();
 *      const { returnUrl } = router.query;
 *
 *      const handleLogin = async (credentials) => {
 *        const success = await login(credentials);
 *        if (success) {
 *          router.push(returnUrl || '/dashboard');
 *        }
 *      };
 *      // ... rest of login form
 *    }
 *
 * 2. Forbidden Page Setup:
 *    Create a forbidden page at /pages/forbidden.js:
 *
 *    // pages/forbidden.js
 *    function ForbiddenPage() {
 *      const router = useRouter();
 *      const { required, current } = router.query;
 *
 *      return (
 *        <div>
 *          <h1>Access Denied</h1>
 *          <p>Required role: {required}</p>
 *          <p>Your role: {current}</p>
 *        </div>
 *      );
 *    }
 *
 * 3. Material-UI Setup:
 *    This HOC uses Material-UI for the loading spinner.
 *    Install if not already present:
 *    npm install @mui/material @emotion/react @emotion/styled
 *
 * 4. Combining with getServerSideProps:
 *    The HOC preserves Next.js data fetching methods:
 *
 *    function Dashboard({ data }) {
 *      return <div>{data}</div>;
 *    }
 *
 *    export const getServerSideProps = async () => {
 *      return { props: { data: 'some data' } };
 *    };
 *
 *    export default withAuth(Dashboard, ['ADMIN']);
 *
 * 5. Typescript Support:
 *    For TypeScript, create withAuth.tsx with proper typing:
 *
 *    function withAuth<P extends object>(
 *      WrappedComponent: React.ComponentType<P>,
 *      allowedRoles?: UserRole[]
 *    ): React.FC<P> { ... }
 */

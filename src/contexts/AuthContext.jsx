/**
 * =============================================================================
 * AuthContext - Global Authentication State Management
 * =============================================================================
 *
 * Provides React Context for managing authentication state globally.
 * Uses the useAuth hook and makes its values available to all child components.
 *
 * Key exports:
 * - AuthProvider: Wrap your app with this
 * - useAuth: Hook to consume auth context
 * - RequireAuth: Component wrapper requiring authentication
 * - RequireRole: Component wrapper requiring specific role(s)
 * - RequirePermission: Component wrapper requiring specific permission(s)
 *
 * @example
 * // In _app.js
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 *
 * // In any component
 * const { user, role, isTeacher, hasPermission } = useAuth();
 * =============================================================================
 */

import React, { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { canAccessWithRoles } from '@/lib/roles';

// =============================================================================
// Context Creation
// =============================================================================

const AuthContext = createContext(undefined);
AuthContext.displayName = 'AuthContext';

// =============================================================================
// AuthProvider Component
// =============================================================================

/**
 * Authentication Provider Component
 * Wraps the application and provides authentication state to all children
 */
export const AuthProvider = React.memo(function AuthProvider({ children }) {
  const auth = useAuthHook();

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => auth, [auth]);

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
});

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// =============================================================================
// useAuth Hook
// =============================================================================

/**
 * Custom hook to consume authentication context
 *
 * @throws {Error} If used outside of AuthProvider
 * @returns {Object} Authentication context value
 *
 * @property {Object|null} user - Current user object from backend
 * @property {string|null} role - User's role (student|teacher|admin|superuser)
 * @property {boolean} isAuthenticated - True if user is logged in
 * @property {boolean} isLoading - True if checking authentication status
 * @property {Object|null} error - Error object if authentication fails
 * @property {Function} isStudent - Check if user is student: () => boolean
 * @property {Function} isTeacher - Check if user is teacher/admin/superuser: () => boolean
 * @property {Function} isAdmin - Check if user is admin/superuser: () => boolean
 * @property {Function} isSuperuser - Check if user is superuser: () => boolean
 * @property {Function} hasRole - Check specific role: (role) => boolean
 * @property {Function} hasAnyRole - Check any of roles: (roles[]) => boolean
 * @property {Function} canAccess - Check route access: (requiredRoles) => boolean
 * @property {Function} hasPermission - Check permission: (permission) => boolean
 * @property {Function} hasAnyPermission - Check any permission: (permissions[]) => boolean
 * @property {Function} login - Login: (email, password) => Promise<boolean>
 * @property {Function} register - Register: (name, email, password) => Promise<boolean>
 * @property {Function} logout - Logout: () => Promise<boolean>
 * @property {Function} refreshUser - Refresh user data: () => Promise<boolean>
 *
 * @example
 * const { user, role, isTeacher, hasPermission } = useAuth();
 *
 * // Role checks are functions - call them!
 * if (isTeacher()) {
 *   return <TeacherDashboard />;
 * }
 *
 * if (hasPermission('create_modules')) {
 *   return <CreateModuleButton />;
 * }
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
        'Make sure your component is wrapped with <AuthProvider>.'
    );
  }

  return context;
}

// =============================================================================
// Default Export
// =============================================================================

export default AuthContext;

// =============================================================================
// Helper Components
// =============================================================================

/**
 * RequireAuth Component
 * Wrapper that requires authentication to render children
 *
 * @example
 * <RequireAuth>
 *   <ProtectedContent />
 * </RequireAuth>
 */
export function RequireAuth({
  children,
  redirectTo = '/auth/login',
  loadingComponent = null,
}) {
  const { isAuthenticated, isLoading } = useAuth();

  // Client-side router
  const router =
    typeof window !== 'undefined' ? require('next/router').useRouter() : null;

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && router) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  if (isLoading) {
    return loadingComponent;
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}

RequireAuth.propTypes = {
  children: PropTypes.node.isRequired,
  redirectTo: PropTypes.string,
  loadingComponent: PropTypes.node,
};

/**
 * RequireRole Component
 * Wrapper that requires specific role(s) to render children.
 * Accounts for role hierarchy (superuser > admin > teacher > student).
 *
 * @example
 * // Single role
 * <RequireRole role="admin">
 *   <AdminContent />
 * </RequireRole>
 *
 * // Multiple roles (OR logic)
 * <RequireRole role={['teacher', 'admin']}>
 *   <InstructorContent />
 * </RequireRole>
 */
export function RequireRole({ children, role: requiredRole, fallback = null }) {
  const { role: userRole, isAuthenticated } = useAuth();

  // Not authenticated - no access
  if (!isAuthenticated) {
    return fallback;
  }

  // Check access using centralized helper (handles superuser inheritance)
  const hasAccess = canAccessWithRoles(userRole, requiredRole);

  if (!hasAccess) {
    return fallback;
  }

  return children;
}

RequireRole.propTypes = {
  children: PropTypes.node.isRequired,
  role: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]).isRequired,
  fallback: PropTypes.node,
};

/**
 * RequirePermission Component
 * Wrapper that requires specific permission(s) to render children
 *
 * @example
 * <RequirePermission permission="create_modules">
 *   <CreateModuleButton />
 * </RequirePermission>
 *
 * // Multiple permissions (OR logic)
 * <RequirePermission permission={['edit_modules', 'delete_own_modules']}>
 *   <ModuleManagementTools />
 * </RequirePermission>
 */
export function RequirePermission({
  children,
  permission,
  fallback = null,
}) {
  const { hasPermission, hasAnyPermission } = useAuth();

  const hasRequiredPermission = Array.isArray(permission)
    ? hasAnyPermission(permission)
    : hasPermission(permission);

  if (!hasRequiredPermission) {
    return fallback;
  }

  return children;
}

RequirePermission.propTypes = {
  children: PropTypes.node.isRequired,
  permission: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]).isRequired,
  fallback: PropTypes.node,
};

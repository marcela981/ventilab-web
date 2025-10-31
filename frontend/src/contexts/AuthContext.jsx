/**
 * =============================================================================
 * AuthContext - Global Authentication State Management
 * =============================================================================
 *
 * This file provides a React Context for managing authentication state globally
 * across the VentyLab application. It wraps the useAuth hook and makes its
 * values available to all child components through the context API.
 *
 * Benefits:
 * - Single source of truth for authentication state
 * - Avoids prop drilling throughout the component tree
 * - Provides consistent authentication interface across the app
 * - Optimized with React.memo to prevent unnecessary re-renders
 *
 * =============================================================================
 * Integration Guide
 * =============================================================================
 *
 * To use this context in your Next.js application, wrap your root component
 * in pages/_app.js with the AuthProvider:
 *
 * ```jsx
 * // pages/_app.js
 * import { AuthProvider } from '@/contexts/AuthContext';
 *
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <AuthProvider>
 *       <Component {...pageProps} />
 *     </AuthProvider>
 *   );
 * }
 *
 * export default MyApp;
 * ```
 *
 * Then consume the context in any child component:
 *
 * ```jsx
 * // Any component in your app
 * import { useAuth } from '@/contexts/AuthContext';
 *
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <LoginPrompt />;
 *   }
 *
 *   return <div>Welcome, {user.name}!</div>;
 * }
 * ```
 *
 * =============================================================================
 * Usage Examples
 * =============================================================================
 *
 * @example
 * // Protected Route Component
 * import { useAuth } from '@/contexts/AuthContext';
 * import { useRouter } from 'next/router';
 * import { useEffect } from 'react';
 *
 * function ProtectedPage() {
 *   const { isAuthenticated, isLoading } = useAuth();
 *   const router = useRouter();
 *
 *   useEffect(() => {
 *     if (!isLoading && !isAuthenticated) {
 *       router.push('/login');
 *     }
 *   }, [isAuthenticated, isLoading, router]);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   return <ProtectedContent />;
 * }
 *
 * @example
 * // Role-based Rendering
 * import { useAuth } from '@/contexts/AuthContext';
 *
 * function Dashboard() {
 *   const { isTeacher, isAdmin, hasPermission } = useAuth();
 *
 *   return (
 *     <div>
 *       {isTeacher && <TeacherDashboard />}
 *       {isAdmin && <AdminPanel />}
 *       {hasPermission('create_modules') && <CreateModuleButton />}
 *     </div>
 *   );
 * }
 *
 * @example
 * // Login Form Component
 * import { useAuth } from '@/contexts/AuthContext';
 *
 * function LoginForm() {
 *   const { login, isLoading, error } = useAuth();
 *
 *   const handleSubmit = async (email, password) => {
 *     const success = await login(email, password);
 *     if (success) router.push('/dashboard');
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <ErrorMessage error={error} />}
 *       {/* Form fields */}
 *     </form>
 *   );
 * }
 *
 * =============================================================================
 */

import React, { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAuth as useAuthHook } from '@/hooks/useAuth';

// =============================================================================
// Context Creation
// =============================================================================

/**
 * Authentication Context
 * Provides authentication state and functions to all child components
 *
 * @type {React.Context}
 */
const AuthContext = createContext(undefined);

// Set display name for better debugging in React DevTools
AuthContext.displayName = 'AuthContext';

// =============================================================================
// AuthProvider Component
// =============================================================================

/**
 * Authentication Provider Component
 * Wraps the application and provides authentication state to all children
 *
 * This component uses the useAuth hook internally and exposes all its values
 * through React Context. It's memoized to prevent unnecessary re-renders.
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 * @returns {JSX.Element} Provider component with authentication context
 *
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export const AuthProvider = React.memo(function AuthProvider({ children }) {
  // Get all authentication state and functions from the hook
  const auth = useAuthHook();

  // Memoize the context value to prevent unnecessary re-renders
  // Only re-create if auth object reference changes
  const contextValue = useMemo(() => auth, [auth]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
});

// PropTypes for type checking
AuthProvider.propTypes = {
  /**
   * Child components that will have access to authentication context
   */
  children: PropTypes.node.isRequired,
};

// =============================================================================
// useAuth Hook
// =============================================================================

/**
 * Custom hook to consume authentication context
 *
 * This hook provides access to the authentication state and functions
 * from anywhere in the component tree that's wrapped by AuthProvider.
 *
 * @throws {Error} If used outside of AuthProvider
 * @returns {Object} Authentication context value with all auth state and functions
 *
 * @property {Object|null} user - Current user object with id, name, email, role
 * @property {boolean} isAuthenticated - True if user is logged in
 * @property {boolean} isLoading - True if checking authentication status
 * @property {Object|null} error - Error object if authentication fails
 * @property {boolean} isStudent - True if user role is STUDENT
 * @property {boolean} isTeacher - True if user role is TEACHER
 * @property {boolean} isAdmin - True if user role is ADMIN
 * @property {boolean} isTeacherOrAdmin - True if user is TEACHER or ADMIN
 * @property {Function} login - Login function (email, password) => Promise<boolean>
 * @property {Function} register - Register function (name, email, password) => Promise<boolean>
 * @property {Function} logout - Logout function () => Promise<boolean>
 * @property {Function} refreshUser - Refresh user data () => Promise<boolean>
 * @property {Function} isRole - Check if user has role (role) => boolean
 * @property {Function} hasPermission - Check permission (permission) => boolean
 * @property {Function} hasAnyRole - Check any role (roles[]) => boolean
 * @property {Function} hasAnyPermission - Check any permission (permissions[]) => boolean
 * @property {Object} USER_ROLES - Object with role constants
 * @property {Object} PERMISSIONS - Matrix of permissions by role
 *
 * @example
 * const { user, isAuthenticated, login } = useAuth();
 *
 * @example
 * const { hasPermission, isTeacher } = useAuth();
 * if (isTeacher && hasPermission('create_modules')) {
 *   // Show create module button
 * }
 *
 * @example
 * const { login, error } = useAuth();
 * const handleLogin = async () => {
 *   const success = await login(email, password);
 *   if (!success) {
 *     console.error(error.message);
 *   }
 * };
 */
export function useAuth() {
  const context = useContext(AuthContext);

  // Throw error if hook is used outside of AuthProvider
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Make sure your component is wrapped with <AuthProvider>. ' +
      'Typically this is done in pages/_app.js:\n\n' +
      'function MyApp({ Component, pageProps }) {\n' +
      '  return (\n' +
      '    <AuthProvider>\n' +
      '      <Component {...pageProps} />\n' +
      '    </AuthProvider>\n' +
      '  );\n' +
      '}'
    );
  }

  return context;
}

// =============================================================================
// Default Export
// =============================================================================

/**
 * Default export of the AuthContext
 * You typically won't need to use this directly - use AuthProvider and useAuth instead
 */
export default AuthContext;

// =============================================================================
// Additional Helper Components (Optional)
// =============================================================================

/**
 * RequireAuth Component
 * Wrapper component that requires authentication to render children
 * Automatically redirects to login if user is not authenticated
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render if authenticated
 * @param {string} [props.redirectTo='/login'] - Where to redirect if not authenticated
 * @param {React.ReactNode} [props.loadingComponent] - Component to show while loading
 * @returns {JSX.Element|null} Children if authenticated, loading component, or null
 *
 * @example
 * import { RequireAuth } from '@/contexts/AuthContext';
 *
 * function ProtectedPage() {
 *   return (
 *     <RequireAuth>
 *       <ProtectedContent />
 *     </RequireAuth>
 *   );
 * }
 */
export function RequireAuth({
  children,
  redirectTo = '/login',
  loadingComponent = null
}) {
  const { isAuthenticated, isLoading } = useAuth();

  // Only works in client-side Next.js
  const router = typeof window !== 'undefined'
    ? require('next/router').useRouter()
    : null;

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
 * Wrapper component that requires a specific role to render children
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render if role matches
 * @param {string|string[]} props.role - Required role(s)
 * @param {React.ReactNode} [props.fallback] - Component to show if role doesn't match
 * @returns {JSX.Element|null} Children if role matches, fallback, or null
 *
 * @example
 * import { RequireRole } from '@/contexts/AuthContext';
 *
 * function AdminPanel() {
 *   return (
 *     <RequireRole role="ADMIN">
 *       <AdminContent />
 *     </RequireRole>
 *   );
 * }
 *
 * @example
 * // Multiple roles
 * <RequireRole role={['TEACHER', 'ADMIN']} fallback={<AccessDenied />}>
 *   <InstructorContent />
 * </RequireRole>
 */
export function RequireRole({ children, role, fallback = null }) {
  const { isRole, hasAnyRole } = useAuth();

  const hasRequiredRole = Array.isArray(role)
    ? hasAnyRole(role)
    : isRole(role);

  if (!hasRequiredRole) {
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
 * Wrapper component that requires a specific permission to render children
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render if permission granted
 * @param {string|string[]} props.permission - Required permission(s)
 * @param {React.ReactNode} [props.fallback] - Component to show if permission denied
 * @returns {JSX.Element|null} Children if permission granted, fallback, or null
 *
 * @example
 * import { RequirePermission } from '@/contexts/AuthContext';
 *
 * function ModuleCreator() {
 *   return (
 *     <RequirePermission permission="create_modules">
 *       <CreateModuleButton />
 *     </RequirePermission>
 *   );
 * }
 *
 * @example
 * // Multiple permissions (OR logic)
 * <RequirePermission
 *   permission={['edit_modules', 'delete_own_modules']}
 *   fallback={<PermissionDenied />}
 * >
 *   <ModuleManagementTools />
 * </RequirePermission>
 */
export function RequirePermission({ children, permission, fallback = null }) {
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

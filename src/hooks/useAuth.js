/**
 * =============================================================================
 * useAuth Hook for VentyLab
 * =============================================================================
 * Custom React hook that manages authentication state and provides
 * authorization helpers. Uses centralized role definitions from lib/roles.js.
 *
 * Key principles:
 * - Trusts backend role data (no inference)
 * - Uses centralized role helpers for consistency
 * - superuser automatically satisfies admin/teacher checks
 *
 * @example
 * const { user, role, isAuthenticated, isTeacher, hasRole } = useAuth();
 *
 * if (isTeacher()) {
 *   return <TeacherDashboard />;
 * }
 * =============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  getCurrentUser,
  isAuthenticated as checkAuthenticated,
  getUserData,
} from '@/services/authService';

// Import centralized role constants and helpers
import {
  ROLES,
  hasRole as checkHasRole,
  hasAnyRole as checkHasAnyRole,
  isStudent as checkIsStudent,
  isTeacher as checkIsTeacher,
  isAdmin as checkIsAdmin,
  isSuperuser as checkIsSuperuser,
  isTeacherOrAbove,
  isAdminOrAbove,
  canAccessWithRoles,
} from '@/lib/roles';

/**
 * Permissions Matrix
 * Defines what each role can do in the application.
 * superuser inherits all permissions.
 */
const PERMISSIONS = {
  [ROLES.STUDENT]: [
    'view_modules',
    'view_lessons',
    'complete_lessons',
    'view_own_progress',
    'update_own_profile',
  ],
  [ROLES.TEACHER]: [
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
  [ROLES.ADMIN]: [
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
  // superuser has all permissions
  [ROLES.SUPERUSER]: [
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
    'manage_superuser_settings',
  ],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
const roleHasPermission = (role, permission) => {
  const normalizedRole = role?.toLowerCase();
  const rolePermissions = PERMISSIONS[normalizedRole];
  if (!rolePermissions) return false;
  return rolePermissions.includes(permission);
};

/**
 * Custom hook for authentication and authorization
 *
 * @returns {Object} Authentication state and functions
 */
export function useAuth() {
  // ============================================================================
  // State Management
  // ============================================================================

  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  // Derive loading state from NextAuth status + local operations
  const isLoading = status === 'loading' || localLoading;

  // Use session user if available, fallback to local user state
  const currentUser = session?.user || user;

  // Derived authentication state
  const isAuthenticated = !!currentUser;

  // Get normalized role from user object (trust backend data)
  const role = currentUser?.role?.toLowerCase() || null;

  // ============================================================================
  // Sync NextAuth session with local user state
  // ============================================================================

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user) {
      console.log('[useAuth] Session authenticated:', session.user.email);
      setUser(session.user);
      setError(null);
    } else if (status === 'unauthenticated') {
      console.log('[useAuth] Session unauthenticated');

      // Check for custom auth token (non-OAuth login)
      if (checkAuthenticated()) {
        const cachedUser = getUserData();
        if (cachedUser) {
          setUser(cachedUser);
        }
      } else {
        setUser(null);
      }
    }
  }, [session, status]);

  // ============================================================================
  // Authentication Functions
  // ============================================================================

  const login = useCallback(async (email, password) => {
    setLocalLoading(true);
    setError(null);

    try {
      const result = await authLogin(email, password);

      if (result.success && result.data?.user) {
        setUser(result.data.user);
        setError(null);
        return true;
      } else {
        setUser(null);
        setError(result.error);
        return false;
      }
    } catch (err) {
      console.error('[useAuth] Login error:', err);
      setError({ message: 'Login failed', details: [err.message] });
      return false;
    } finally {
      setLocalLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setLocalLoading(true);
    setError(null);

    try {
      const result = await authRegister(name, email, password);

      if (result.success && result.data?.user) {
        setUser(result.data.user);
        setError(null);
        return true;
      } else {
        setUser(null);
        setError(result.error);
        return false;
      }
    } catch (err) {
      console.error('[useAuth] Registration error:', err);
      setError({ message: 'Registration failed', details: [err.message] });
      return false;
    } finally {
      setLocalLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setUser(null);
      setError(null);

      if (session) {
        await signOut({ redirect: false });
      }

      await authLogout();
      return true;
    } catch (err) {
      console.error('[useAuth] Logout error:', err);
      setUser(null);
      setError(null);
      return false;
    }
  }, [session]);

  const refreshUser = useCallback(async () => {
    setLocalLoading(true);
    setError(null);

    try {
      const result = await getCurrentUser();

      if (result.success && result.data?.user) {
        setUser(result.data.user);
        setError(null);
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      console.error('[useAuth] Refresh error:', err);
      setError({ message: 'Failed to refresh user data', details: [err.message] });
      return false;
    } finally {
      setLocalLoading(false);
    }
  }, []);

  // ============================================================================
  // Role Helper Functions (use centralized helpers)
  // ============================================================================

  /**
   * Check if user has a specific role
   * @param {string} targetRole - Role to check
   * @returns {boolean}
   */
  const hasRole = useCallback(
    (targetRole) => {
      if (!isAuthenticated) return false;
      return checkHasRole(role, targetRole);
    },
    [isAuthenticated, role]
  );

  /**
   * Check if user has any of the specified roles
   * @param {string[]} roles - Roles to check
   * @returns {boolean}
   */
  const hasAnyRole = useCallback(
    (roles) => {
      if (!isAuthenticated) return false;
      return checkHasAnyRole(role, roles);
    },
    [isAuthenticated, role]
  );

  /**
   * Check if user is a student
   * @returns {boolean}
   */
  const isStudent = useCallback(() => {
    return checkIsStudent(role);
  }, [role]);

  /**
   * Check if user is a teacher (or higher: admin, superuser)
   * @returns {boolean}
   */
  const isTeacher = useCallback(() => {
    return checkIsTeacher(role);
  }, [role]);

  /**
   * Check if user is an admin (or superuser)
   * @returns {boolean}
   */
  const isAdmin = useCallback(() => {
    return checkIsAdmin(role);
  }, [role]);

  /**
   * Check if user is a superuser
   * @returns {boolean}
   */
  const isSuperuser = useCallback(() => {
    return checkIsSuperuser(role);
  }, [role]);

  /**
   * Check if user can access a route requiring specific roles
   * Accounts for role hierarchy (superuser > admin > teacher > student)
   * @param {string|string[]} requiredRoles - Required roles
   * @returns {boolean}
   */
  const canAccess = useCallback(
    (requiredRoles) => {
      if (!isAuthenticated) return false;
      return canAccessWithRoles(role, requiredRoles);
    },
    [isAuthenticated, role]
  );

  // ============================================================================
  // Permission Helper Functions
  // ============================================================================

  /**
   * Check if user has a specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  const hasPermission = useCallback(
    (permission) => {
      if (!isAuthenticated || !role) return false;
      return roleHasPermission(role, permission);
    },
    [isAuthenticated, role]
  );

  /**
   * Check if user has any of the specified permissions
   * @param {string[]} permissions - Permissions to check
   * @returns {boolean}
   */
  const hasAnyPermission = useCallback(
    (permissions) => {
      if (!isAuthenticated || !role) return false;
      if (!Array.isArray(permissions)) return false;
      return permissions.some((p) => roleHasPermission(role, p));
    },
    [isAuthenticated, role]
  );

  // ============================================================================
  // Memoized Return Value
  // ============================================================================

  return useMemo(
    () => ({
      // User data - trust backend, expose as-is
      user: currentUser,
      role,

      // Authentication state
      isAuthenticated,
      isLoading,
      error,

      // Authentication functions
      login,
      register,
      logout,
      refreshUser,

      // Role helpers (functions - call them!)
      hasRole,
      hasAnyRole,
      isStudent,
      isTeacher,
      isAdmin,
      isSuperuser,
      canAccess,

      // Permission helpers
      hasPermission,
      hasAnyPermission,

      // Constants (for reference)
      ROLES,
      PERMISSIONS,
    }),
    [
      currentUser,
      role,
      isAuthenticated,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshUser,
      hasRole,
      hasAnyRole,
      isStudent,
      isTeacher,
      isAdmin,
      isSuperuser,
      canAccess,
      hasPermission,
      hasAnyPermission,
    ]
  );
}

export default useAuth;

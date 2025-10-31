/**
 * =============================================================================
 * useAuth Hook for VentyLab
 * =============================================================================
 * Custom React hook that manages authentication state and provides
 * easy-to-use functions for login, logout, registration, and authorization.
 *
 * This hook wraps the authService and provides:
 * - User authentication state management
 * - Automatic token verification on mount
 * - Role-based authorization helpers
 * - Permission-based authorization using the PERMISSIONS matrix
 * - Optimized callbacks with useCallback
 * - Loading and error states
 *
 * Usage Examples:
 * ---------------
 *
 * @example
 * // Basic authentication check
 * const { user, isAuthenticated, isLoading } = useAuth();
 *
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) return <LoginPrompt />;
 * return <Dashboard user={user} />;
 *
 * @example
 * // Login functionality
 * const { login, error } = useAuth();
 *
 * const handleLogin = async (email, password) => {
 *   const success = await login(email, password);
 *   if (success) {
 *     router.push('/dashboard');
 *   }
 * };
 *
 * @example
 * // Role-based rendering
 * const { isAdmin, isTeacher, isStudent } = useAuth();
 *
 * if (isAdmin) return <AdminPanel />;
 * if (isTeacher) return <TeacherDashboard />;
 * return <StudentView />;
 *
 * @example
 * // Permission-based authorization
 * const { hasPermission } = useAuth();
 *
 * if (hasPermission('create_modules')) {
 *   return <CreateModuleButton />;
 * }
 *
 * @example
 * // Role checking
 * const { isRole } = useAuth();
 *
 * if (isRole('TEACHER')) {
 *   // Show teacher-specific content
 * }
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import {
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  getCurrentUser,
  isAuthenticated as checkAuthenticated,
  getUserData,
} from '@/services/authService';

/**
 * User Roles Constants
 * Matches the backend USER_ROLES enum
 */
const USER_ROLES = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
};

/**
 * Permissions Matrix
 * Defines what each role can do in the application
 * This should match the backend PERMISSIONS constant
 */
const PERMISSIONS = {
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
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} True if role has permission
 */
const roleHasPermission = (role, permission) => {
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;
  return rolePermissions.includes(permission);
};

/**
 * Custom hook for authentication and authorization
 *
 * @returns {Object} Authentication state and functions
 * @property {Object|null} user - Current user object with id, name, email, role
 * @property {boolean} isAuthenticated - True if user is logged in
 * @property {boolean} isLoading - True if checking authentication status
 * @property {Object|null} error - Error object if authentication fails
 * @property {boolean} isStudent - True if user role is STUDENT
 * @property {boolean} isTeacher - True if user role is TEACHER
 * @property {boolean} isAdmin - True if user role is ADMIN
 * @property {Function} login - Async function to login user
 * @property {Function} register - Async function to register new user
 * @property {Function} logout - Async function to logout user
 * @property {Function} isRole - Check if user has specific role
 * @property {Function} hasPermission - Check if user has specific permission
 * @property {Function} refreshUser - Manually refresh user data from server
 */
export function useAuth() {
  // ============================================================================
  // State Management
  // ============================================================================

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Derived authentication state
  const isAuthenticated = !!user && checkAuthenticated();

  // ============================================================================
  // Role-based Computed Properties
  // ============================================================================

  const isStudent = user?.role === USER_ROLES.STUDENT;
  const isTeacher = user?.role === USER_ROLES.TEACHER;
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  // ============================================================================
  // Authentication Verification (on mount and token change)
  // ============================================================================

  /**
   * Verify authentication on component mount
   * If a token exists, try to fetch current user data
   */
  useEffect(() => {
    const verifyAuth = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Check if token exists in localStorage
        if (!checkAuthenticated()) {
          // No token found, user is not authenticated
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Token exists, try to get cached user data first
        const cachedUser = getUserData();
        if (cachedUser) {
          setUser(cachedUser);
        }

        // Then verify with server and get fresh data
        const result = await getCurrentUser();

        if (result.success && result.data?.user) {
          setUser(result.data.user);
          setError(null);
        } else {
          // Token is invalid or expired
          setUser(null);
          setError(result.error);
        }
      } catch (err) {
        console.error('[useAuth] Verification error:', err);
        setUser(null);
        setError({
          message: 'Failed to verify authentication',
          details: [err.message],
        });
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []); // Only run on mount

  // ============================================================================
  // Authentication Functions
  // ============================================================================

  /**
   * Login user with email and password
   *
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<boolean>} True if login successful, false otherwise
   *
   * @example
   * const success = await login('user@example.com', 'password123');
   * if (success) {
   *   router.push('/dashboard');
   * } else {
   *   showError('Invalid credentials');
   * }
   */
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
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
      setError({
        message: 'Login failed',
        details: [err.message],
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register a new user account
   *
   * @param {string} name - User's full name
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<boolean>} True if registration successful, false otherwise
   *
   * @example
   * const success = await register('John Doe', 'john@example.com', 'pass123');
   * if (success) {
   *   router.push('/dashboard');
   * } else {
   *   showError('Registration failed');
   * }
   */
  const register = useCallback(async (name, email, password) => {
    setIsLoading(true);
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
      setError({
        message: 'Registration failed',
        details: [err.message],
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout the current user
   * Clears user state and removes token from storage
   *
   * @returns {Promise<boolean>} True if logout successful
   *
   * @example
   * await logout();
   * router.push('/login');
   */
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await authLogout();
      setUser(null);
      setError(null);
      return true;
    } catch (err) {
      console.error('[useAuth] Logout error:', err);
      // Even if logout fails, clear local state
      setUser(null);
      setError(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manually refresh user data from the server
   * Useful after profile updates or role changes
   *
   * @returns {Promise<boolean>} True if refresh successful
   *
   * @example
   * await updateProfile({ name: 'New Name' });
   * await refreshUser(); // Fetch updated data
   */
  const refreshUser = useCallback(async () => {
    setIsLoading(true);
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
      setError({
        message: 'Failed to refresh user data',
        details: [err.message],
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // Authorization Helper Functions
  // ============================================================================

  /**
   * Check if user has a specific role
   *
   * @param {string} role - Role to check (STUDENT, TEACHER, ADMIN)
   * @returns {boolean} True if user has the specified role
   *
   * @example
   * if (isRole('ADMIN')) {
   *   // Show admin-only content
   * }
   */
  const isRole = useCallback(
    (role) => {
      if (!isAuthenticated || !user) return false;
      return user.role === role;
    },
    [isAuthenticated, user]
  );

  /**
   * Check if user has a specific permission
   * Consults the PERMISSIONS matrix to determine access
   *
   * @param {string} permission - Permission to check (e.g., 'create_modules')
   * @returns {boolean} True if user's role has the specified permission
   *
   * @example
   * if (hasPermission('create_modules')) {
   *   return <CreateModuleButton />;
   * }
   *
   * @example
   * if (hasPermission('manage_users')) {
   *   return <UserManagementPanel />;
   * }
   */
  const hasPermission = useCallback(
    (permission) => {
      if (!isAuthenticated || !user?.role) return false;
      return roleHasPermission(user.role, permission);
    },
    [isAuthenticated, user]
  );

  /**
   * Check if user has any of the specified roles
   *
   * @param {string[]} roles - Array of roles to check
   * @returns {boolean} True if user has at least one of the specified roles
   *
   * @example
   * if (hasAnyRole(['TEACHER', 'ADMIN'])) {
   *   return <InstructorContent />;
   * }
   */
  const hasAnyRole = useCallback(
    (roles) => {
      if (!isAuthenticated || !user?.role) return false;
      if (!Array.isArray(roles)) {
        console.warn('[useAuth] hasAnyRole expects an array of roles');
        return false;
      }
      return roles.includes(user.role);
    },
    [isAuthenticated, user]
  );

  /**
   * Check if user has any of the specified permissions
   *
   * @param {string[]} permissions - Array of permissions to check
   * @returns {boolean} True if user has at least one of the specified permissions
   *
   * @example
   * if (hasAnyPermission(['edit_modules', 'delete_own_modules'])) {
   *   return <ModuleManagementTools />;
   * }
   */
  const hasAnyPermission = useCallback(
    (permissions) => {
      if (!isAuthenticated || !user?.role) return false;
      if (!Array.isArray(permissions)) {
        console.warn('[useAuth] hasAnyPermission expects an array of permissions');
        return false;
      }
      return permissions.some((permission) =>
        roleHasPermission(user.role, permission)
      );
    },
    [isAuthenticated, user]
  );

  /**
   * Check if user is teacher or admin (privileged roles)
   *
   * @returns {boolean} True if user is TEACHER or ADMIN
   */
  const isTeacherOrAdmin = useCallback(() => {
    return hasAnyRole([USER_ROLES.TEACHER, USER_ROLES.ADMIN]);
  }, [hasAnyRole]);

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
    // User data
    user,

    // Authentication state
    isAuthenticated,
    isLoading,
    error,

    // Role-based booleans
    isStudent,
    isTeacher,
    isAdmin,

    // Authentication functions
    login,
    register,
    logout,
    refreshUser,

    // Authorization helpers - Role-based
    isRole,
    hasAnyRole,
    isTeacherOrAdmin: isTeacherOrAdmin(),

    // Authorization helpers - Permission-based
    hasPermission,
    hasAnyPermission,

    // Constants
    USER_ROLES,
    PERMISSIONS,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default useAuth;

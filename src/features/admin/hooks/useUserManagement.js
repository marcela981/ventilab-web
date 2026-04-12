/**
 * =============================================================================
 * useUserManagement Hook for VentyLab Admin Panel
 * =============================================================================
 * Custom React hook that manages user administration functionality
 * for the admin dashboard.
 *
 * This hook provides:
 * - User list management with pagination
 * - Advanced filtering (by role, active status, registration date)
 * - Real-time search with debounce (300ms)
 * - CRUD operations for users
 * - Role management and status toggling
 * - Password reset functionality
 * - Individual loading states for each operation
 * - Robust error handling
 *
 * Usage Examples:
 * ---------------
 *
 * @example
 * // Basic user list management
 * const { users, loading, fetchUsers } = useUserManagement();
 *
 * useEffect(() => {
 *   fetchUsers();
 * }, [fetchUsers]);
 *
 * @example
 * // Filtered and paginated user list
 * const { users, setFilters, setPage, setPageSize } = useUserManagement();
 *
 * setFilters({ role: 'STUDENT', isActive: true });
 * setPageSize(25);
 * setPage(1);
 *
 * @example
 * // Search with debounce
 * const { setSearchQuery, users } = useUserManagement();
 *
 * <input onChange={(e) => setSearchQuery(e.target.value)} />
 *
 * @example
 * // Update user role
 * const { updateUserRole, isUpdatingRole } = useUserManagement();
 *
 * const handleRoleChange = async (userId, newRole) => {
 *   const success = await updateUserRole(userId, newRole);
 *   if (success) {
 *     toast.success('Role updated successfully');
 *   }
 * };
 *
 * @example
 * // Create new user
 * const { createUser, isCreating } = useUserManagement();
 *
 * const handleCreateUser = async (userData) => {
 *   const result = await createUser(userData);
 *   if (result.success) {
 *     router.push('/admin/users');
 *   }
 * };
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Base API URL
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Helper function to make authenticated API requests
 * Matches the pattern used in useDashboardData.js
 */
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('ventilab_auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Page size options for pagination
 */
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 300;

/**
 * Custom hook for user management in admin panel
 *
 * @returns {Object} User management state and functions
 * @property {Array} users - List of users
 * @property {number} totalUsers - Total count of users (for pagination)
 * @property {number} totalPages - Total number of pages
 * @property {boolean} loading - True if fetching users
 * @property {Object|null} error - Error object if operation fails
 * @property {number} page - Current page number
 * @property {number} pageSize - Number of users per page
 * @property {Object} filters - Current filters applied
 * @property {string} searchQuery - Current search query
 * @property {boolean} isUpdatingRole - True if updating user role
 * @property {boolean} isUpdatingStatus - True if updating user status
 * @property {boolean} isDeleting - True if deleting user
 * @property {boolean} isCreating - True if creating user
 * @property {boolean} isResettingPassword - True if resetting password
 * @property {Function} fetchUsers - Fetch users with current filters
 * @property {Function} setPage - Set current page
 * @property {Function} setPageSize - Set page size
 * @property {Function} setFilters - Set filters
 * @property {Function} setSearchQuery - Set search query (with debounce)
 * @property {Function} updateUserRole - Update user role
 * @property {Function} toggleUserStatus - Toggle user active status
 * @property {Function} deleteUser - Delete user
 * @property {Function} createUser - Create new user
 * @property {Function} resetUserPassword - Reset user password
 * @property {Function} refetch - Manually refresh user list
 */
export function useUserManagement() {
  // ============================================================================
  // State Management
  // ============================================================================

  // User data
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]); // Default: 10

  // Filters
  const [filters, setFilters] = useState({
    role: null, // 'STUDENT', 'TEACHER', 'ADMIN', or null for all
    isActive: null, // true, false, or null for all
    dateFrom: null, // ISO date string
    dateTo: null, // ISO date string
  });

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Error state
  const [error, setError] = useState(null);

  // Ref for debounce timeout
  const debounceTimeoutRef = useRef(null);

  // ============================================================================
  // Search Debounce Effect
  // ============================================================================

  /**
   * Debounce search query to avoid excessive API calls
   * Updates debouncedSearchQuery after 300ms of inactivity
   */
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // Reset to page 1 when search changes
      setPage(1);
    }, DEBOUNCE_DELAY);

    // Cleanup on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // ============================================================================
  // Fetch Users Function
  // ============================================================================

  /**
   * Fetch users from the backend with current filters and pagination
   *
   * @returns {Promise<boolean>} True if fetch successful
   *
   * @example
   * await fetchUsers();
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      // Pagination
      queryParams.append('page', page.toString());
      queryParams.append('limit', pageSize.toString());

      // Search
      if (debouncedSearchQuery.trim()) {
        queryParams.append('search', debouncedSearchQuery.trim());
      }

      // Filters
      if (filters.role) {
        queryParams.append('role', filters.role);
      }
      if (filters.isActive !== null) {
        queryParams.append('isActive', filters.isActive.toString());
      }
      if (filters.dateFrom) {
        queryParams.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        queryParams.append('dateTo', filters.dateTo);
      }

      // Make API request
      const data = await fetchWithAuth(
        `${API_BASE_URL}/admin/users?${queryParams.toString()}`
      );

      // Update state with response data
      setUsers(data.users || data.data || []);
      setTotalUsers(data.total || data.users?.length || 0);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / pageSize));

      return true;
    } catch (err) {
      console.error('[useUserManagement] Error fetching users:', err);
      setError({
        message: 'Failed to fetch users',
        details: [err.message],
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearchQuery, filters]);

  // ============================================================================
  // Auto-fetch on dependency changes
  // ============================================================================

  /**
   * Automatically fetch users when pagination, filters, or search changes
   */
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ============================================================================
  // User Management Functions
  // ============================================================================

  /**
   * Update user role
   *
   * @param {string} userId - User ID
   * @param {string} newRole - New role (STUDENT, TEACHER, ADMIN)
   * @returns {Promise<boolean>} True if update successful
   *
   * @example
   * const success = await updateUserRole('user123', 'TEACHER');
   * if (success) {
   *   showNotification('Role updated successfully');
   * }
   */
  const updateUserRole = useCallback(
    async (userId, newRole) => {
      setIsUpdatingRole(true);
      setError(null);

      try {
        await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({ role: newRole }),
        });

        // Refresh user list after successful update
        await fetchUsers();

        return true;
      } catch (err) {
        console.error('[updateUserRole] Error:', err);
        setError({
          message: 'Failed to update user role',
          details: [err.message],
        });
        return false;
      } finally {
        setIsUpdatingRole(false);
      }
    },
    [fetchUsers]
  );

  /**
   * Toggle user active/inactive status
   *
   * @param {string} userId - User ID
   * @param {boolean} isActive - New active status
   * @returns {Promise<boolean>} True if update successful
   *
   * @example
   * await toggleUserStatus('user123', false); // Deactivate user
   */
  const toggleUserStatus = useCallback(
    async (userId, isActive) => {
      setIsUpdatingStatus(true);
      setError(null);

      try {
        await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ isActive }),
        });

        // Refresh user list after successful update
        await fetchUsers();

        return true;
      } catch (err) {
        console.error('[toggleUserStatus] Error:', err);
        setError({
          message: 'Failed to update user status',
          details: [err.message],
        });
        return false;
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [fetchUsers]
  );

  /**
   * Delete user
   * Only allowed if user has no critical progress associated
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { success: boolean, error?: string }
   *
   * @example
   * const result = await deleteUser('user123');
   * if (result.success) {
   *   showNotification('User deleted successfully');
   * } else {
   *   showError(result.error);
   * }
   */
  const deleteUser = useCallback(
    async (userId) => {
      setIsDeleting(true);
      setError(null);

      try {
        await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}`, {
          method: 'DELETE',
        });

        // Refresh user list after successful deletion
        await fetchUsers();

        return { success: true };
      } catch (err) {
        console.error('[deleteUser] Error:', err);
        const errorMessage = err.message || 'Failed to delete user';
        setError({
          message: errorMessage,
          details: [err.message],
        });
        return { success: false, error: errorMessage };
      } finally {
        setIsDeleting(false);
      }
    },
    [fetchUsers]
  );

  /**
   * Create new user
   *
   * @param {Object} userData - User data
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - User's email
   * @param {string} userData.password - User's password
   * @param {string} userData.role - User's role (STUDENT, TEACHER, ADMIN)
   * @returns {Promise<Object>} { success: boolean, data?: Object, error?: string }
   *
   * @example
   * const result = await createUser({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   password: 'secure123',
   *   role: 'STUDENT'
   * });
   * if (result.success) {
   *   showNotification('User created successfully');
   * }
   */
  const createUser = useCallback(
    async (userData) => {
      setIsCreating(true);
      setError(null);

      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/admin/users`, {
          method: 'POST',
          body: JSON.stringify(userData),
        });

        // Refresh user list after successful creation
        await fetchUsers();

        return { success: true, data: response.user || response.data };
      } catch (err) {
        console.error('[createUser] Error:', err);
        const errorMessage = err.message || 'Failed to create user';
        setError({
          message: errorMessage,
          details: [err.message],
        });
        return { success: false, error: errorMessage };
      } finally {
        setIsCreating(false);
      }
    },
    [fetchUsers]
  );

  /**
   * Reset user password
   * Sends password reset email or generates new temporary password
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { success: boolean, data?: Object, error?: string }
   *
   * @example
   * const result = await resetUserPassword('user123');
   * if (result.success) {
   *   showNotification(`Password reset email sent to ${result.data.email}`);
   * }
   */
  const resetUserPassword = useCallback(async (userId) => {
    setIsResettingPassword(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/admin/users/${userId}/reset-password`,
        {
          method: 'POST',
        }
      );

      return { success: true, data: response };
    } catch (err) {
      console.error('[resetUserPassword] Error:', err);
      const errorMessage = err.message || 'Failed to reset password';
      setError({
        message: errorMessage,
        details: [err.message],
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsResettingPassword(false);
    }
  }, []);

  // ============================================================================
  // Pagination Helpers
  // ============================================================================

  /**
   * Change page size and reset to first page
   *
   * @param {number} newPageSize - New page size
   */
  const changePageSize = useCallback((newPageSize) => {
    if (PAGE_SIZE_OPTIONS.includes(newPageSize)) {
      setPageSize(newPageSize);
      setPage(1); // Reset to first page
    }
  }, []);

  /**
   * Go to next page
   */
  const nextPage = useCallback(() => {
    setPage((prevPage) => Math.min(prevPage + 1, totalPages));
  }, [totalPages]);

  /**
   * Go to previous page
   */
  const prevPage = useCallback(() => {
    setPage((prevPage) => Math.max(prevPage - 1, 1));
  }, []);

  /**
   * Go to specific page
   *
   * @param {number} pageNumber - Page number to go to
   */
  const goToPage = useCallback(
    (pageNumber) => {
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        setPage(pageNumber);
      }
    },
    [totalPages]
  );

  // ============================================================================
  // Filter Helpers
  // ============================================================================

  /**
   * Update filters and reset to first page
   *
   * @param {Object} newFilters - New filter values
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
    setPage(1); // Reset to first page when filters change
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({
      role: null,
      isActive: null,
      dateFrom: null,
      dateTo: null,
    });
    setSearchQuery('');
    setPage(1);
  }, []);

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
    // User data
    users,
    totalUsers,
    totalPages,

    // Pagination state
    page,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,

    // Filter and search state
    filters,
    searchQuery,

    // Loading states
    loading,
    isUpdatingRole,
    isUpdatingStatus,
    isDeleting,
    isCreating,
    isResettingPassword,

    // Error state
    error,

    // Data fetching
    fetchUsers,
    refetch: fetchUsers, // Alias for convenience

    // Pagination functions
    setPage,
    setPageSize: changePageSize,
    nextPage,
    prevPage,
    goToPage,

    // Filter functions
    setFilters: updateFilters,
    clearFilters,
    setSearchQuery,

    // User management functions
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    createUser,
    resetUserPassword,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default useUserManagement;

/**
 * Authentication Service
 * Handles all authentication-related operations for the VentyLab application
 * Communicates with the backend API for login, registration, and user management
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get the API base URL from environment variables
 * Falls back to localhost if not defined
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Local storage key for storing authentication token
 */
const TOKEN_KEY = 'ventilab_auth_token';

/**
 * Local storage key for storing user data
 */
const USER_KEY = 'ventilab_user_data';

// ============================================================================
// Token Management Functions
// ============================================================================

/**
 * Save authentication token to localStorage
 * @param {string} token - JWT token to store
 * @returns {void}
 */
export const setAuthToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

/**
 * Retrieve authentication token from localStorage
 * @returns {string|null} The stored token or null if not found
 */
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

/**
 * Remove authentication token from localStorage
 * @returns {void}
 */
export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

/**
 * Save user data to localStorage
 * @param {Object} user - User data to store
 * @returns {void}
 */
const setUserData = (user) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

/**
 * Retrieve user data from localStorage
 * @returns {Object|null} The stored user data or null if not found
 */
export const getUserData = () => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }
  return null;
};

// ============================================================================
// HTTP Request Helper
// ============================================================================

/**
 * Make an HTTP request with proper error handling
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Object>} Response object with success, data, and error properties
 */
const makeRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_URL}${endpoint}`;
    const token = getAuthToken();

    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse response body
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle successful responses
    if (response.ok) {
      return {
        success: true,
        data,
        error: null,
      };
    }

    // Handle error responses
    const errorMessage = data?.message || data?.error || 'An error occurred';
    const errorDetails = data?.details || [];

    return {
      success: false,
      data: null,
      error: {
        message: errorMessage,
        details: errorDetails,
        statusCode: response.status,
      },
    };
  } catch (error) {
    // Handle network errors or other exceptions
    return {
      success: false,
      data: null,
      error: {
        message: error.message || 'Network error occurred',
        details: ['Please check your internet connection and try again'],
        statusCode: null,
      },
    };
  }
};

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Login user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Response object containing user data and token
 * @throws {Error} If credentials are invalid or network error occurs
 *
 * @example
 * const result = await login('user@example.com', 'password123');
 * if (result.success) {
 *   console.log('Logged in as:', result.data.user.name);
 *   console.log('Token:', result.data.token);
 * } else {
 *   console.error('Login failed:', result.error.message);
 * }
 */
export const login = async (email, password) => {
  const response = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  // If login successful, store token and user data
  if (response.success && response.data) {
    const { token, user } = response.data;
    if (token) {
      setAuthToken(token);
    }
    if (user) {
      setUserData(user);
    }
  }

  return response;
};

/**
 * Register a new user account
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Response object containing user data and token
 * @throws {Error} If registration fails or validation errors occur
 *
 * @example
 * const result = await register('John Doe', 'john@example.com', 'securepass123');
 * if (result.success) {
 *   console.log('Account created:', result.data.user);
 * } else {
 *   console.error('Registration failed:', result.error.message);
 *   console.error('Details:', result.error.details);
 * }
 */
export const register = async (name, email, password) => {
  const response = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  // If registration successful, store token and user data
  if (response.success && response.data) {
    const { token, user } = response.data;
    if (token) {
      setAuthToken(token);
    }
    if (user) {
      setUserData(user);
    }
  }

  return response;
};

/**
 * Logout the current user
 * Clears authentication token and user data from localStorage
 * @returns {Promise<Object>} Response object indicating logout success
 *
 * @example
 * const result = await logout();
 * if (result.success) {
 *   console.log('Logged out successfully');
 * }
 */
/**
 * Logout the current user
 * Clears authentication token and user data from localStorage
 * Optionally invalidates token on server (if backend endpoint exists)
 * 
 * @param {boolean} notifyServer - Whether to notify server of logout (default: false)
 * @returns {Promise<Object>} Response object indicating logout success
 * 
 * @example
 * // Simple logout (instant, no server notification)
 * await logout();
 * 
 * @example
 * // Logout with server notification
 * await logout(true);
 */
export const logout = async (notifyServer = false) => {
  try {
    // Clear local storage FIRST (instant logout on frontend)
    // This ensures immediate logout even if server request fails
    removeAuthToken();

    // Optional: Notify server to invalidate token on their side
    // This is fire-and-forget - we don't wait for response
    if (notifyServer) {
      try {
        // Note: Uncomment when backend endpoint is ready
        // makeRequest('/auth/logout', { method: 'POST' }).catch(() => {
        //   // Silently fail - user is already logged out locally
        // });
      } catch {
        // Silently ignore server errors - local logout already succeeded
      }
    }

    return {
      success: true,
      data: { message: 'Logged out successfully' },
      error: null,
    };
  } catch (error) {
    // Even on error, ensure cleanup happened
    removeAuthToken();

    return {
      success: false,
      data: null,
      error: {
        message: 'Error during logout',
        details: [error.message],
        statusCode: null,
      },
    };
  }
};

/**
 * Get current authenticated user's data
 * Makes a request to the server to fetch fresh user data
 * @returns {Promise<Object>} Response object containing current user data
 * @throws {Error} If user is not authenticated or token is invalid
 *
 * @example
 * const result = await getCurrentUser();
 * if (result.success) {
 *   console.log('Current user:', result.data.user);
 *   console.log('Role:', result.data.user.role);
 * } else {
 *   console.error('Not authenticated:', result.error.message);
 * }
 */
export const getCurrentUser = async () => {
  const token = getAuthToken();

  if (!token) {
    return {
      success: false,
      data: null,
      error: {
        message: 'No authentication token found',
        details: ['Please log in to continue'],
        statusCode: 401,
      },
    };
  }

  const response = await makeRequest('/auth/me', {
    method: 'GET',
  });

  // Update stored user data if request successful
  if (response.success && response.data?.user) {
    setUserData(response.data.user);
  }

  return response;
};

/**
 * Refresh authentication token
 * Requests a new token from the server using the current token
 * @returns {Promise<Object>} Response object containing new token
 * @throws {Error} If token refresh fails or current token is invalid
 *
 * @example
 * const result = await refreshToken();
 * if (result.success) {
 *   console.log('Token refreshed successfully');
 * } else {
 *   console.error('Token refresh failed:', result.error.message);
 *   // Redirect to login page
 * }
 */
export const refreshToken = async () => {
  const token = getAuthToken();

  if (!token) {
    return {
      success: false,
      data: null,
      error: {
        message: 'No authentication token found',
        details: ['Cannot refresh token without an existing token'],
        statusCode: 401,
      },
    };
  }

  const response = await makeRequest('/auth/refresh', {
    method: 'POST',
  });

  // If refresh successful, update stored token
  if (response.success && response.data?.token) {
    setAuthToken(response.data.token);
  } else {
    // If refresh failed, clear invalid token
    removeAuthToken();
  }

  return response;
};

/**
 * Check if user is currently authenticated
 * This only checks for presence of token, not validity
 * For validation, use getCurrentUser() instead
 * @returns {boolean} True if user has a stored token
 *
 * @example
 * if (isAuthenticated()) {
 *   console.log('User has a token');
 * } else {
 *   console.log('User is not logged in');
 * }
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};

/**
 * Request password reset email
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Response object indicating if reset email was sent
 *
 * @example
 * const result = await requestPasswordReset('user@example.com');
 * if (result.success) {
 *   console.log('Password reset email sent');
 * }
 */
export const requestPasswordReset = async (email) => {
  return await makeRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

/**
 * Reset password using reset token
 * @param {string} token - Password reset token from email
 * @param {string} newPassword - New password to set
 * @returns {Promise<Object>} Response object indicating if password was reset
 *
 * @example
 * const result = await resetPassword(resetToken, 'newSecurePassword123');
 * if (result.success) {
 *   console.log('Password reset successfully');
 * }
 */
export const resetPassword = async (token, newPassword) => {
  return await makeRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
};

/**
 * Get current user's profile
 * @returns {Promise<Object>} Response object containing user profile data
 *
 * @example
 * const result = await getProfile();
 * if (result.success) {
 *   console.log('Profile:', result.data.user);
 * }
 */
export const getProfile = async () => {
  const response = await makeRequest('/users/profile', {
    method: 'GET',
  });

  // Update stored user data if request successful
  if (response.success && response.data?.user) {
    setUserData(response.data.user);
  }

  return response;
};

/**
 * Update current user's profile
 * @param {Object} updates - Object containing fields to update (name, bio)
 * @returns {Promise<Object>} Response object containing updated user data
 *
 * @example
 * const result = await updateProfile({ name: 'New Name', bio: 'Medical student' });
 * if (result.success) {
 *   console.log('Profile updated:', result.data.user);
 * }
 */
export const updateProfile = async (updates) => {
  const response = await makeRequest('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  // Update stored user data if request successful
  if (response.success && response.data?.user) {
    setUserData(response.data.user);
  }

  return response;
};

/**
 * Upload user avatar
 * @param {string} avatarData - Base64 encoded image data or URL
 * @returns {Promise<Object>} Response object containing updated user data
 *
 * @example
 * const result = await uploadAvatar('data:image/png;base64,...');
 * if (result.success) {
 *   console.log('Avatar updated:', result.data.user);
 * }
 */
export const uploadAvatar = async (avatarData) => {
  const response = await makeRequest('/users/profile/avatar', {
    method: 'POST',
    body: JSON.stringify({ avatarUrl: avatarData }),
  });

  // Update stored user data if request successful
  if (response.success && response.data?.user) {
    setUserData(response.data.user);
  }

  return response;
};

/**
 * Change user's password
 * @param {string} currentPassword - Current password for verification
 * @param {string} newPassword - New password to set
 * @param {string} confirmPassword - Confirmation of new password
 * @returns {Promise<Object>} Response object indicating if password was changed
 *
 * @example
 * const result = await changePassword('oldPass123', 'newPass456', 'newPass456');
 * if (result.success) {
 *   console.log('Password changed successfully');
 * }
 */
export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  return await makeRequest('/users/profile/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
};

/**
 * Get user's profile statistics and learning progress
 * @returns {Promise<Object>} Response object with user statistics
 *
 * @example
 * const result = await getProfileStats();
 * if (result.success) {
 *   console.log('Stats:', result.data);
 *   // {
 *   //   lessonsCompleted: 12,
 *   //   totalLessons: 30,
 *   //   modulesCompleted: 3,
 *   //   totalModules: 8,
 *   //   totalTime: "3 horas 45 minutos",
 *   //   streakDays: 5,
 *   //   lastActivity: "Hace 2 días",
 *   //   progressPercent: 40,
 *   //   recentLessons: [...]
 *   // }
 * }
 */
export const getProfileStats = async () => {
  return await makeRequest('/users/profile/stats', {
    method: 'GET',
  });
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Token management
  setAuthToken,
  getAuthToken,
  removeAuthToken,
  getUserData,
  isAuthenticated,

  // Authentication
  login,
  register,
  logout,
  getCurrentUser,
  refreshToken,

  // Password management
  requestPasswordReset,
  resetPassword,
  changePassword,

  // Profile management
  getProfile,
  updateProfile,
  uploadAvatar,
  getProfileStats,
};

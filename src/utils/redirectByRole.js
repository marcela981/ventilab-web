/**
 * =============================================================================
 * Role-Based Redirect Utility for VentyLab
 * =============================================================================
 * This utility provides functions to redirect users to appropriate dashboard
 * routes based on their role after successful authentication.
 * =============================================================================
 */

/**
 * User role constants matching backend USER_ROLES
 */
export const USER_ROLES = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
};

/**
 * Role-to-dashboard route mapping
 * Currently all roles use the main dashboard
 * TODO: Create role-specific dashboard views if needed
 */
const ROLE_DASHBOARD_MAP = {
  [USER_ROLES.STUDENT]: '/dashboard',
  [USER_ROLES.TEACHER]: '/dashboard',
  [USER_ROLES.ADMIN]: '/dashboard',
};

/**
 * Default dashboard route for unknown/unassigned roles
 */
const DEFAULT_DASHBOARD = '/dashboard';

/**
 * Get the appropriate redirect path based on user role
 *
 * @param {string} role - The user's role (STUDENT, TEACHER, or ADMIN)
 * @returns {string} The dashboard path to redirect to
 *
 * @example
 * // Student user
 * getRedirectPath('STUDENT') // Returns: '/dashboard/learning'
 *
 * @example
 * // Teacher user
 * getRedirectPath('TEACHER') // Returns: '/dashboard/teaching'
 *
 * @example
 * // Admin user
 * getRedirectPath('ADMIN') // Returns: '/dashboard/admin'
 *
 * @example
 * // Unknown role
 * getRedirectPath('UNKNOWN') // Returns: '/dashboard'
 */
export function getRedirectPath(role) {
  // Validate role parameter
  if (!role || typeof role !== 'string') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[redirectByRole] Invalid role provided:', role);
    }
    return DEFAULT_DASHBOARD;
  }

  // Normalize role to uppercase for case-insensitive matching
  const normalizedRole = role.trim().toUpperCase();

  // Get dashboard path for the role, or use default if not found
  const redirectPath = ROLE_DASHBOARD_MAP[normalizedRole] || DEFAULT_DASHBOARD;

  return redirectPath;
}

/**
 * Get redirect path with optional fallback to attempted URL
 * This function prioritizes returning users to protected routes they tried to access
 * before being redirected to login
 *
 * @param {string} role - The user's role (STUDENT, TEACHER, or ADMIN)
 * @param {string|null} attemptedUrl - The URL the user tried to access before login
 * @returns {string} The path to redirect to
 *
 * @example
 * // User tried to access a specific lesson before login
 * getRedirectPathWithFallback('STUDENT', '/lessons/lesson-123')
 * // Returns: '/lessons/lesson-123'
 *
 * @example
 * // User went directly to login without attempting protected route
 * getRedirectPathWithFallback('TEACHER', null)
 * // Returns: '/dashboard/teaching'
 *
 * @example
 * // User tried to access a route that doesn't exist or is external
 * getRedirectPathWithFallback('STUDENT', 'https://evil.com/phishing')
 * // Returns: '/dashboard/learning' (ignores external URL for security)
 */
export function getRedirectPathWithFallback(role, attemptedUrl) {
  // Security check: Only allow internal relative URLs
  if (attemptedUrl && typeof attemptedUrl === 'string') {
    const trimmedUrl = attemptedUrl.trim();

    // Check if it's a relative path (starts with /)
    if (trimmedUrl.startsWith('/')) {
      // Exclude auth-related pages (don't redirect back to login/register)
      const authPages = ['/auth/login', '/auth/register', '/auth/logout', '/auth/error'];
      const isAuthPage = authPages.some(page => trimmedUrl.startsWith(page));

      if (!isAuthPage) {
        // Safe to use attempted URL
        return trimmedUrl;
      }
    }
  }

  // Fall back to role-based dashboard
  return getRedirectPath(role);
}

/**
 * Check if a URL is safe to redirect to
 * Prevents open redirect vulnerabilities
 *
 * @param {string} url - The URL to validate
 * @param {string} baseUrl - The base URL of the application
 * @returns {boolean} True if URL is safe to redirect to
 */
export function isSafeRedirectUrl(url, baseUrl) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    // Relative URLs are safe
    if (url.startsWith('/')) {
      return true;
    }

    // Parse URLs to compare origins
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);

    // Only allow same-origin URLs
    return urlObj.origin === baseUrlObj.origin;
  } catch (error) {
    // Invalid URL format
    if (process.env.NODE_ENV === 'development') {
      console.warn('[redirectByRole] Invalid URL format:', url);
    }
    return false;
  }
}

/**
 * Parse redirect URL from query parameters
 * Commonly used to extract the returnUrl or redirect parameter from URL
 *
 * @param {Object} query - Next.js router query object or URLSearchParams
 * @returns {string|null} The redirect URL if present and valid, null otherwise
 *
 * @example
 * // From Next.js router query
 * const router = useRouter();
 * const redirectUrl = getRedirectFromQuery(router.query);
 *
 * @example
 * // From URLSearchParams
 * const params = new URLSearchParams(window.location.search);
 * const redirectUrl = getRedirectFromQuery(params);
 */
export function getRedirectFromQuery(query) {
  if (!query) return null;

  // Check common parameter names for redirect URLs
  const redirectParam = query.redirect || query.returnUrl || query.callbackUrl || query.from;

  // Ensure it's a string
  if (redirectParam && typeof redirectParam === 'string') {
    return redirectParam.trim();
  }

  return null;
}

/**
 * Build complete redirect URL with proper validation
 * Main entry point for redirect logic combining all utilities
 *
 * @param {Object} options - Configuration options
 * @param {string} options.role - User's role
 * @param {Object} options.query - Query parameters (from router or URLSearchParams)
 * @param {string} options.baseUrl - Base URL for security validation
 * @returns {string} Safe redirect URL
 *
 * @example
 * // In NextAuth redirect callback
 * const redirectUrl = buildRedirectUrl({
 *   role: session.user.role,
 *   query: { redirect: '/lessons/lesson-1' },
 *   baseUrl: 'https://ventilab.com'
 * });
 */
export function buildRedirectUrl({ role, query = {}, baseUrl = '' }) {
  // Try to get attempted URL from query parameters
  const attemptedUrl = getRedirectFromQuery(query);

  // Use getRedirectPathWithFallback which includes all validation logic
  // including auth page blocking, external URL blocking, etc.
  return getRedirectPathWithFallback(role, attemptedUrl);
}

/**
 * Default export for convenience
 */
export default {
  getRedirectPath,
  getRedirectPathWithFallback,
  isSafeRedirectUrl,
  getRedirectFromQuery,
  buildRedirectUrl,
  USER_ROLES,
};

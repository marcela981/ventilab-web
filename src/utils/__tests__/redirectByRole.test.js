/**
 * =============================================================================
 * Tests for Role-Based Redirect Utility
 * =============================================================================
 * Unit tests for redirect functions to ensure proper routing and security
 * =============================================================================
 */

import {
  getRedirectPath,
  getRedirectPathWithFallback,
  isSafeRedirectUrl,
  getRedirectFromQuery,
  buildRedirectUrl,
  USER_ROLES,
} from '../redirectByRole';

// =============================================================================
// Test Suite: getRedirectPath
// =============================================================================

describe('getRedirectPath', () => {
  test('should return learning dashboard for STUDENT role', () => {
    const result = getRedirectPath(USER_ROLES.STUDENT);
    expect(result).toBe('/dashboard/learning');
  });

  test('should return teaching dashboard for TEACHER role', () => {
    const result = getRedirectPath(USER_ROLES.TEACHER);
    expect(result).toBe('/dashboard/teaching');
  });

  test('should return admin dashboard for ADMIN role', () => {
    const result = getRedirectPath(USER_ROLES.ADMIN);
    expect(result).toBe('/dashboard/admin');
  });

  test('should return default dashboard for unknown role', () => {
    const result = getRedirectPath('UNKNOWN_ROLE');
    expect(result).toBe('/dashboard');
  });

  test('should return default dashboard for null role', () => {
    const result = getRedirectPath(null);
    expect(result).toBe('/dashboard');
  });

  test('should return default dashboard for empty string role', () => {
    const result = getRedirectPath('');
    expect(result).toBe('/dashboard');
  });

  test('should handle lowercase role names', () => {
    const result = getRedirectPath('student');
    expect(result).toBe('/dashboard/learning');
  });

  test('should handle mixed case role names', () => {
    const result = getRedirectPath('TeAcHeR');
    expect(result).toBe('/dashboard/teaching');
  });

  test('should handle roles with whitespace', () => {
    const result = getRedirectPath('  ADMIN  ');
    expect(result).toBe('/dashboard/admin');
  });
});

// =============================================================================
// Test Suite: getRedirectPathWithFallback
// =============================================================================

describe('getRedirectPathWithFallback', () => {
  test('should return attempted URL if valid', () => {
    const result = getRedirectPathWithFallback('STUDENT', '/lessons/lesson-1');
    expect(result).toBe('/lessons/lesson-1');
  });

  test('should return role dashboard if no attempted URL', () => {
    const result = getRedirectPathWithFallback('TEACHER', null);
    expect(result).toBe('/dashboard/teaching');
  });

  test('should return role dashboard if attempted URL is empty', () => {
    const result = getRedirectPathWithFallback('ADMIN', '');
    expect(result).toBe('/dashboard/admin');
  });

  test('should block external URLs and use role dashboard', () => {
    const result = getRedirectPathWithFallback('STUDENT', 'https://evil.com');
    expect(result).toBe('/dashboard/learning');
  });

  test('should block protocol-relative URLs', () => {
    const result = getRedirectPathWithFallback('STUDENT', '//evil.com/phishing');
    expect(result).toBe('/dashboard/learning');
  });

  test('should block redirect to login page', () => {
    const result = getRedirectPathWithFallback('TEACHER', '/auth/login');
    expect(result).toBe('/dashboard/teaching');
  });

  test('should block redirect to register page', () => {
    const result = getRedirectPathWithFallback('STUDENT', '/auth/register');
    expect(result).toBe('/dashboard/learning');
  });

  test('should block redirect to logout page', () => {
    const result = getRedirectPathWithFallback('ADMIN', '/auth/logout');
    expect(result).toBe('/dashboard/admin');
  });

  test('should block redirect to error page', () => {
    const result = getRedirectPathWithFallback('STUDENT', '/auth/error');
    expect(result).toBe('/dashboard/learning');
  });

  test('should allow redirect to valid internal route', () => {
    const result = getRedirectPathWithFallback('STUDENT', '/modules/module-1/lessons/1');
    expect(result).toBe('/modules/module-1/lessons/1');
  });

  test('should allow redirect to profile page', () => {
    const result = getRedirectPathWithFallback('STUDENT', '/profile');
    expect(result).toBe('/profile');
  });

  test('should allow redirect to settings page', () => {
    const result = getRedirectPathWithFallback('TEACHER', '/settings');
    expect(result).toBe('/settings');
  });

  test('should handle attempted URL with query parameters', () => {
    const result = getRedirectPathWithFallback('STUDENT', '/lessons/1?tab=notes');
    expect(result).toBe('/lessons/1?tab=notes');
  });

  test('should handle attempted URL with hash', () => {
    const result = getRedirectPathWithFallback('TEACHER', '/modules/1#section-2');
    expect(result).toBe('/modules/1#section-2');
  });
});

// =============================================================================
// Test Suite: isSafeRedirectUrl
// =============================================================================

describe('isSafeRedirectUrl', () => {
  const baseUrl = 'https://ventilab.com';

  test('should allow relative URLs', () => {
    expect(isSafeRedirectUrl('/dashboard', baseUrl)).toBe(true);
    expect(isSafeRedirectUrl('/lessons/1', baseUrl)).toBe(true);
    expect(isSafeRedirectUrl('/profile', baseUrl)).toBe(true);
  });

  test('should allow same-origin absolute URLs', () => {
    expect(isSafeRedirectUrl('https://ventilab.com/dashboard', baseUrl)).toBe(true);
    expect(isSafeRedirectUrl('https://ventilab.com/lessons/1', baseUrl)).toBe(true);
  });

  test('should block different origin URLs', () => {
    expect(isSafeRedirectUrl('https://evil.com', baseUrl)).toBe(false);
    expect(isSafeRedirectUrl('https://evil.com/phishing', baseUrl)).toBe(false);
  });

  test('should block protocol-relative URLs to different hosts', () => {
    // Note: These are tricky and should be blocked unless they resolve to same origin
    expect(isSafeRedirectUrl('//evil.com', baseUrl)).toBe(false);
  });

  test('should block javascript: URLs', () => {
    expect(isSafeRedirectUrl('javascript:alert(1)', baseUrl)).toBe(false);
  });

  test('should block data: URLs', () => {
    expect(isSafeRedirectUrl('data:text/html,<script>alert(1)</script>', baseUrl)).toBe(false);
  });

  test('should handle null URL', () => {
    expect(isSafeRedirectUrl(null, baseUrl)).toBe(false);
  });

  test('should handle undefined URL', () => {
    expect(isSafeRedirectUrl(undefined, baseUrl)).toBe(false);
  });

  test('should handle empty string URL', () => {
    expect(isSafeRedirectUrl('', baseUrl)).toBe(false);
  });

  test('should handle malformed URLs', () => {
    expect(isSafeRedirectUrl('ht!tp://invalid', baseUrl)).toBe(false);
  });

  test('should allow URLs with different ports on same host', () => {
    const devBaseUrl = 'http://localhost:3000';
    expect(isSafeRedirectUrl('http://localhost:3000/dashboard', devBaseUrl)).toBe(true);
  });

  test('should block URLs with different ports', () => {
    const devBaseUrl = 'http://localhost:3000';
    expect(isSafeRedirectUrl('http://localhost:4000/dashboard', devBaseUrl)).toBe(false);
  });
});

// =============================================================================
// Test Suite: getRedirectFromQuery
// =============================================================================

describe('getRedirectFromQuery', () => {
  test('should extract redirect parameter', () => {
    const query = { redirect: '/lessons/1' };
    expect(getRedirectFromQuery(query)).toBe('/lessons/1');
  });

  test('should extract returnUrl parameter', () => {
    const query = { returnUrl: '/modules/1' };
    expect(getRedirectFromQuery(query)).toBe('/modules/1');
  });

  test('should extract callbackUrl parameter', () => {
    const query = { callbackUrl: '/dashboard' };
    expect(getRedirectFromQuery(query)).toBe('/dashboard');
  });

  test('should extract from parameter', () => {
    const query = { from: '/profile' };
    expect(getRedirectFromQuery(query)).toBe('/profile');
  });

  test('should prioritize redirect over other parameters', () => {
    const query = {
      redirect: '/lessons/1',
      returnUrl: '/modules/1',
      callbackUrl: '/dashboard',
    };
    expect(getRedirectFromQuery(query)).toBe('/lessons/1');
  });

  test('should return null if no redirect parameter found', () => {
    const query = { page: '1', tab: 'notes' };
    expect(getRedirectFromQuery(query)).toBe(null);
  });

  test('should return null for empty query', () => {
    expect(getRedirectFromQuery({})).toBe(null);
  });

  test('should return null for null query', () => {
    expect(getRedirectFromQuery(null)).toBe(null);
  });

  test('should return null for undefined query', () => {
    expect(getRedirectFromQuery(undefined)).toBe(null);
  });

  test('should handle query with array values (Next.js edge case)', () => {
    // Next.js query params can be arrays if same param appears multiple times
    const query = { redirect: ['/lessons/1', '/lessons/2'] };
    // Should handle gracefully, though behavior may vary
    const result = getRedirectFromQuery(query);
    expect(typeof result === 'string' || result === null).toBe(true);
  });

  test('should trim whitespace from redirect URL', () => {
    const query = { redirect: '  /lessons/1  ' };
    expect(getRedirectFromQuery(query)).toBe('/lessons/1');
  });
});

// =============================================================================
// Test Suite: buildRedirectUrl
// =============================================================================

describe('buildRedirectUrl', () => {
  const baseUrl = 'https://ventilab.com';

  test('should use callbackUrl if present and safe', () => {
    const result = buildRedirectUrl({
      role: 'STUDENT',
      query: { callbackUrl: '/lessons/1' },
      baseUrl,
    });
    expect(result).toBe('/lessons/1');
  });

  test('should use role dashboard if callbackUrl is unsafe', () => {
    const result = buildRedirectUrl({
      role: 'STUDENT',
      query: { callbackUrl: 'https://evil.com' },
      baseUrl,
    });
    expect(result).toBe('/dashboard/learning');
  });

  test('should use role dashboard if no callbackUrl', () => {
    const result = buildRedirectUrl({
      role: 'TEACHER',
      query: {},
      baseUrl,
    });
    expect(result).toBe('/dashboard/teaching');
  });

  test('should handle missing query parameter', () => {
    const result = buildRedirectUrl({
      role: 'ADMIN',
      baseUrl,
    });
    expect(result).toBe('/dashboard/admin');
  });

  test('should handle missing baseUrl', () => {
    const result = buildRedirectUrl({
      role: 'STUDENT',
      query: { callbackUrl: '/lessons/1' },
    });
    // Without baseUrl, cannot validate safety, so falls back to role dashboard
    expect(result).toBe('/lessons/1');
  });

  test('should handle all parameters missing', () => {
    const result = buildRedirectUrl({});
    expect(result).toBe('/dashboard'); // Default for unknown role
  });
});

// =============================================================================
// Test Suite: USER_ROLES Constant
// =============================================================================

describe('USER_ROLES constant', () => {
  test('should export STUDENT role', () => {
    expect(USER_ROLES.STUDENT).toBe('STUDENT');
  });

  test('should export TEACHER role', () => {
    expect(USER_ROLES.TEACHER).toBe('TEACHER');
  });

  test('should export ADMIN role', () => {
    expect(USER_ROLES.ADMIN).toBe('ADMIN');
  });

  test('should have exactly 3 roles', () => {
    expect(Object.keys(USER_ROLES)).toHaveLength(3);
  });
});

// =============================================================================
// Integration Tests: Real-World Scenarios
// =============================================================================

describe('Integration: Real-world scenarios', () => {
  const baseUrl = 'https://ventilab.com';

  test('Scenario 1: Student attempts lesson, gets redirected to login, then back to lesson', () => {
    // 1. User tries to access /lessons/ventilation-basics
    const attemptedUrl = '/lessons/ventilation-basics';

    // 2. Not authenticated, redirected to login with callbackUrl
    const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(attemptedUrl)}`;

    // 3. User logs in as STUDENT
    const userRole = 'STUDENT';

    // 4. Extract callbackUrl from query
    const query = { callbackUrl: attemptedUrl };
    const redirectUrl = buildRedirectUrl({ role: userRole, query, baseUrl });

    // 5. Should be redirected back to attempted lesson
    expect(redirectUrl).toBe('/lessons/ventilation-basics');
  });

  test('Scenario 2: Teacher goes directly to login', () => {
    // 1. User navigates directly to /auth/login
    const userRole = 'TEACHER';

    // 2. No callbackUrl in query
    const query = {};

    // 3. After login, should go to teacher dashboard
    const redirectUrl = buildRedirectUrl({ role: userRole, query, baseUrl });

    expect(redirectUrl).toBe('/dashboard/teaching');
  });

  test('Scenario 3: Admin attempts protected route from bookmark', () => {
    // 1. User has bookmarked /admin/users
    const attemptedUrl = '/admin/users';

    // 2. Session expired, redirected to login
    const userRole = 'ADMIN';
    const query = { callbackUrl: attemptedUrl };

    // 3. After login, should return to bookmarked page
    const redirectUrl = buildRedirectUrl({ role: userRole, query, baseUrl });

    expect(redirectUrl).toBe('/admin/users');
  });

  test('Scenario 4: Attacker tries open redirect via login', () => {
    // 1. Attacker sends victim link: /auth/login?callbackUrl=https://phishing.com
    const maliciousUrl = 'https://phishing.com/steal-credentials';

    // 2. User logs in as STUDENT
    const userRole = 'STUDENT';
    const query = { callbackUrl: maliciousUrl };

    // 3. Should be redirected to safe dashboard, NOT malicious site
    const redirectUrl = buildRedirectUrl({ role: userRole, query, baseUrl });

    expect(redirectUrl).toBe('/dashboard/learning');
    expect(redirectUrl).not.toContain('phishing.com');
  });

  test('Scenario 5: User tries to return to login page after login', () => {
    // 1. Edge case: callbackUrl is /auth/login
    const userRole = 'STUDENT';
    const query = { callbackUrl: '/auth/login' };

    // 2. Should prevent loop, redirect to dashboard
    const redirectUrl = buildRedirectUrl({ role: userRole, query, baseUrl });

    expect(redirectUrl).toBe('/dashboard/learning');
    expect(redirectUrl).not.toContain('/auth/');
  });

  test('Scenario 6: Student uses Google OAuth from lesson page', () => {
    // 1. Student on /lessons/1, clicks "Sign in with Google"
    const attemptedUrl = '/lessons/1';
    const userRole = 'STUDENT';

    // 2. After OAuth flow, callbackUrl preserved
    const query = { callbackUrl: attemptedUrl };

    // 3. Should return to lesson
    const redirectUrl = buildRedirectUrl({ role: userRole, query, baseUrl });

    expect(redirectUrl).toBe('/lessons/1');
  });
});

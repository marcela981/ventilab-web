/**
 * =============================================================================
 * Manual Test Script for Redirect Utility
 * =============================================================================
 * Run this script to manually verify redirect logic works correctly
 * Usage: node scripts/test-redirect.js
 * =============================================================================
 */

// Import the redirect utility functions
// Note: Using require since this is a Node.js script
const {
  getRedirectPath,
  getRedirectPathWithFallback,
  isSafeRedirectUrl,
  getRedirectFromQuery,
  buildRedirectUrl,
  USER_ROLES,
} = require('../src/utils/redirectByRole.js');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper to print colored output
const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}`),
  test: (name, expected, actual) => {
    const passed = expected === actual;
    if (passed) {
      log.success(`${name}: ${actual}`);
    } else {
      log.error(`${name}: Expected "${expected}", got "${actual}"`);
    }
    return passed;
  },
};

// Test counter
let totalTests = 0;
let passedTests = 0;

// Test runner
function test(name, expected, actual) {
  totalTests++;
  const passed = log.test(name, expected, actual);
  if (passed) passedTests++;
  return passed;
}

// =============================================================================
// Test Suite 1: getRedirectPath
// =============================================================================

log.section('Test Suite 1: getRedirectPath()');

test(
  'STUDENT role',
  '/dashboard/learning',
  getRedirectPath(USER_ROLES.STUDENT)
);

test(
  'TEACHER role',
  '/dashboard/teaching',
  getRedirectPath(USER_ROLES.TEACHER)
);

test(
  'ADMIN role',
  '/dashboard/admin',
  getRedirectPath(USER_ROLES.ADMIN)
);

test(
  'Unknown role',
  '/dashboard',
  getRedirectPath('UNKNOWN')
);

test(
  'Null role',
  '/dashboard',
  getRedirectPath(null)
);

test(
  'Lowercase role',
  '/dashboard/learning',
  getRedirectPath('student')
);

// =============================================================================
// Test Suite 2: getRedirectPathWithFallback
// =============================================================================

log.section('Test Suite 2: getRedirectPathWithFallback()');

test(
  'Student with attempted lesson URL',
  '/lessons/lesson-1',
  getRedirectPathWithFallback('STUDENT', '/lessons/lesson-1')
);

test(
  'Teacher with no attempted URL',
  '/dashboard/teaching',
  getRedirectPathWithFallback('TEACHER', null)
);

test(
  'Admin with empty attempted URL',
  '/dashboard/admin',
  getRedirectPathWithFallback('ADMIN', '')
);

test(
  'Student with external URL (should block)',
  '/dashboard/learning',
  getRedirectPathWithFallback('STUDENT', 'https://evil.com')
);

test(
  'Student blocked from auth/login',
  '/dashboard/learning',
  getRedirectPathWithFallback('STUDENT', '/auth/login')
);

test(
  'Teacher allowed to module page',
  '/modules/module-1',
  getRedirectPathWithFallback('TEACHER', '/modules/module-1')
);

// =============================================================================
// Test Suite 3: isSafeRedirectUrl
// =============================================================================

log.section('Test Suite 3: isSafeRedirectUrl()');

const baseUrl = 'https://ventilab.com';

test(
  'Relative URL (safe)',
  true,
  isSafeRedirectUrl('/dashboard', baseUrl)
);

test(
  'Same-origin absolute URL (safe)',
  true,
  isSafeRedirectUrl('https://ventilab.com/lessons', baseUrl)
);

test(
  'Different origin URL (unsafe)',
  false,
  isSafeRedirectUrl('https://evil.com', baseUrl)
);

test(
  'Null URL (unsafe)',
  false,
  isSafeRedirectUrl(null, baseUrl)
);

test(
  'Empty string URL (unsafe)',
  false,
  isSafeRedirectUrl('', baseUrl)
);

// =============================================================================
// Test Suite 4: getRedirectFromQuery
// =============================================================================

log.section('Test Suite 4: getRedirectFromQuery()');

test(
  'Extract redirect parameter',
  '/lessons/1',
  getRedirectFromQuery({ redirect: '/lessons/1' })
);

test(
  'Extract returnUrl parameter',
  '/modules/1',
  getRedirectFromQuery({ returnUrl: '/modules/1' })
);

test(
  'Extract callbackUrl parameter',
  '/dashboard',
  getRedirectFromQuery({ callbackUrl: '/dashboard' })
);

test(
  'No redirect parameter',
  null,
  getRedirectFromQuery({ page: '1' })
);

test(
  'Empty query',
  null,
  getRedirectFromQuery({})
);

test(
  'Null query',
  null,
  getRedirectFromQuery(null)
);

// =============================================================================
// Test Suite 5: buildRedirectUrl
// =============================================================================

log.section('Test Suite 5: buildRedirectUrl()');

test(
  'With safe callbackUrl',
  '/lessons/1',
  buildRedirectUrl({
    role: 'STUDENT',
    query: { callbackUrl: '/lessons/1' },
    baseUrl,
  })
);

test(
  'With unsafe callbackUrl',
  '/dashboard/learning',
  buildRedirectUrl({
    role: 'STUDENT',
    query: { callbackUrl: 'https://evil.com' },
    baseUrl,
  })
);

test(
  'No callbackUrl',
  '/dashboard/teaching',
  buildRedirectUrl({
    role: 'TEACHER',
    query: {},
    baseUrl,
  })
);

// =============================================================================
// Integration Tests: Real-World Scenarios
// =============================================================================

log.section('Integration Tests: Real-World Scenarios');

// Scenario 1: Student tries to access lesson, redirected to login, then back
log.info('\nScenario 1: Student accesses protected lesson');
const scenario1Result = buildRedirectUrl({
  role: 'STUDENT',
  query: { callbackUrl: '/lessons/ventilation-basics' },
  baseUrl,
});
test(
  '  Should return to attempted lesson',
  '/lessons/ventilation-basics',
  scenario1Result
);

// Scenario 2: Teacher goes directly to login
log.info('\nScenario 2: Teacher direct login');
const scenario2Result = buildRedirectUrl({
  role: 'TEACHER',
  query: {},
  baseUrl,
});
test(
  '  Should go to teacher dashboard',
  '/dashboard/teaching',
  scenario2Result
);

// Scenario 3: Admin from bookmarked page
log.info('\nScenario 3: Admin bookmarked page');
const scenario3Result = buildRedirectUrl({
  role: 'ADMIN',
  query: { callbackUrl: '/admin/users' },
  baseUrl,
});
test(
  '  Should return to bookmarked page',
  '/admin/users',
  scenario3Result
);

// Scenario 4: Attacker open redirect attempt
log.info('\nScenario 4: Open redirect attack');
const scenario4Result = buildRedirectUrl({
  role: 'STUDENT',
  query: { callbackUrl: 'https://phishing.com/steal' },
  baseUrl,
});
test(
  '  Should block and use safe dashboard',
  '/dashboard/learning',
  scenario4Result
);

// Scenario 5: Auth page loop prevention
log.info('\nScenario 5: Auth page loop prevention');
const scenario5Result = buildRedirectUrl({
  role: 'STUDENT',
  query: { callbackUrl: '/auth/login' },
  baseUrl,
});
test(
  '  Should prevent loop, use dashboard',
  '/dashboard/learning',
  scenario5Result
);

// =============================================================================
// Test Summary
// =============================================================================

log.section('Test Summary');

const passRate = ((passedTests / totalTests) * 100).toFixed(1);

console.log(`Total Tests: ${totalTests}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${totalTests - passedTests}${colors.reset}`);
console.log(`Pass Rate: ${passRate}%`);

if (passedTests === totalTests) {
  log.success('\nAll tests passed! ✨');
  process.exit(0);
} else {
  log.error(`\n${totalTests - passedTests} test(s) failed.`);
  process.exit(1);
}

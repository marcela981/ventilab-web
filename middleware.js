/**
 * =============================================================================
 * Next.js Middleware for Authentication and Authorization - VentyLab
 * =============================================================================
 * Server-side middleware that runs before routes are rendered.
 * Protects routes based on authentication status and user roles.
 *
 * Features:
 * - Authentication verification at server level
 * - Role-based access control
 * - Automatic redirects for unauthorized access
 * - Query parameter preservation
 * - Security logging
 * - Performance optimized
 * =============================================================================
 */

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * Route configuration - maps routes to required roles
 */
const ROUTE_PERMISSIONS = {
  '/dashboard/admin': ['ADMIN'],
  '/dashboard/instructor': ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
  '/dashboard/expert': ['EXPERT', 'ADMIN'],
  '/dashboard/student': ['STUDENT', 'INSTRUCTOR', 'EXPERT', 'ADMIN'],
  '/admin': ['ADMIN'],
  '/instructor': ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
  '/teaching/create': ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
  '/analytics': ['INSTRUCTOR', 'EXPERT', 'ADMIN'],
};

/**
 * Public routes that don't require authentication
 * NOTE: '/' is NOT included - all routes require authentication
 * The home page redirects to dashboard, which requires auth
 */
const PUBLIC_ROUTES = [
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

/**
 * Check if user has permission to access a specific path
 *
 * @param {string} pathname - The path being accessed
 * @param {string} userRole - The user's role
 * @returns {boolean} True if user has permission
 */
function hasPermission(pathname, userRole) {
  // Check exact path match first
  if (ROUTE_PERMISSIONS[pathname]) {
    return ROUTE_PERMISSIONS[pathname].includes(userRole);
  }

  // Check prefix matches (e.g., /admin/users matches /admin)
  for (const [route, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      return roles.includes(userRole);
    }
  }

  // Default: allow access if no specific permission configured
  return true;
}

/**
 * Get reason for access denial
 *
 * @param {string} pathname - The path being accessed
 * @param {string} userRole - The user's role
 * @returns {string} Reason message
 */
function getAccessDeniedReason(pathname, userRole) {
  for (const [route, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      return `Se requiere uno de estos roles: ${roles.join(', ')}. Tu rol actual: ${userRole}`;
    }
  }
  return 'No tienes permisos para acceder a este recurso';
}

/**
 * Main middleware function
 *
 * This function runs on every request to protected routes.
 * It verifies authentication and authorization before allowing access.
 */
// Helper to check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const url = req.nextUrl.clone();

    // Log access attempt ONLY in development to avoid spam in production
    if (isDev) {
      console.log('[Middleware] Access attempt:', {
        path: pathname,
        user: token?.email || 'unauthenticated',
        role: token?.role || 'none',
      });
    }

    // If no token, the withAuth callback will handle redirect to login
    if (!token) {
      if (isDev) {
        console.warn('[Middleware] Unauthenticated access attempt:', pathname);
      }
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Check if user is active
    if (token.isActive === false) {
      if (isDev) {
        console.warn('[Middleware] Inactive user attempted access:', token.email);
      }

      url.pathname = '/auth/error';
      url.searchParams.set('error', 'AccountDeactivated');
      return NextResponse.redirect(url);
    }

    // Check role-based permissions
    const userRole = token.role;
    if (!hasPermission(pathname, userRole)) {
      if (isDev) {
        console.warn('[Middleware] Unauthorized role access:', {
          user: token.email,
          role: userRole,
          path: pathname,
        });
      }

      // Redirect to access denied page with reason
      const reason = getAccessDeniedReason(pathname, userRole);
      url.pathname = '/auth/access-denied';
      url.searchParams.set('reason', reason);
      return NextResponse.redirect(url);
    }

    // All checks passed - allow access (no log in production)

    // Add security headers
    const response = NextResponse.next();

    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  },
  {
    /**
     * Authorization callback
     * Determines if the user is authorized to access the route
     */
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Allow public routes without authentication
        if (PUBLIC_ROUTES.includes(pathname)) {
          return true;
        }

        // Require token for all protected routes
        return !!token;
      },
    },

    /**
     * Pages configuration
     * Defines where to redirect for auth flows
     */
    pages: {
      signIn: '/auth/login',
      error: '/auth/error',
    },
  }
);

/**
 * Matcher configuration
 * Defines which routes this middleware applies to
 *
 * The middleware will run on:
 * - All /dashboard routes
 * - All /admin routes
 * - All /instructor routes
 * - All /teaching/create routes
 * - All /analytics routes
 * - /profile and /settings routes
 *
 * It will NOT run on:
 * - Public routes (/, /about, etc.)
 * - Auth routes (/auth/*)
 * - API routes (/api/*) - these have their own protection
 * - Static files (/_next/*, /favicon.ico, etc.)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - auth routes (already public)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth).*)',

    // Explicitly protect these routes
    '/',
    '/dashboard/:path*',
    '/admin/:path*',
    '/instructor/:path*',
    '/teaching/:path*',
    '/evaluation/:path*',
    '/flashcards/:path*',
    '/search/:path*',
    '/analytics/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/achievements/:path*',
  ],
};

/**
 * =============================================================================
 * USAGE NOTES
 * =============================================================================
 *
 * This middleware provides server-side protection for routes. It runs BEFORE
 * the page is rendered, ensuring that unauthorized users never see protected
 * content.
 *
 * ADDING NEW PROTECTED ROUTES:
 * 1. Add route to ROUTE_PERMISSIONS object with required roles
 * 2. Optionally add to config.matcher if it's a new top-level route
 *
 * Example:
 * const ROUTE_PERMISSIONS = {
 *   '/new-admin-route': ['ADMIN'],
 *   '/new-instructor-route': ['INSTRUCTOR', 'ADMIN'],
 * }
 *
 * TESTING:
 * - Test with authenticated user of each role
 * - Test with unauthenticated user
 * - Test with inactive account
 * - Verify redirects work correctly
 * - Check that query parameters are preserved
 *
 * SECURITY CONSIDERATIONS:
 * - This middleware runs on EVERY matching request
 * - Keep logic fast and efficient
 * - Don't perform heavy database queries here
 * - Log security violations for monitoring
 * - Always validate token existence and validity
 *
 * DEBUGGING:
 * - Check browser console for redirect messages
 * - Check server logs for middleware logs
 * - Use Network tab to see redirect chains
 * - Verify token is being sent with requests
 *
 * =============================================================================
 */

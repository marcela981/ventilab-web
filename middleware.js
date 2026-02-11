/**
 * =============================================================================
 * Next.js Edge Middleware - VentyLab
 * =============================================================================
 * REGLA DE ORO: Middleware = Edge = NO Node.js
 * 
 * - Auth → getServerSession en server components o API routes
 * - Prisma → SOLO en backend o API routes  
 * - Middleware → solo cookies, headers, redirects simples
 * 
 * Este middleware solo verifica la existencia del session token.
 * La verificación de roles y permisos se hace en:
 * - Server Components con getServerSession
 * - API Routes con getServerSession
 * =============================================================================
 */

import { NextResponse } from 'next/server';

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/error',
  '/auth/access-denied',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

/**
 * Simple Edge Middleware - Only checks for session token
 * NO role validation, NO Prisma, NO server imports
 */
export function middleware(req) {
  const pathname = req.nextUrl.pathname;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for NextAuth session token (works in both development and production)
  const sessionToken = 
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  // No token = redirect to login
  if (!sessionToken) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists - allow access
  // Role/permission validation happens in server components/API routes
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Matcher configuration - which routes this middleware protects
 */
export const config = {
  matcher: [
    /*
     * Protected routes - require authentication
     * Excludes: /api/*, /_next/*, /auth/*, static files
     */
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
 * IMPORTANTE: Validación de Roles y Permisos
 * =============================================================================
 * 
 * Este middleware SOLO verifica autenticación (token exists).
 * 
 * Para validar roles y permisos, usa getServerSession en:
 * 
 * 1. SERVER COMPONENTS:
 * ```js
 * import { getServerSession } from "next-auth/next";
 * import { authOptions } from "@/pages/api/auth/[...nextauth]";
 * 
 * export default async function Page() {
 *   const session = await getServerSession(authOptions);
 *   
 *   if (!session || session.user.role !== 'ADMIN') {
 *     redirect('/auth/access-denied');
 *   }
 *   // ... resto del componente
 * }
 * ```
 * 
 * 2. API ROUTES:
 * ```js
 * import { getServerSession } from "next-auth/next";
 * import { authOptions } from "./auth/[...nextauth]";
 * 
 * export default async function handler(req, res) {
 *   const session = await getServerSession(req, res, authOptions);
 *   
 *   if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
 *     return res.status(403).json({ error: 'Forbidden' });
 *   }
 *   // ... resto del handler
 * }
 * ```
 * 
 * =============================================================================
 */

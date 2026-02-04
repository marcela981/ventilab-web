/**
 * =============================================================================
 * Authentication Configuration for VentyLab
 * =============================================================================
 * Centralized configuration for authentication-related constants and routes.
 *
 * NOTE: Role definitions and permission helpers are in ./roles.js
 * This file only contains route configuration and auth error handling.
 * =============================================================================
 */

import { ROLES, ROLE_DISPLAY_NAMES, getRoleDisplayName } from './roles';

// Re-export role constants for backwards compatibility
export { ROLES, ROLE_DISPLAY_NAMES, getRoleDisplayName };

/**
 * @deprecated Use ROLES from ./roles.js instead
 * Kept for backwards compatibility during migration
 */
export const USER_ROLES = ROLES;

/**
 * Role-based Dashboard Routes
 * Maps user roles to their respective dashboard pages
 */
export const ROLE_DASHBOARDS = {
  [ROLES.STUDENT]: '/dashboard/student',
  [ROLES.TEACHER]: '/dashboard/instructor',
  [ROLES.ADMIN]: '/dashboard/admin',
  [ROLES.SUPERUSER]: '/dashboard/admin',
};

/**
 * Public Routes (accessible without authentication)
 */
export const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/error',
  '/auth/verify-email',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

/**
 * Auth Routes (redirect to dashboard if already authenticated)
 */
export const AUTH_ROUTES = ['/auth/login', '/auth/signup'];

/**
 * Protected Routes (require authentication)
 */
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/teaching',
  '/flashcards',
  '/evaluation',
  '/settings',
  '/panel',
];

/**
 * Admin-only Routes
 */
export const ADMIN_ROUTES = ['/admin', '/dashboard/admin'];

/**
 * Get dashboard URL based on user role
 *
 * @param {string} role - User role
 * @returns {string} Dashboard URL for the role
 *
 * @example
 * const url = getDashboardUrl('student'); // '/dashboard/student'
 */
export const getDashboardUrl = (role) => {
  const normalized = role?.toLowerCase();
  return ROLE_DASHBOARDS[normalized] || ROLE_DASHBOARDS[ROLES.STUDENT];
};

/**
 * Check if a path is a public route
 *
 * @param {string} path - Route path
 * @returns {boolean}
 */
export const isPublicRoute = (path) => {
  return PUBLIC_ROUTES.includes(path);
};

/**
 * Check if a path is an auth route (login/signup)
 *
 * @param {string} path - Route path
 * @returns {boolean}
 */
export const isAuthRoute = (path) => {
  return AUTH_ROUTES.includes(path);
};

/**
 * Get redirect URL after successful login based on user role
 *
 * @param {string} role - User role
 * @param {string} callbackUrl - Optional callback URL from login
 * @returns {string} URL to redirect to
 */
export const getPostLoginRedirect = (role, callbackUrl = null) => {
  // If there's a callback URL and it's not an auth page, use it
  if (callbackUrl && !AUTH_ROUTES.includes(callbackUrl)) {
    return callbackUrl;
  }

  // Otherwise, redirect to role-based dashboard
  return getDashboardUrl(role);
};

/**
 * NextAuth.js Error Messages (Spanish)
 * Maps NextAuth error codes to user-friendly Spanish messages
 */
export const AUTH_ERROR_MESSAGES = {
  Signin: 'Error al iniciar sesión. Intenta nuevamente.',
  OAuthSignin: 'Error al iniciar sesión con Google. Intenta nuevamente.',
  OAuthCallback: 'Error en la autenticación con Google. Intenta nuevamente.',
  OAuthCreateAccount: 'Error al crear cuenta con Google. Intenta nuevamente.',
  EmailCreateAccount: 'Error al crear cuenta con email. Intenta nuevamente.',
  Callback: 'Error en el proceso de autenticación.',
  OAuthAccountNotLinked:
    'Este email ya está registrado con otro método de inicio de sesión. Por favor usa el método original.',
  EmailSignin: 'Error al enviar email de inicio de sesión.',
  CredentialsSignin: 'Email o contraseña incorrectos. Verifica tus datos.',
  SessionRequired: 'Debes iniciar sesión para acceder a esta página.',
  AccountDeactivated: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
  SignInError: 'Error al iniciar sesión. Por favor intenta nuevamente.',
  Default: 'Ocurrió un error. Por favor intenta nuevamente.',
};

/**
 * Get user-friendly error message from NextAuth error code
 *
 * @param {string} error - NextAuth error code
 * @returns {string} User-friendly error message in Spanish
 */
export const getAuthErrorMessage = (error) => {
  return AUTH_ERROR_MESSAGES[error] || AUTH_ERROR_MESSAGES.Default;
};

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // Update every 24 hours
};

export default {
  ROLES,
  USER_ROLES,
  ROLE_DASHBOARDS,
  ROLE_DISPLAY_NAMES,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  PROTECTED_ROUTES,
  ADMIN_ROUTES,
  getDashboardUrl,
  isPublicRoute,
  isAuthRoute,
  getPostLoginRedirect,
  getAuthErrorMessage,
  getRoleDisplayName,
  SESSION_CONFIG,
};

/**
 * =============================================================================
 * Authentication Configuration and Utilities for VentyLab
 * =============================================================================
 * Centralized configuration for authentication-related constants, role-based
 * redirects, and helper functions for NextAuth.js
 * =============================================================================
 */

/**
 * User Roles in the VentyLab Platform
 * Must match the UserRole enum in Prisma schema
 */
export const USER_ROLES = {
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  EXPERT: 'EXPERT',
  ADMIN: 'ADMIN',
};

/**
 * Role-based Dashboard Routes
 * Maps user roles to their respective dashboard pages
 */
export const ROLE_DASHBOARDS = {
  [USER_ROLES.STUDENT]: '/dashboard/student',
  [USER_ROLES.INSTRUCTOR]: '/dashboard/instructor',
  [USER_ROLES.EXPERT]: '/dashboard/expert',
  [USER_ROLES.ADMIN]: '/dashboard/admin',
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
export const AUTH_ROUTES = [
  '/auth/login',
  '/auth/signup',
];

/**
 * Protected Routes (require authentication)
 */
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/teaching',
  '/flashcards',
  '/evaluation',
  '/settings',
];

/**
 * Admin-only Routes
 */
export const ADMIN_ROUTES = [
  '/admin',
  '/dashboard/admin',
];

/**
 * Get dashboard URL based on user role
 *
 * @param {string} role - User role (STUDENT, INSTRUCTOR, EXPERT, ADMIN)
 * @returns {string} Dashboard URL for the role
 *
 * @example
 * const url = getDashboardUrl('STUDENT'); // '/dashboard/student'
 */
export const getDashboardUrl = (role) => {
  return ROLE_DASHBOARDS[role] || ROLE_DASHBOARDS[USER_ROLES.STUDENT];
};

/**
 * Check if user has permission to access a specific route
 *
 * @param {string} path - Route path to check
 * @param {string} userRole - User's role
 * @returns {boolean} True if user can access the route
 *
 * @example
 * const canAccess = canAccessRoute('/admin', 'STUDENT'); // false
 */
export const canAccessRoute = (path, userRole) => {
  // Public routes are accessible to everyone
  if (PUBLIC_ROUTES.includes(path)) {
    return true;
  }

  // Admin routes require ADMIN role
  if (ADMIN_ROUTES.some((route) => path.startsWith(route))) {
    return userRole === USER_ROLES.ADMIN;
  }

  // All other protected routes are accessible to authenticated users
  return !!userRole;
};

/**
 * Get redirect URL after successful login based on user role
 *
 * @param {string} role - User role
 * @param {string} callbackUrl - Optional callback URL from login
 * @returns {string} URL to redirect to
 *
 * @example
 * const url = getPostLoginRedirect('STUDENT', '/teaching/module-1');
 * // Returns: '/teaching/module-1'
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
  AccountDeactivated:
    'Tu cuenta ha sido desactivada. Contacta al administrador.',
  SignInError: 'Error al iniciar sesión. Por favor intenta nuevamente.',
  Default: 'Ocurrió un error. Por favor intenta nuevamente.',
};

/**
 * Get user-friendly error message from NextAuth error code
 *
 * @param {string} error - NextAuth error code
 * @returns {string} User-friendly error message in Spanish
 *
 * @example
 * const message = getAuthErrorMessage('CredentialsSignin');
 * // 'Email o contraseña incorrectos. Verifica tus datos.'
 */
export const getAuthErrorMessage = (error) => {
  return AUTH_ERROR_MESSAGES[error] || AUTH_ERROR_MESSAGES.Default;
};

/**
 * Role Display Names (for UI)
 */
export const ROLE_DISPLAY_NAMES = {
  [USER_ROLES.STUDENT]: 'Estudiante',
  [USER_ROLES.INSTRUCTOR]: 'Instructor',
  [USER_ROLES.EXPERT]: 'Experto Médico',
  [USER_ROLES.ADMIN]: 'Administrador',
};

/**
 * Get display name for a role
 *
 * @param {string} role - User role
 * @returns {string} Display name in Spanish
 *
 * @example
 * const name = getRoleDisplayName('STUDENT'); // 'Estudiante'
 */
export const getRoleDisplayName = (role) => {
  return ROLE_DISPLAY_NAMES[role] || 'Usuario';
};

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // Update every 24 hours
};

/**
 * Check if user role is admin
 *
 * @param {string} role - User role
 * @returns {boolean} True if user is admin
 */
export const isAdmin = (role) => {
  return role === USER_ROLES.ADMIN;
};

/**
 * Check if user role is instructor or higher
 *
 * @param {string} role - User role
 * @returns {boolean} True if user is instructor, expert, or admin
 */
export const isInstructorOrAbove = (role) => {
  return [USER_ROLES.INSTRUCTOR, USER_ROLES.EXPERT, USER_ROLES.ADMIN].includes(role);
};

/**
 * Check if user role is expert or admin
 *
 * @param {string} role - User role
 * @returns {boolean} True if user is expert or admin
 */
export const isExpertOrAdmin = (role) => {
  return [USER_ROLES.EXPERT, USER_ROLES.ADMIN].includes(role);
};

export default {
  USER_ROLES,
  ROLE_DASHBOARDS,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  PROTECTED_ROUTES,
  ADMIN_ROUTES,
  getDashboardUrl,
  canAccessRoute,
  getPostLoginRedirect,
  getAuthErrorMessage,
  getRoleDisplayName,
  isAdmin,
  isInstructorOrAbove,
  isExpertOrAdmin,
  SESSION_CONFIG,
};

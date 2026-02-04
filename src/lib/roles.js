/**
 * =============================================================================
 * Role Constants and Helpers for VentyLab
 * =============================================================================
 * Single source of truth for role definitions and authorization helpers.
 * These values MUST match the backend exactly.
 *
 * Backend role field: role: "student" | "teacher" | "admin" | "superuser"
 * =============================================================================
 */

/**
 * Role constants matching backend exactly (lowercase)
 * @readonly
 */
export const ROLES = Object.freeze({
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
  SUPERUSER: 'superuser',
});

/**
 * Role hierarchy - higher index = more privileges
 * superuser > admin > teacher > student
 */
const ROLE_HIERARCHY = [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPERUSER];

/**
 * Display names for roles (Spanish)
 */
export const ROLE_DISPLAY_NAMES = Object.freeze({
  [ROLES.STUDENT]: 'Estudiante',
  [ROLES.TEACHER]: 'Profesor',
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.SUPERUSER]: 'Superusuario',
});

/**
 * Get display name for a role
 * @param {string} role - Role value from backend
 * @returns {string} Human-readable name in Spanish
 */
export function getRoleDisplayName(role) {
  return ROLE_DISPLAY_NAMES[role] || 'Usuario';
}

// =============================================================================
// Role Check Helpers
// =============================================================================

/**
 * Normalize role to lowercase for comparison
 * Handles legacy uppercase roles gracefully
 * @param {string} role - Role from user object
 * @returns {string} Normalized lowercase role
 */
function normalizeRole(role) {
  if (!role) return null;
  return String(role).toLowerCase();
}

/**
 * Check if user has a specific role
 * @param {string} userRole - User's current role
 * @param {string} targetRole - Role to check against
 * @returns {boolean}
 */
export function hasRole(userRole, targetRole) {
  const normalized = normalizeRole(userRole);
  const target = normalizeRole(targetRole);
  return normalized === target;
}

/**
 * Check if user has any of the specified roles
 * @param {string} userRole - User's current role
 * @param {string[]} roles - Array of roles to check
 * @returns {boolean}
 */
export function hasAnyRole(userRole, roles) {
  if (!Array.isArray(roles)) return false;
  const normalized = normalizeRole(userRole);
  return roles.some((r) => normalizeRole(r) === normalized);
}

/**
 * Check if user is a student
 * @param {string} role - User's role
 * @returns {boolean}
 */
export function isStudent(role) {
  return hasRole(role, ROLES.STUDENT);
}

/**
 * Check if user is a teacher
 * Note: superuser also satisfies this check
 * @param {string} role - User's role
 * @returns {boolean}
 */
export function isTeacher(role) {
  // superuser inherits teacher privileges
  return hasAnyRole(role, [ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPERUSER]);
}

/**
 * Check if user is an admin
 * Note: superuser also satisfies this check
 * @param {string} role - User's role
 * @returns {boolean}
 */
export function isAdmin(role) {
  // superuser inherits admin privileges
  return hasAnyRole(role, [ROLES.ADMIN, ROLES.SUPERUSER]);
}

/**
 * Check if user is a superuser
 * @param {string} role - User's role
 * @returns {boolean}
 */
export function isSuperuser(role) {
  return hasRole(role, ROLES.SUPERUSER);
}

/**
 * Check if user has teacher-level access or higher
 * Includes: teacher, admin, superuser
 * @param {string} role - User's role
 * @returns {boolean}
 */
export function isTeacherOrAbove(role) {
  return hasAnyRole(role, [ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPERUSER]);
}

/**
 * Check if user has admin-level access or higher
 * Includes: admin, superuser
 * @param {string} role - User's role
 * @returns {boolean}
 */
export function isAdminOrAbove(role) {
  return hasAnyRole(role, [ROLES.ADMIN, ROLES.SUPERUSER]);
}

/**
 * Check if a role can access resources requiring a specific role level
 * Accounts for role hierarchy (superuser > admin > teacher > student)
 *
 * @param {string} userRole - User's current role
 * @param {string} requiredRole - Minimum role required
 * @returns {boolean} True if user's role is >= required role in hierarchy
 *
 * @example
 * canAccess('superuser', 'admin') // true - superuser can access admin resources
 * canAccess('teacher', 'admin')   // false - teacher cannot access admin resources
 * canAccess('admin', 'teacher')   // true - admin can access teacher resources
 */
export function canAccess(userRole, requiredRole) {
  const normalizedUser = normalizeRole(userRole);
  const normalizedRequired = normalizeRole(requiredRole);

  const userIndex = ROLE_HIERARCHY.indexOf(normalizedUser);
  const requiredIndex = ROLE_HIERARCHY.indexOf(normalizedRequired);

  // Unknown roles have no access
  if (userIndex === -1 || requiredIndex === -1) return false;

  return userIndex >= requiredIndex;
}

/**
 * Check if user can access a route that requires specific role(s)
 * Handles both single role and array of roles
 * Accounts for superuser inheritance
 *
 * @param {string} userRole - User's current role
 * @param {string|string[]} requiredRoles - Required role(s) for access
 * @returns {boolean}
 *
 * @example
 * canAccessWithRoles('superuser', 'admin')           // true
 * canAccessWithRoles('teacher', ['teacher', 'admin']) // true
 * canAccessWithRoles('student', 'admin')             // false
 */
export function canAccessWithRoles(userRole, requiredRoles) {
  if (!requiredRoles) return true; // No role requirement

  const normalized = normalizeRole(userRole);

  // superuser can access everything
  if (normalized === ROLES.SUPERUSER) return true;

  // Single role check with hierarchy
  if (typeof requiredRoles === 'string') {
    return canAccess(userRole, requiredRoles);
  }

  // Array of roles - user needs at least one (OR logic with hierarchy)
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.some((role) => canAccess(userRole, role));
  }

  return false;
}

// =============================================================================
// Route Access Configuration
// =============================================================================

/**
 * Role requirements for specific route patterns
 * Used by route guards to determine access
 */
export const ROUTE_ROLES = Object.freeze({
  // Panel routes require teacher-level access
  '/panel': [ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPERUSER],
  '/teaching': [ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPERUSER],

  // Admin routes require admin-level access
  '/admin': [ROLES.ADMIN, ROLES.SUPERUSER],
  '/dashboard/admin': [ROLES.ADMIN, ROLES.SUPERUSER],

  // Student dashboard
  '/dashboard/student': [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPERUSER],
});

/**
 * Get required roles for a given route path
 * @param {string} path - Route path
 * @returns {string[]|null} Array of allowed roles or null if no restriction
 */
export function getRouteRoles(path) {
  // Check exact match first
  if (ROUTE_ROLES[path]) {
    return ROUTE_ROLES[path];
  }

  // Check prefix matches
  for (const [routePattern, roles] of Object.entries(ROUTE_ROLES)) {
    if (path.startsWith(routePattern)) {
      return roles;
    }
  }

  return null; // No specific role requirement
}

export default {
  ROLES,
  ROLE_DISPLAY_NAMES,
  getRoleDisplayName,
  hasRole,
  hasAnyRole,
  isStudent,
  isTeacher,
  isAdmin,
  isSuperuser,
  isTeacherOrAbove,
  isAdminOrAbove,
  canAccess,
  canAccessWithRoles,
  ROUTE_ROLES,
  getRouteRoles,
};

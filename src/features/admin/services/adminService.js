/**
 * =============================================================================
 * Admin Service - /api/admin/* endpoints
 * =============================================================================
 * Provides access to the teacher/admin dashboard data:
 * - Student list with progress (with group/search filters)
 * - Detailed student progress
 * - Teacher list (admin only)
 * - Role management (admin only)
 * - Platform statistics (admin only)
 * =============================================================================
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/** Authenticated fetch helper */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('ventilab_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) return { success: false, data: null, error: { message: data.message || 'Error', statusCode: res.status } };
    return { success: true, data, error: null };
  } catch (err) {
    return { success: false, data: null, error: { message: 'Error de conexión', statusCode: 0 } };
  }
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

/**
 * Get paginated student list with progress.
 * @param {Object} options
 * @param {string} [options.groupId] - Filter by group
 * @param {string} [options.search] - Name/email search
 * @param {boolean} [options.myGroups] - Only students in my groups
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {string} [options.sortBy='name']
 * @param {'asc'|'desc'} [options.sortOrder='asc']
 */
export async function getStudents(options = {}) {
  const { groupId, search, myGroups, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = options;
  const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
  if (groupId) params.append('groupId', groupId);
  if (search) params.append('search', search);
  if (myGroups) params.append('myGroups', 'true');
  return request(`/admin/students?${params}`);
}

/**
 * Get detailed progress for a student.
 * @param {string} studentId
 */
export async function getStudentProgress(studentId) {
  return request(`/admin/students/${studentId}/progress`);
}

// ---------------------------------------------------------------------------
// Teachers (admin only)
// ---------------------------------------------------------------------------

/**
 * Get list of teachers.
 * @param {string} [search]
 */
export async function getTeachers(search) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return request(`/admin/teachers${params}`);
}

// ---------------------------------------------------------------------------
// Role management (admin only)
// ---------------------------------------------------------------------------

/**
 * Change a user's role.
 * @param {string} userId
 * @param {'STUDENT'|'TEACHER'|'ADMIN'} role
 */
export async function updateUserRole(userId, role) {
  return request(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

// ---------------------------------------------------------------------------
// Statistics (admin only)
// ---------------------------------------------------------------------------

export async function getPlatformStatistics() {
  return request('/admin/statistics');
}

// Default export
const adminService = { getStudents, getStudentProgress, getTeachers, updateUserRole, getPlatformStatistics };
export default adminService;

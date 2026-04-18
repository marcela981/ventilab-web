/**
 * =============================================================================
 * Students Service - API calls for student management
 * =============================================================================
 * Handles all API interactions for the "My Students" view in the admin panel.
 * Uses the centralized httpClient for all requests.
 *
 * ACCESS RULES:
 * - Teachers: Can only fetch their assigned students
 * - Admin/Superuser: Can fetch all students
 * =============================================================================
 */

import { httpClient } from '@/shared/services/httpClient';

/**
 * Normalize httpClient response to service envelope format.
 */
async function request(endpoint, options = {}) {
  try {
    const { method = 'GET', body, headers } = options;
    let data;

    switch (method) {
      case 'POST':
        data = await httpClient.post(endpoint, body ? JSON.parse(body) : undefined);
        break;
      case 'PATCH':
        data = await httpClient.patch(endpoint, body ? JSON.parse(body) : undefined);
        break;
      case 'DELETE':
        data = await httpClient.delete(endpoint);
        break;
      default:
        data = await httpClient.get(endpoint);
    }

    return { success: true, data, error: null };
  } catch (err) {
    const status = err?.response?.status || 0;
    const message = err?.response?.data?.message || err?.message || 'Error de conexión con el servidor';
    const details = err?.response?.data?.details || [err?.message].filter(Boolean);
    console.error('[studentsService] Request error:', err?.message);
    return {
      success: false,
      data: null,
      error: { message, details, statusCode: status },
    };
  }
}

/**
 * Get students assigned to a specific teacher
 *
 * @param {string} teacherId - The teacher's user ID
 * @param {boolean} includeProgress - Include aggregated progress data
 */
export const getTeacherStudents = async (teacherId, includeProgress = true) => {
  const queryParams = new URLSearchParams();
  if (includeProgress) {
    queryParams.append('includeProgress', 'true');
  }

  const queryString = queryParams.toString();
  const endpoint = `/teacher-students/teachers/${teacherId}/students${queryString ? `?${queryString}` : ''}`;

  return request(endpoint);
};

/**
 * Get all students in the system
 *
 * ACCESS: Admin and Superuser only
 *
 * @param {Object} options - Query options
 */
export const getAllStudents = async (options = {}) => {
  const { page = 1, limit = 25, search = '', sortBy = 'name', sortOrder = 'asc' } = options;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder,
  });

  if (search) {
    queryParams.append('search', search);
  }

  return request(`/users/students?${queryParams.toString()}`);
};

/**
 * Get detailed progress for a specific student
 *
 * @param {string} teacherId - The teacher's user ID (for ownership verification)
 * @param {string} studentId - The student's user ID
 */
export const getStudentProgress = async (teacherId, studentId) => {
  return request(`/teacher-students/teachers/${teacherId}/students/${studentId}/progress`);
};

/**
 * Check if a student is assigned to the current teacher
 *
 * @param {string} studentId - The student's user ID
 */
export const checkStudentAssignment = async (studentId) => {
  return request(`/teacher-students/teachers/me/students/${studentId}/check`);
};

/**
 * Get a single student's details by ID
 *
 * @param {string} studentId - The student's user ID
 */
export const getStudentById = async (studentId) => {
  return request(`/users/students/${studentId}`);
};

// Default export as object for easier imports
const studentsService = {
  getTeacherStudents,
  getAllStudents,
  getStudentProgress,
  checkStudentAssignment,
  getStudentById,
};

export default studentsService;

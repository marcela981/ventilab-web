/**
 * =============================================================================
 * Students Service - API calls for student management
 * =============================================================================
 * Handles all API interactions for the "My Students" view in the admin panel.
 *
 * ACCESS RULES:
 * - Teachers: Can only fetch their assigned students
 * - Admin/Superuser: Can fetch all students
 *
 * @example
 * import { studentsService } from '@/features/admin/services/studentsService';
 * const { students } = await studentsService.getTeacherStudents(teacherId);
 * =============================================================================
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Helper function to make authenticated requests
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<{success: boolean, data: any, error: any}>}
 */
const makeRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('ventilab_auth_token');

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: {
          message: data.message || 'Error en la solicitud',
          details: data.details || [],
          statusCode: response.status,
        },
      };
    }

    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error('[studentsService] Request error:', error);
    return {
      success: false,
      data: null,
      error: {
        message: 'Error de conexión con el servidor',
        details: [error.message],
        statusCode: 0,
      },
    };
  }
};

/**
 * Get students assigned to a specific teacher
 *
 * ACCESS:
 * - Teachers: Can only fetch their own students (teacherId must match user.id)
 * - Admin/Superuser: Can fetch any teacher's students
 *
 * @param {string} teacherId - The teacher's user ID
 * @param {boolean} includeProgress - Include aggregated progress data
 * @returns {Promise<{success: boolean, data: StudentListResponse, error: any}>}
 */
export const getTeacherStudents = async (teacherId, includeProgress = true) => {
  const queryParams = new URLSearchParams();
  if (includeProgress) {
    queryParams.append('includeProgress', 'true');
  }

  const queryString = queryParams.toString();
  const endpoint = `/teacher-students/teachers/${teacherId}/students${queryString ? `?${queryString}` : ''}`;

  return makeRequest(endpoint);
};

/**
 * Get all students in the system
 *
 * ACCESS: Admin and Superuser only
 *
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search term for name/email
 * @param {string} options.sortBy - Field to sort by
 * @param {string} options.sortOrder - 'asc' or 'desc'
 * @returns {Promise<{success: boolean, data: StudentListResponse, error: any}>}
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

  return makeRequest(`/users/students?${queryParams.toString()}`);
};

/**
 * Get detailed progress for a specific student
 *
 * ACCESS:
 * - Teachers: Can only access their assigned students
 * - Admin/Superuser: Can access any student
 *
 * @param {string} teacherId - The teacher's user ID (for ownership verification)
 * @param {string} studentId - The student's user ID
 * @returns {Promise<{success: boolean, data: StudentProgressResponse, error: any}>}
 */
export const getStudentProgress = async (teacherId, studentId) => {
  return makeRequest(`/teacher-students/teachers/${teacherId}/students/${studentId}/progress`);
};

/**
 * Check if a student is assigned to the current teacher
 *
 * @param {string} studentId - The student's user ID
 * @returns {Promise<{success: boolean, data: {isAssigned: boolean}, error: any}>}
 */
export const checkStudentAssignment = async (studentId) => {
  return makeRequest(`/teacher-students/teachers/me/students/${studentId}/check`);
};

/**
 * Get a single student's details by ID
 * Used for the student detail view
 *
 * @param {string} studentId - The student's user ID
 * @returns {Promise<{success: boolean, data: StudentDetail, error: any}>}
 */
export const getStudentById = async (studentId) => {
  return makeRequest(`/users/students/${studentId}`);
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

/**
 * =============================================================================
 * Scores Service - /api/scores/* endpoints
 * =============================================================================
 * Teacher-assigned grades per student.
 * entityType: "MODULE" | "LESSON" | "QUIZ" | "CASE" | "CUSTOM"
 * =============================================================================
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

/**
 * Assign or update a score.
 * @param {Object} data
 * @param {string} data.studentId
 * @param {'MODULE'|'LESSON'|'QUIZ'|'CASE'|'CUSTOM'} data.entityType
 * @param {string} data.entityId
 * @param {number} data.score      - The points value
 * @param {number} [data.maxScore] - Max possible (default 100)
 * @param {string} [data.notes]
 */
export async function upsertScore(data) {
  return request('/scores', { method: 'POST', body: JSON.stringify(data) });
}

/** Delete a score by its ID. */
export async function deleteScore(scoreId) {
  return request(`/scores/${scoreId}`, { method: 'DELETE' });
}

/**
 * Get all scores for a student.
 * Teachers see only their own scores; admins see all.
 * @param {string} studentId
 */
export async function getStudentScores(studentId) {
  return request(`/scores/students/${studentId}`);
}

/**
 * Get all scores given by the calling teacher.
 * @param {string} [studentId] - Optional filter by student
 */
export async function getMyScores(studentId) {
  const qs = studentId ? `?studentId=${studentId}` : '';
  return request(`/scores/my-scores${qs}`);
}

const scoresService = { upsertScore, deleteScore, getStudentScores, getMyScores };
export default scoresService;

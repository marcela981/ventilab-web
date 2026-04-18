/**
 * =============================================================================
 * Scores Service - /api/scores/* endpoints
 * =============================================================================
 * Teacher-assigned grades per student.
 * entityType: "MODULE" | "LESSON" | "QUIZ" | "CASE" | "CUSTOM"
 * Uses the centralized httpClient for all requests.
 * =============================================================================
 */

import { httpClient } from '@/shared/services/httpClient';

/**
 * Normalize httpClient response to service envelope format.
 */
async function request(endpoint, options = {}) {
  try {
    const { method = 'GET', body } = options;
    let data;

    switch (method) {
      case 'POST':
        data = await httpClient.post(endpoint, body ? JSON.parse(body) : undefined);
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
    const message = err?.response?.data?.message || err?.message || 'Error de conexión';
    return {
      success: false,
      data: null,
      error: { message, statusCode: status },
    };
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

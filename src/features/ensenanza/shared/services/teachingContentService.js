/**
 * =============================================================================
 * Teaching Content Service - Lessons & Cards CRUD + Changelog
 * =============================================================================
 * Centralized API helpers for editing teaching entities from the admin panel.
 *
 * Entities supported:
 * - lesson  → /lessons/:id
 * - card    → /cards/:id
 *
 * NOTE:
 * - Uses the same API base URL pattern as other dashboard hooks.
 * - All requests are authenticated using the JWT stored in localStorage
 *   under the `ventilab_auth_token` key (see other services/hooks).
 * - This file intentionally does NOT contain any React logic so it can be
 *   reused from hooks, pages, or components.
 * =============================================================================
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Helper: perform an authenticated JSON request.
 *
 * Returns a normalized envelope:
 * { success: boolean, data: any, error: { message, details?, statusCode? } | null }
 */
async function request(endpoint, options = {}) {
  // Prefer the same token key used elsewhere in the app
  const storedToken =
    typeof window !== 'undefined'
      ? localStorage.getItem('ventilab_auth_token') ||
        localStorage.getItem('token')
      : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(storedToken && { Authorization: `Bearer ${storedToken}` }),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: {
          message: json.message || 'Error en la solicitud',
          details: json.details || [],
          statusCode: response.status,
        },
      };
    }

    return {
      success: true,
      data: json,
      error: null,
    };
  } catch (err) {
    console.error('[teachingContentService] Request error:', err);
    return {
      success: false,
      data: null,
      error: {
        message: 'Error de conexión con el servidor',
        details: [err.message],
        statusCode: 0,
      },
    };
  }
}

// =============================================================================
// Lessons
// =============================================================================

/**
 * Fetch a single lesson by ID.
 *
 * @param {string} lessonId
 */
export function getLessonById(lessonId) {
  return request(`/lessons/${lessonId}`);
}

/**
 * Update a lesson by ID.
 *
 * @param {string} lessonId
 * @param {Object} payload - Partial lesson payload (title, content, order, isActive, ...)
 */
export function updateLesson(lessonId, payload) {
  return request(`/lessons/${lessonId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// =============================================================================
// Cards
// =============================================================================

/**
 * Fetch a single card by ID.
 *
 * @param {string} cardId
 */
export function getCardById(cardId) {
  return request(`/cards/${cardId}`);
}

/**
 * Update a card by ID.
 *
 * @param {string} cardId
 * @param {Object} payload - Partial card payload (title, content, order, isActive, ...)
 */
export function updateCard(cardId, payload) {
  return request(`/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// =============================================================================
// Changelog
// =============================================================================

/**
 * Fetch change history for an entity.
 *
 * Backend contract (expected but tolerant):
 * - GET /changelog?entityType=lesson|card&entityId=...
 * - Returns an array of entries:
 *   [
 *     {
 *       id: string;
 *       entityType: string;
 *       entityId: string;
 *       changedAt: string;
 *       changedBy: { id, name, email } | string;
 *       diff: {
 *         [field: string]: { before: any, after: any }
 *       }
 *     },
 *     ...
 *   ]
 *
 * @param {'lesson'|'card'} entityType
 * @param {string} entityId
 */
export function getChangeHistory(entityType, entityId) {
  const params = new URLSearchParams({
    entityType,
    entityId,
  });

  return request(`/changelog?${params.toString()}`);
}

// Default grouped export for convenience
const teachingContentService = {
  getLessonById,
  updateLesson,
  getCardById,
  updateCard,
  getChangeHistory,
};

export default teachingContentService;


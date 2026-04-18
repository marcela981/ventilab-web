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

import { httpClient } from '@/shared/services/httpClient';

/**
 * Helper: perform an authenticated JSON request via centralized httpClient.
 *
 * Returns a normalized envelope:
 * { success: boolean, data: any, error: { message, details?, statusCode? } | null }
 */
async function request(endpoint, options = {}) {
  try {
    const { method = 'GET', body } = options;
    let data;

    switch (method) {
      case 'POST':
        data = await httpClient.post(endpoint, body ? JSON.parse(body) : undefined);
        break;
      case 'PUT':
        data = await httpClient.put(endpoint, body ? JSON.parse(body) : undefined);
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
    console.error('[teachingContentService] Request error:', err?.message);
    return {
      success: false,
      data: null,
      error: { message, details, statusCode: status },
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


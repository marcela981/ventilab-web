/**
 * =============================================================================
 * Teaching Service - /api/levels, /api/modules, /api/lessons, /api/cards, /api/changelog
 * =============================================================================
 * Full CRUD for teaching content hierarchy: Level → Module → Lesson → Step (Card)
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
    const message = err?.response?.data?.message || err?.message || 'Error de conexión';
    return {
      success: false,
      data: null,
      error: { message, statusCode: status },
    };
  }
}

// ── Levels ──────────────────────────────────────────────────────────────────
export const getLevels = (includeInactive = false) =>
  request(`/levels?limit=100${includeInactive ? '&includeInactive=true' : ''}`);

export const createLevel = (data) =>
  request('/levels', { method: 'POST', body: JSON.stringify(data) });

export const updateLevel = (id, data) =>
  request(`/levels/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteLevel = (id) =>
  request(`/levels/${id}`, { method: 'DELETE' });

export const getLevelModules = (levelId) =>
  request(`/levels/${levelId}/modules`);

// ── Modules ──────────────────────────────────────────────────────────────────
export const createModule = (data) =>
  request('/modules', { method: 'POST', body: JSON.stringify(data) });

export const updateModule = (id, data) =>
  request(`/modules/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteModule = (id) =>
  request(`/modules/${id}`, { method: 'DELETE' });

// ── Lessons ───────────────────────────────────────────────────────────────────
export const getModuleLessons = (moduleId) =>
  request(`/modules/${moduleId}/lessons`);

export const getLessonById = (id) =>
  request(`/lessons/${id}`);

export const createLesson = (data) =>
  request('/lessons', { method: 'POST', body: JSON.stringify(data) });

export const updateLesson = (id, data) =>
  request(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteLesson = (id) =>
  request(`/lessons/${id}`, { method: 'DELETE' });

// ── Steps (Cards) ─────────────────────────────────────────────────────────────
export const getLessonSteps = (lessonId) =>
  request(`/lessons/${lessonId}/steps`);

export const createStep = (data) =>
  request('/cards', { method: 'POST', body: JSON.stringify(data) });

export const updateStep = (id, data) =>
  request(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteStep = (id) =>
  request(`/cards/${id}`, { method: 'DELETE' });

export const reorderSteps = (lessonId, stepIds) =>
  request('/cards/reorder', { method: 'PUT', body: JSON.stringify({ lessonId, stepIds }) });

// ── Changelog ─────────────────────────────────────────────────────────────────
export const getRecentChanges = (limit = 30) =>
  request(`/changelog/recent?limit=${limit}`);

export const getEntityHistory = (entityType, entityId) =>
  request(`/changelog/${entityType}/${entityId}`);

const teachingService = {
  getLevels, createLevel, updateLevel, deleteLevel, getLevelModules,
  createModule, updateModule, deleteModule,
  getModuleLessons, getLessonById, createLesson, updateLesson, deleteLesson,
  getLessonSteps, createStep, updateStep, deleteStep, reorderSteps,
  getRecentChanges, getEntityHistory,
};
export default teachingService;

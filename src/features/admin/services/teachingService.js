/**
 * Teaching Service - /api/levels, /api/modules, /api/lessons, /api/cards, /api/changelog
 * Full CRUD for teaching content hierarchy: Level → Module → Lesson → Step (Card)
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
  } catch {
    return { success: false, data: null, error: { message: 'Error de conexión', statusCode: 0 } };
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
// levelId passes through the service as an extra body field (Prisma accepts it)
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

// content must be a valid JSON string with { type, sections: [{...}] }
export const createLesson = (data) =>
  request('/lessons', { method: 'POST', body: JSON.stringify(data) });

export const updateLesson = (id, data) =>
  request(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteLesson = (id) =>
  request(`/lessons/${id}`, { method: 'DELETE' });

// ── Steps (Cards) ─────────────────────────────────────────────────────────────
export const getLessonSteps = (lessonId) =>
  request(`/lessons/${lessonId}/steps`);

// contentType: text | image | video | quiz | simulation | code
// content: plain string for text/image/video, JSON string for quiz
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

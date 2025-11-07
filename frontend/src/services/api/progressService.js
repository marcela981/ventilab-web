'use strict';

const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

let apiBaseUrl = DEFAULT_API_BASE_URL;
let authResolver = () => {
  if (typeof window !== 'undefined' && window.__VENTYLAB_AUTH__) {
    return window.__VENTYLAB_AUTH__;
  }
  return { token: null, userId: null };
};

export const configureProgressService = ({ baseUrl, getAuth }) => {
  if (baseUrl) {
    apiBaseUrl = baseUrl;
  }

  if (typeof getAuth === 'function') {
    authResolver = getAuth;
  }
};

const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const { token, userId } = authResolver() || {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (userId) {
      headers['X-User-Id'] = userId;
    }
  } catch (error) {
    console.warn('[progressService] Error resolving auth headers:', error);
  }

  return headers;
};

const buildUrl = (path, query) => {
  const url = new URL(`${apiBaseUrl.replace(/\/$/, '')}${path}`);

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = payload?.error?.message
      || payload?.error?.code
      || payload?.error
      || payload?.message
      || `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload?.data ?? payload;
};

export const fetchProgress = async ({ moduleId, lessonId } = {}) => {
  try {
    const url = buildUrl('/progress', { moduleId, lessonId });
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    const data = await parseResponse(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[progressService] fetchProgress failed:', error);
    throw new Error(error.message || 'No se pudo obtener el progreso del usuario.');
  }
};

/**
 * Upsert user progress for a single lesson.
 *
 * @param {Object} payload - Payload compatible with PUT /api/progress
 * @param {string} payload.moduleId
 * @param {string} payload.lessonId
 * @param {number} payload.positionSeconds
 * @param {number} payload.progress
 * @param {boolean} payload.isCompleted
 * @param {number} [payload.attempts]
 * @param {number|null} [payload.score]
 * @param {Object|null} [payload.metadata]
 * @param {string|Date} payload.clientUpdatedAt
 *
 * @example
 * await upsertProgress({
 *   moduleId: 'module-ventilation-basics',
 *   lessonId: 'lesson-ventilator-modes',
 *   positionSeconds: 185,
 *   progress: 0.42,
 *   isCompleted: false,
 *   clientUpdatedAt: '2025-11-07T13:10:00.000Z'
 * });
 *
 * // Response: {
 * //   id: 'clpxf9p6t000108mdu3yk8p6s',
 * //   userId: 'user-123',
 * //   moduleId: 'module-ventilation-basics',
 * //   lessonId: 'lesson-ventilator-modes',
 * //   positionSeconds: 185,
 * //   progress: 0.42,
 * //   isCompleted: false,
 * //   attempts: 0,
 * //   score: null,
 * //   metadata: { lastSection: 'volume-targeting' },
 * //   clientUpdatedAt: '2025-11-07T13:10:00.000Z',
 * //   serverUpdatedAt: '2025-11-07T13:10:00.532Z',
 * //   createdAt: '2025-11-07T12:00:11.901Z'
 * // }
 */
export const upsertProgress = async (payload) => {
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload inválido para actualizar progreso.');
    }

    const body = {
      ...payload,
      clientUpdatedAt: payload.clientUpdatedAt
        ? new Date(payload.clientUpdatedAt).toISOString()
        : new Date().toISOString(),
    };

    const response = await fetch(buildUrl('/progress'), {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const data = await parseResponse(response);
    return data;
  } catch (error) {
    console.error('[progressService] upsertProgress failed:', error);
    throw new Error(error.message || 'No se pudo sincronizar el progreso de la lección.');
  }
};

/**
 * Bulk sync an array of pending progress items.
 * Each record MUST include `clientUpdatedAt` for LWW reconciliation.
 *
 * @param {Array<Object>} items
 *
 * @example
 * await bulkSyncProgress([
 *   {
 *     moduleId: 'module-ventilation-basics',
 *     lessonId: 'lesson-ventilator-modes',
 *     positionSeconds: 320,
 *     progress: 0.68,
 *     isCompleted: false,
 *     clientUpdatedAt: '2025-11-07T13:12:00.000Z'
 *   },
 *   {
 *     moduleId: 'module-ventilation-basics',
 *     lessonId: 'lesson-ventilator-checklist',
 *     positionSeconds: 900,
 *     progress: 1,
 *     isCompleted: true,
 *     clientUpdatedAt: '2025-11-07T13:15:36.000Z'
 *   }
 * ]);
 *
 * // Response example:
 * // {
 * //   merged: [
 * //     { lessonId: 'lesson-ventilator-modes', merged: true },
 * //     { lessonId: 'lesson-ventilator-checklist', merged: true }
 * //   ],
 * //   records: [
 * //     {
 * //       id: 'clpxfcze7000308mdivah0f6l',
 * //       lessonId: 'lesson-ventilator-modes',
 * //       moduleId: 'module-ventilation-basics',
 * //       progress: 0.68,
 * //       clientUpdatedAt: '2025-11-07T13:12:00.000Z',
 * //       serverUpdatedAt: '2025-11-07T13:12:00.447Z',
 * //       createdAt: '2025-11-02T10:00:00.000Z'
 * //     },
 * //     {
 * //       id: 'clpxfdtzj000408md7jhz3y9p',
 * //       lessonId: 'lesson-ventilator-checklist',
 * //       moduleId: 'module-ventilation-basics',
 * //       progress: 1,
 * //       isCompleted: true,
 * //       clientUpdatedAt: '2025-11-07T13:15:36.000Z',
 * //       serverUpdatedAt: '2025-11-07T13:15:36.891Z',
 * //       createdAt: '2025-11-02T11:22:10.000Z'
 * //     }
 * //   ]
 * // }
 */
export const bulkSyncProgress = async (items) => {
  try {
    if (!Array.isArray(items)) {
      throw new Error('El argumento items debe ser un arreglo de progresos.');
    }

    if (items.length === 0) {
      return {
        merged: [],
        records: [],
      };
    }

    const body = items.map((item) => ({
      ...item,
      clientUpdatedAt: item?.clientUpdatedAt
        ? new Date(item.clientUpdatedAt).toISOString()
        : new Date().toISOString(),
    }));

    const url = buildUrl('/progress/sync');
    
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });
    } catch (fetchError) {
      // Error de red (servidor no disponible, CORS, etc.)
      if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
        throw new Error(`No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose en ${apiBaseUrl}`);
      }
      throw fetchError;
    }

    const data = await parseResponse(response);
    return {
      merged: Array.isArray(data?.merged) ? data.merged : [],
      records: Array.isArray(data?.records) ? data.records : [],
    };
  } catch (error) {
    console.error('[progressService] bulkSyncProgress failed:', error);
    
    // Preservar el mensaje de error original si es informativo
    if (error.message && !error.message.includes('No se pudo')) {
      throw error;
    }
    
    throw new Error(error.message || 'No se pudo completar la sincronización masiva de progreso.');
  }
};

export default {
  configureProgressService,
  fetchProgress,
  upsertProgress,
  bulkSyncProgress,
};


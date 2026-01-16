'use strict';

/**
 * Progress Service
 * API client for progress tracking endpoints
 * Uses the unified LearningProgress + LessonProgress model
 */

import http from './http';
import { setAuthToken, removeAuthToken } from '../authService';

const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Debug: Print API base URL once on module load
if (typeof window !== 'undefined') {
  console.debug('[progressService] API Base URL:', DEFAULT_API_BASE_URL);
  console.debug('[progressService] NEXT_PUBLIC_API_URL env:', process.env.NEXT_PUBLIC_API_URL);
}

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

const isClient = typeof window !== 'undefined';
const SESSION_EXPIRED_REGEX = /session has expired/i;
let tokenRefreshPromise = null;

const shouldAttemptSessionRefresh = (error) => {
  if (!isClient || !error) {
    return false;
  }

  if (error.status !== 401) {
    return false;
  }

  if (error.code === 'TOKEN_EXPIRED') {
    return true;
  }

  const message = (error.message || '').toLowerCase();
  return SESSION_EXPIRED_REGEX.test(message);
};

const notifySessionExpired = (reason) => {
  if (!isClient || typeof window.dispatchEvent !== 'function') {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { reason } }));
  } catch {
    // Ignore environments without CustomEvent
  }
};

const refreshBackendToken = async () => {
  if (!isClient) {
    throw new Error('Backend token refresh is only available in the browser');
  }

  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = (async () => {
    let response;
    try {
      response = await fetch('/api/auth/backend-token', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        credentials: 'include',
      });
    } catch (networkError) {
      const error = new Error(networkError.message || 'Failed to refresh backend session');
      error.cause = networkError;
      throw error;
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(payload?.error || 'Failed to refresh backend session');
      error.status = response.status;
      throw error;
    }

    if (payload?.success && payload?.token) {
      setAuthToken(payload.token);

      if (payload.user) {
        try {
          localStorage.setItem('ventilab_user_data', JSON.stringify(payload.user));
        } catch {
          // Ignore quota errors
        }
      }

      return true;
    }

    throw new Error('Backend token response missing token');
  })();

  try {
    return await tokenRefreshPromise;
  } finally {
    tokenRefreshPromise = null;
  }
};

const maybeRefreshSession = async (error) => {
  if (!shouldAttemptSessionRefresh(error)) {
    return false;
  }

  try {
    await refreshBackendToken();
    return true;
  } catch (refreshError) {
    console.error('[progressService] Session refresh failed:', refreshError);

    if (refreshError?.status === 401) {
      removeAuthToken();
      notifySessionExpired(refreshError?.message);
    }

    return false;
  }
};

const executeWithAuthRetry = async (operation, attempt = 0) => {
  try {
    return await operation();
  } catch (error) {
    if (attempt === 0 && (await maybeRefreshSession(error))) {
      return executeWithAuthRetry(operation, attempt + 1);
    }

    throw error;
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
    } else {
      // If no token is available, we should throw an error to prevent unauthorized requests
      // However, we'll let the backend handle this for better error messages
      console.warn('[progressService] No authentication token available');
    }
  } catch (error) {
    console.warn('[progressService] Error resolving auth headers:', error);
  }

  return headers;
};

const buildUrl = (path) => {
  const trimmed = apiBaseUrl.replace(/\/$/, '');
  const hasApiSegment = /\/api(\/|$)/.test(trimmed);
  const base = hasApiSegment ? trimmed : `${trimmed}/api`;
  return `${base}${path}`;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    // Handle backend error format: { success: false, error: { code, message, details } }
    let message = `Request failed with status ${response.status}`;
    
    if (typeof payload === 'object' && payload !== null) {
      if (payload.error) {
        // Backend error format
        message = payload.error.message || payload.error.code || message;
      } else if (payload.message) {
        // Alternative error format
        message = payload.message;
      }
    } else if (typeof payload === 'string') {
      message = payload;
    }

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    error.code = payload?.error?.code;
    
    // Extract Retry-After header for rate limiting (429)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        error.retryAfter = parseInt(retryAfter, 10);
        if (error.payload && typeof error.payload === 'object') {
          error.payload.retryAfter = error.retryAfter;
        }
      }
    }
    
    throw error;
  }

  // Handle backend success format: { success: true, data: {...} }
  if (typeof payload === 'object' && payload !== null && payload.success === true) {
    return payload.data ?? payload;
  }

  // Fallback to direct payload
  return payload;
};

const handleNetworkError = (error, apiBaseUrl) => {
  if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
    const networkError = new Error(`No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose en ${apiBaseUrl}`);
    networkError.name = 'NetworkError';
    networkError.isNetworkError = true;
    throw networkError;
  }
  throw error;
};

/**
 * Get module progress with all lesson progress records
 * 
 * @param {string} moduleId - Module ID
 * @returns {Promise<ModuleProgressResponseDTO>} Module progress with lessons
 * 
 * @example
 * const progress = await getModuleProgress('module-123');
 * // Returns: {
 * //   learningProgress: { id, userId, moduleId, completedAt, timeSpent, score, ... },
 * //   lessonProgress: [{ id, lessonId, completed, timeSpent, progress, ... }],
 * //   isAvailable: true
 * // }
 */
export const getModuleProgress = async (moduleId) => {
  return executeWithAuthRetry(async () => {
    try {
      if (!moduleId || typeof moduleId !== 'string') {
        throw new Error('moduleId is required and must be a string');
      }

      const url = buildUrl(`/progress/modules/${encodeURIComponent(moduleId)}`);
      let response;

      try {
        response = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      } catch (fetchError) {
        handleNetworkError(fetchError, apiBaseUrl);
      }

      const data = await parseResponse(response);
      return data;
    } catch (error) {
      console.error('[progressService] getModuleProgress failed:', error);
      
      if (error.isNetworkError || error.name === 'NetworkError') {
        throw error;
      }
      
      // Handle 404 specifically (module not found or progress doesn't exist)
      // Return null instead of throwing to allow graceful handling
      if (error.status === 404) {
        // Create a custom error that can be checked but won't break the flow
        const notFoundError = new Error(`Module "${moduleId}" not found`);
        notFoundError.status = 404;
        notFoundError.code = 'MODULE_NOT_FOUND';
        notFoundError.isNotFound = true;
        throw notFoundError;
      }
      
      if (error instanceof Error) {
        if (!error.message) {
          error.message = 'No se pudo obtener el progreso del módulo.';
        }
        throw error;
      }

      throw new Error('No se pudo obtener el progreso del módulo.');
    }
  });
};

/**
 * Update lesson progress (upsert)
 * Updates lesson progress and recalculates module aggregates atomically
 * 
 * @param {UpdateLessonProgressRequestDTO} payload - Progress update data
 * @param {string} payload.lessonId - Lesson ID (required)
 * @param {number} [payload.progress] - Progress value 0.0-1.0 (optional)
 * @param {boolean} [payload.completed] - Whether lesson is completed (optional)
 * @param {number} [payload.completionPercentage] - Completion percentage 0-100 (optional)
 * @param {number} [payload.timeSpentDelta] - Time spent delta in minutes (optional, added to existing)
 * @param {string} [payload.lastAccessed] - Last accessed timestamp ISO 8601 (optional)
 * @returns {Promise<UpdateLessonProgressResponseDTO>} Updated lesson and module progress
 * 
 * @example
 * const result = await updateLessonProgress({
 *   lessonId: 'lesson-123',
 *   progress: 0.75,
 *   completed: false,
 *   timeSpentDelta: 5,
 *   lastAccessed: '2025-11-07T10:00:00.000Z'
 * });
 * // Returns: {
 * //   lessonProgress: { id, lessonId, completed, timeSpent, progress, ... },
 * //   moduleProgress: { progressPercentage: 60, timeSpent: 120, score: null, ... }
 * // }
 */
export const updateLessonProgress = async (payload) => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 [FRONTEND] updateLessonProgress CALLED');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📍 Timestamp:', new Date().toISOString());
  console.log('📍 Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
  console.log('📦 payload:', JSON.stringify(payload, null, 2));
  console.log('');
  
  return executeWithAuthRetry(async () => {
    try {
      if (!payload || typeof payload !== 'object') {
        throw new Error('Payload inválido para actualizar progreso.');
      }

      if (!payload.lessonId || typeof payload.lessonId !== 'string') {
        throw new Error('lessonId is required and must be a string');
      }

      const { lessonId } = payload;
      const body = {
        ...(payload.progress !== undefined && { progress: payload.progress }),
        ...(payload.completed !== undefined && { completed: payload.completed }),
        ...(payload.completionPercentage !== undefined && { completionPercentage: payload.completionPercentage }),
        ...(payload.timeSpentDelta !== undefined && { timeSpentDelta: payload.timeSpentDelta }),
        ...(payload.lastAccessed !== undefined && { lastAccessed: payload.lastAccessed }),
      };

      const url = buildUrl(`/progress/lesson/${lessonId}`);
      
      console.log('📡 [FRONTEND] Request details:');
      console.log('   - URL:', url);
      console.log('   - Method: PUT');
      console.log('   - Body:', JSON.stringify(body, null, 2));
      console.log('   - Headers:', JSON.stringify(getAuthHeaders(), null, 2));
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      
      let response;

      try {
        response = await fetch(url, {
          method: 'PUT',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(body),
        });
        
        console.log('📥 [FRONTEND] Response received:');
        console.log('   - Status:', response.status);
        console.log('   - StatusText:', response.statusText);
        console.log('   - OK:', response.ok);
        console.log('   - Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
        console.log('');
        
      } catch (fetchError) {
        console.error('');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('❌ [FRONTEND] FETCH ERROR');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('Error type:', fetchError?.constructor?.name);
        console.error('Error message:', fetchError?.message);
        console.error('Full error:', fetchError);
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('');
        handleNetworkError(fetchError, apiBaseUrl);
      }

      const data = await parseResponse(response);
      
      console.log('✅ [FRONTEND] SUCCESS - Response data:');
      console.log(JSON.stringify(data, null, 2));
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      
      return data;
    } catch (error) {
      console.error('');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('❌ [FRONTEND] CATCH ERROR in updateLessonProgress');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Full error:', error);
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('');
      
      console.error('[progressService] updateLessonProgress failed:', error);
      
      if (error.isNetworkError || error.name === 'NetworkError') {
        throw error;
      }
      
      if (error instanceof Error) {
        if (!error.message) {
          error.message = 'No se pudo actualizar el progreso de la lección.';
        }
        throw error;
      }

      throw new Error('No se pudo actualizar el progreso de la lección.');
    }
  });
};

/**
 * Get progress summary for all modules
 * 
 * @returns {Promise<ProgressSummaryResponseDTO>} Progress summary by module
 * 
 * @example
 * const summary = await getProgressSummary();
 * // Returns: {
 * //   modules: [
 * //     {
 * //       moduleId: 'module-1',
 * //       moduleTitle: 'Introduction',
 * //       progressPercentage: 75,
 * //       timeSpent: 120,
 * //       score: 85.5,
 * //       isCompleted: false,
 * //       completedAt: null
 * //     },
 * //     ...
 * //   ]
 * // }
 */
export const getProgressSummary = async () => {
  return executeWithAuthRetry(async () => {
    try {
      const url = buildUrl('/progress/summary');
      let response;

      try {
        response = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      } catch (fetchError) {
        handleNetworkError(fetchError, apiBaseUrl);
      }

      const data = await parseResponse(response);
      return data;
    } catch (error) {
      console.error('[progressService] getProgressSummary failed:', error);
      
      if (error.isNetworkError || error.name === 'NetworkError') {
        throw error;
      }
      
      if (error instanceof Error) {
        if (!error.message) {
          error.message = 'No se pudo obtener el resumen de progreso.';
        }
        throw error;
      }

      throw new Error('No se pudo obtener el resumen de progreso.');
    }
  });
};

// Legacy compatibility - deprecated, use getModuleProgress instead
export const fetchProgress = async ({ moduleId, lessonId } = {}) => {
  console.warn('[progressService] fetchProgress is deprecated. Use getModuleProgress(moduleId) instead.');
  
  if (moduleId) {
    try {
      const moduleProgress = await getModuleProgress(moduleId);
      // Transform to legacy format
      return moduleProgress.lessonProgress.map(lp => ({
        id: lp.id,
        userId: moduleProgress.learningProgress.userId,
        moduleId: lp.lessonId, // Note: this is incorrect but maintains compatibility
        lessonId: lp.lessonId,
        positionSeconds: 0, // Not available in new model
        progress: lp.progress,
        isCompleted: lp.completed,
        attempts: 0, // Not available in new model
        score: null, // Not in lesson progress
        metadata: null, // Not available in new model
        clientUpdatedAt: lp.lastAccessed,
        serverUpdatedAt: lp.updatedAt,
        createdAt: lp.createdAt,
      }));
    } catch (error) {
      console.error('[progressService] fetchProgress (legacy) failed:', error);
      return [];
    }
  }
  
  return [];
};

// Legacy compatibility - deprecated, use updateLessonProgress instead
export const upsertProgress = async (payload) => {
  console.warn('[progressService] upsertProgress is deprecated. Use updateLessonProgress instead.');
  
  if (!payload || !payload.lessonId) {
    throw new Error('lessonId is required');
  }

  try {
    const result = await updateLessonProgress({
      lessonId: payload.lessonId,
      progress: payload.progress,
      completed: payload.isCompleted,
      timeSpentDelta: payload.positionSeconds ? Math.floor(payload.positionSeconds / 60) : undefined,
      lastAccessed: payload.clientUpdatedAt || new Date().toISOString(),
    });

    // Transform to legacy format
    return {
      id: result.lessonProgress.id,
      userId: '', // Not available in response
      moduleId: payload.moduleId || '', // From request
      lessonId: result.lessonProgress.lessonId,
      positionSeconds: result.lessonProgress.timeSpent * 60, // Convert minutes to seconds
      progress: result.lessonProgress.progress,
      isCompleted: result.lessonProgress.completed,
      attempts: 0, // Not available
      score: null, // Not in lesson progress
      metadata: null, // Not available
      clientUpdatedAt: result.lessonProgress.lastAccessed || new Date().toISOString(),
      serverUpdatedAt: result.lessonProgress.updatedAt,
      createdAt: result.lessonProgress.createdAt,
    };
  } catch (error) {
    console.error('[progressService] upsertProgress (legacy) failed:', error);
    throw error;
  }
};

// Legacy compatibility - deprecated
export const bulkSyncProgress = async (items) => {
  console.warn('[progressService] bulkSyncProgress is deprecated. Use updateLessonProgress for individual updates.');
  
  if (!Array.isArray(items) || items.length === 0) {
    return { merged: [], records: [] };
  }

  const results = [];
  const merged = [];

  for (const item of items) {
    try {
      const result = await updateLessonProgress({
        lessonId: item.lessonId,
        progress: item.progress,
        completed: item.isCompleted,
        timeSpentDelta: item.positionSeconds ? Math.floor(item.positionSeconds / 60) : undefined,
        lastAccessed: item.clientUpdatedAt || new Date().toISOString(),
      });

      results.push(result.lessonProgress);
      merged.push({ lessonId: item.lessonId, merged: true });
    } catch (error) {
      merged.push({ lessonId: item.lessonId, merged: false, error: error.message });
    }
  }

  return { merged, records: results };
};

/**
 * Get progress overview
 * 
 * @param {AbortSignal} [signal] - Optional abort signal for request cancellation
 * @returns {Promise<Object>} Overview data
 */
export const getOverview = async (signal) => {
  const { data } = await http.get('/progress/overview', { signal });
  return data;
};

/**
 * Get user skills
 * 
 * @param {AbortSignal} [signal] - Optional abort signal for request cancellation
 * @returns {Promise<Object>} Skills data: { skills, unlockedSkillIds }
 */
export const getSkills = async (signal) => {
  const { data } = await http.get('/progress/skills', { signal });
  return data;
};

/**
 * Get user milestones
 * 
 * @returns {Promise<Object>} Milestones data: { milestones }
 */
export const getMilestones = async () => {
  return executeWithAuthRetry(async () => {
    try {
      const url = buildUrl('/progress/milestones');
      let response;

      try {
        response = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      } catch (fetchError) {
        handleNetworkError(fetchError, apiBaseUrl);
      }

      const data = await parseResponse(response);
      return data;
    } catch (error) {
      console.error('[progressService] getMilestones failed:', error);
      
      if (error.isNetworkError || error.name === 'NetworkError') {
        throw error;
      }
      
      if (error instanceof Error) {
        if (!error.message) {
          error.message = 'No se pudieron obtener los hitos.';
        }
        throw error;
      }

      throw new Error('No se pudieron obtener los hitos.');
    }
  });
};

/**
 * Get user achievements and medals
 * 
 * @returns {Promise<Object>} Achievements data: { achievements, medals }
 */
export const getAchievements = async () => {
  return executeWithAuthRetry(async () => {
    try {
      const url = buildUrl('/progress/achievements');
      let response;

      try {
        response = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      } catch (fetchError) {
        handleNetworkError(fetchError, apiBaseUrl);
      }

      const data = await parseResponse(response);
      return data;
    } catch (error) {
      console.error('[progressService] getAchievements failed:', error);
      
      if (error.isNetworkError || error.name === 'NetworkError') {
        throw error;
      }
      
      if (error instanceof Error) {
        if (!error.message) {
          error.message = 'No se pudieron obtener los logros.';
        }
        throw error;
      }

      throw new Error('No se pudieron obtener los logros.');
    }
  });
};

/**
 * Get user state
 * 
 * @returns {Promise<Object>} User state: { isAuthenticated, lastActivityAt }
 */
export const getUserState = async () => {
  return executeWithAuthRetry(async () => {
    try {
      const url = buildUrl('/progress/user-state');
      let response;

      try {
        response = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      } catch (fetchError) {
        handleNetworkError(fetchError, apiBaseUrl);
      }

      const data = await parseResponse(response);
      return data;
    } catch (error) {
      console.error('[progressService] getUserState failed:', error);
      
      if (error.isNetworkError || error.name === 'NetworkError') {
        throw error;
      }
      
      if (error instanceof Error) {
        if (!error.message) {
          error.message = 'No se pudo obtener el estado del usuario.';
        }
        throw error;
      }

      throw new Error('No se pudo obtener el estado del usuario.');
    }
  });
};

export default {
  configureProgressService,
  getModuleProgress,
  updateLessonProgress,
  getProgressSummary,
  getOverview,
  getSkills,
  getMilestones,
  getAchievements,
  getUserState,
  // Legacy exports
  fetchProgress,
  upsertProgress,
  bulkSyncProgress,
};

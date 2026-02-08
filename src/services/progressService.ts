/**
 * Progress Service - TypeScript
 * Simplified service for progress tracking with SWR integration
 *
 * BACKEND PAYLOAD CONTRACT (PUT /api/progress/lesson/:lessonId):
 * ============================================================
 * REQUIRED (at least ONE):
 *   - completionPercentage: number (0-100) - preferred format
 *   OR
 *   - currentStep + totalSteps: both numbers - legacy format
 *
 * OPTIONAL:
 *   - timeSpent: number (seconds) - defaults to 0
 *   - scrollPosition: number
 *   - lastViewedSection: string
 *   - completed: boolean - explicit completion flag (NEVER auto-inferred from 100%)
 *
 * NOT SENT (backend derives):
 *   - moduleId: Backend extracts from DB lookup or lessonId pattern
 */

import { http } from './http';
import { mutate } from 'swr';
import { getAuthToken as getAuthTokenFromService } from './authService';
import { SWR_KEYS, getProgressInvalidationMatcher } from '@/lib/swrKeys';
import { curriculumData } from '@/data/curriculumData';

// ============================================
// Token Waiting Utility
// ============================================

/**
 * Wait for auth token to become available (for race condition handling)
 * Returns the token if available within timeout, or null if timeout exceeded
 *
 * Use this before calling updateLessonProgress to ensure token bridge has completed
 */
export async function waitForAuthToken(maxWaitMs = 5000): Promise<string | null> {
  const startTime = Date.now();
  const pollInterval = 100;

  // Check immediately
  let token = getAuthTokenFromService();
  if (token) return token;

  // Poll until token available or timeout
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    token = getAuthTokenFromService();
    if (token) {
      console.log('[progressService] Token became available after', Date.now() - startTime, 'ms');
      return token;
    }
  }

  console.warn('[progressService] waitForAuthToken timed out after', maxWaitMs, 'ms');
  return null;
}

// ============================================
// Type Definitions
// ============================================

export interface UpdateLessonProgressParams {
  completionPercentage: number;
  timeSpent: number; // in seconds
  moduleId?: string; // Used ONLY for cache invalidation, NOT sent to backend
  scrollPosition?: number;
  lastViewedSection?: string;
  currentStep?: number; // Step number (1-based), required by backend
  totalSteps?: number; // Total number of steps, required by backend
}

/**
 * Result type for updateLessonProgress
 * Can be either a successful LessonProgress or a rate-limited result
 */
export type UpdateLessonProgressResult = 
  | { success: true; data: LessonProgress }
  | { success: false; rateLimited: true; retryAfter?: number };

// ============================================
// Curriculum Data Lookup (for validation only)
// ============================================

/**
 * Lookup moduleId from curriculum data given a lessonId.
 * Returns null if not found.
 * This is used ONLY for validation, NOT for sending to backend.
 */
function getModuleIdFromCurriculum(lessonId: string): string | null {
  if (!lessonId || !curriculumData?.modules) return null;

  // Search through all modules and their lessons
  for (const [moduleId, module] of Object.entries(curriculumData.modules)) {
    const moduleData = module as any;
    if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
      for (const lesson of moduleData.lessons) {
        if (lesson.id === lessonId) {
          return moduleId;
        }
      }
    }
  }

  // If not found in curriculum, try to extract from lessonId pattern
  // Pattern: "module-XX-*" -> "module-XX-*" (full module ID)
  // Pattern: anything with "module-" prefix
  const moduleMatch = lessonId.match(/^(module-\d+(?:-[a-z]+)*)/i);
  if (moduleMatch && moduleMatch[1]) {
    return moduleMatch[1];
  }

  return null;
}

/**
 * Validate that a lessonId belongs to the specified moduleId.
 * Throws an error if validation fails.
 * This prevents mismatched lessonId/moduleId pairs from being sent.
 */
function validateLessonModulePair(lessonId: string, providedModuleId?: string): void {
  if (!providedModuleId) return; // No moduleId provided, nothing to validate

  const curriculumModuleId = getModuleIdFromCurriculum(lessonId);

  // If we found a moduleId in curriculum and it doesn't match, warn (but don't throw)
  // The backend will derive the correct moduleId anyway
  if (curriculumModuleId && curriculumModuleId !== providedModuleId) {
    console.warn(
      `[progressService] ⚠️ moduleId mismatch: lessonId "${lessonId}" belongs to ` +
      `"${curriculumModuleId}" but "${providedModuleId}" was provided. ` +
      `Backend will derive the correct moduleId.`
    );
  }
}

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  moduleId: string | null;
  completed: boolean;
  completionPercentage: number;
  progress: number;
  timeSpent: number;
  scrollPosition: number | null;
  lastViewedSection: string | null;
  lastAccess: string | null;
  updatedAt: string;
  currentStep?: number; // Current step number (1-based) from backend
  totalSteps?: number; // Total number of steps from backend
}

export interface ModuleProgress {
  moduleId: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  timeSpent: number;
  lastAccessedAt: string | null;
  isCompleted: boolean;
}

export interface ModuleResumePoint {
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  moduleId: string;
  completionPercentage: number;
  scrollPosition: number | null;
  lastViewedSection: string | null;
}

export interface ModuleWithProgress {
  id: string;
  title: string;
  progress: number;
  completed: boolean;
  totalLessons: number;
  completedLessons: number;
  lastAccessedLesson: {
    id: string;
    title: string;
    progress: number;
  } | null;
  nextLesson: {
    id: string;
    title: string;
    order: number;
  } | null;
  lastAccessed: string | null;
}

export interface UserOverview {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  overview: {
    totalModules: number;
    completedModules: number;
    overallProgress: number;
  };
  modules: ModuleWithProgress[];
}

// ============================================
// Progress Service Functions
// ============================================

/**
 * Get auth token from authService
 */
function getAuthToken(): string | null {
  return getAuthTokenFromService();
}

/**
 * Update lesson progress
 * PUT /api/progress/lesson/:lessonId
 *
 * IMPORTANT: This function sends ONLY the fields expected by the backend.
 * - moduleId is NOT sent (backend derives it from lessonId or DB lookup)
 * - undefined values are NEVER sent
 * - completionPercentage OR currentStep/totalSteps is REQUIRED
 * 
 * SPECIAL HANDLING FOR HTTP 429 (Rate Limited):
 * - Does NOT throw an error for 429 responses
 * - Returns { success: false, rateLimited: true, retryAfter?: number }
 * - This allows the caller to handle rate limiting gracefully without showing errors
 */
export async function updateLessonProgress(
  lessonId: string,
  data: UpdateLessonProgressParams
): Promise<UpdateLessonProgressResult> {
  // ==========================================================================
  // STRICT VALIDATION - Prevent 400 errors from invalid payloads
  // ==========================================================================

  // 1. Validate lessonId is a non-empty string
  if (!lessonId || typeof lessonId !== 'string' || lessonId.trim() === '') {
    console.warn('[progressService] updateLessonProgress ABORTED: lessonId is invalid or empty', { lessonId });
    throw new Error('lessonId is required and must be a non-empty string');
  }

  // 2. Validate data object exists
  if (!data || typeof data !== 'object') {
    console.warn('[progressService] updateLessonProgress ABORTED: data is invalid', { data });
    throw new Error('data object is required');
  }

  // 3. Validate completionPercentage (REQUIRED field)
  if (data.completionPercentage === undefined || data.completionPercentage === null) {
    console.warn('[progressService] updateLessonProgress ABORTED: completionPercentage is required', { lessonId });
    throw new Error('completionPercentage is required');
  }

  if (typeof data.completionPercentage !== 'number' || isNaN(data.completionPercentage)) {
    console.warn('[progressService] updateLessonProgress ABORTED: completionPercentage must be a number', { lessonId, completionPercentage: data.completionPercentage });
    throw new Error('completionPercentage must be a number');
  }

  // Clamp completionPercentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, Math.round(data.completionPercentage)));

  // 4. Validate lessonId/moduleId pair if moduleId was provided (for cache invalidation)
  validateLessonModulePair(lessonId, data.moduleId);

  // ==========================================================================
  // BUILD CLEAN PAYLOAD - Only send fields expected by backend
  // NEVER send undefined values
  // ==========================================================================
  const payload: Record<string, any> = {
    // REQUIRED: completionPercentage (backend format)
    completionPercentage: clampedPercentage,
  };

  // REQUIRED: currentStep and totalSteps (backend now requires these)
  if (typeof data.currentStep === 'number' && data.currentStep > 0 && !isNaN(data.currentStep)) {
    payload.currentStep = Math.floor(data.currentStep);
  }
  if (typeof data.totalSteps === 'number' && data.totalSteps > 0 && !isNaN(data.totalSteps)) {
    payload.totalSteps = Math.floor(data.totalSteps);
  }

  // OPTIONAL: timeSpent (only if valid positive number)
  if (typeof data.timeSpent === 'number' && data.timeSpent > 0 && !isNaN(data.timeSpent)) {
    payload.timeSpent = Math.floor(data.timeSpent); // Ensure integer seconds
  }

  // OPTIONAL: scrollPosition (only if valid number)
  if (typeof data.scrollPosition === 'number' && !isNaN(data.scrollPosition)) {
    payload.scrollPosition = data.scrollPosition;
  }

  // OPTIONAL: lastViewedSection (only if non-empty string)
  if (typeof data.lastViewedSection === 'string' && data.lastViewedSection.trim() !== '') {
    payload.lastViewedSection = data.lastViewedSection.trim();
  }

  // NOTE: moduleId is NOT sent - backend derives it from:
  // 1. DB lookup of the lesson
  // 2. Pattern extraction from lessonId (e.g., "module-01-..." -> "module-01")

  console.log('[progressService] updateLessonProgress: Sending payload', {
    lessonId,
    payload,
    providedModuleId: data.moduleId, // For cache invalidation only
  });

  // ==========================================================================
  // EXECUTE THE UPDATE - HARD FAILURE IF NO AUTH TOKEN
  // ==========================================================================
  const token = getAuthToken();

  // HARD FAILURE: Refuse to send progress update without auth token
  // This ensures PUT request ALWAYS includes Authorization header
  if (!token) {
    const error = new Error(
      '[progressService] HARD FAILURE: Cannot update progress without auth token. ' +
      'Ensure token bridge completes before calling updateLessonProgress.'
    );
    console.error('[progressService] updateLessonProgress BLOCKED:', {
      lessonId,
      reason: 'No auth token available',
      hint: 'Wait for useTokenManager to complete before saving progress',
    });
    throw error;
  }

  const { res, data: responseData } = await http(`/progress/lesson/${lessonId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    authToken: token, // Always included - hard failure above ensures token exists
  });

  // ==========================================================================
  // SPECIAL HANDLING FOR HTTP 429 (Rate Limited)
  // Do NOT treat 429 as a fatal error - return controlled result instead
  // ==========================================================================
  if (res.status === 429) {
    // Extract retry-after header if available (in seconds)
    const retryAfterHeader = res.headers.get('retry-after');
    const retryAfter: number | undefined = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
    
    console.warn('[progressService] Rate limited (429):', {
      lessonId,
      retryAfter,
      message: responseData?.message || 'Too many requests',
    });
    
    // Return rate-limited result instead of throwing
    // Progress is NOT lost - it's saved locally and will retry automatically
    const result: UpdateLessonProgressResult = retryAfter !== undefined
      ? { success: false, rateLimited: true, retryAfter }
      : { success: false, rateLimited: true };
    return result;
  }

  if (!res.ok) {
    const errorMessage = responseData?.message || responseData?.error || 'Error al actualizar progreso';
    console.error('[progressService] updateLessonProgress FAILED:', {
      lessonId,
      status: res.status,
      error: errorMessage,
      payload,
    });
    throw new Error(errorMessage);
  }

  // ==========================================================================
  // CACHE INVALIDATION - Use moduleId for cache keys
  // Determine moduleId: prefer response, then curriculum lookup, then pattern extraction
  // ==========================================================================
  const moduleIdFromResponse = responseData?.moduleId || responseData?.lesson?.moduleId;
  const moduleIdFromCurriculum = getModuleIdFromCurriculum(lessonId);
  const moduleIdFromPattern = lessonId.match(/^(module-\d+)/)?.[1];
  const moduleIdForCache = moduleIdFromResponse || data.moduleId || moduleIdFromCurriculum || moduleIdFromPattern;

  // Invalidate related cache
  await invalidateProgressCache(moduleIdForCache, lessonId);

  // Emit progress:updated event for UI components to refresh
  if (typeof window !== 'undefined') {
    console.log('[progressService] Dispatching progress:updated event', {
      lessonId,
      moduleId: moduleIdForCache,
      completionPercentage: clampedPercentage,
    });
    window.dispatchEvent(new CustomEvent('progress:updated', {
      detail: {
        lessonId,
        moduleId: moduleIdForCache,
        completionPercentage: clampedPercentage,
        // IMPORTANT: Only use explicit completed flag from backend response
        // NEVER infer completion from completionPercentage
        completed: responseData?.completed === true,
      }
    }));
  }

  // Return successful result
  return {
    success: true,
    data: responseData,
  };
}

/**
 * Get lesson progress
 * GET /api/progress/lesson/:lessonId
 */
export async function getLessonProgress(lessonId: string): Promise<LessonProgress | null> {
  const token = getAuthToken();
  
  try {
    const { res, data } = await http(`/progress/lesson/${lessonId}`, {
      method: 'GET',
      ...(token && { authToken: token }),
    });

    if (!res.ok) {
      // Return default progress if not found or error
      if (res.status === 404 || res.status === 401) {
        console.warn(`[progressService] Lesson progress not found for ${lessonId}, using default`);
        return null; // Return null to indicate no progress found
      }
      throw new Error(data?.message || 'Error al obtener progreso');
    }

    // The backend returns the progress object directly (not wrapped)
    // Map server response to client format
    if (data) {
      return {
        id: data.id || '',
        userId: data.userId || '',
        lessonId: data.lessonId || lessonId,
        moduleId: null, // Will be extracted from lessonId if needed
        completed: data.completed || false,
        completionPercentage: data.completionPercentage || 0,
        progress: data.completionPercentage || 0, // Alias for compatibility
        timeSpent: data.timeSpent || 0,
        scrollPosition: data.scrollPosition || null,
        lastViewedSection: data.lastViewedSection || null,
        lastAccess: data.lastAccess ? new Date(data.lastAccess).toISOString() : null,
        updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
        ...(typeof data.currentStep === 'number' && { currentStep: data.currentStep }), // Current step from backend (1-based)
        ...(typeof data.totalSteps === 'number' && { totalSteps: data.totalSteps }), // Total steps from backend
      };
    }

    return null;
  } catch (error) {
    console.error('[progressService] getLessonProgress error:', error);
    // Return null on error - let the caller handle missing progress
    return null;
  }
}

/**
 * Get module progress
 * GET /api/progress/module/:moduleId (note: singular "module", not "modules")
 */
export async function getModuleProgress(moduleId: string): Promise<ModuleProgress> {
  const token = getAuthToken();

  const { res, data } = await http(`/progress/module/${moduleId}`, {
    method: 'GET',
    ...(token && { authToken: token }),
  });

  if (!res.ok) {
    const errorMessage = data?.message || data?.error || 'Error al obtener progreso del módulo';
    throw new Error(errorMessage);
  }

  // Backend returns moduleProgress directly with these fields:
  // { moduleId, completionPercentage, completedLessons, totalLessons, totalTimeSpent, lastAccess, lessons }
  return {
    moduleId: data?.moduleId || moduleId,
    progress: data?.completionPercentage || 0,
    completedLessons: data?.completedLessons || 0,
    totalLessons: data?.totalLessons || 0,
    timeSpent: data?.totalTimeSpent || 0,
    lastAccessedAt: data?.lastAccess || null,
    // Module is completed ONLY when ALL lessons are completed
    // Check if completedLessons === totalLessons instead of inferring from completionPercentage
    isCompleted: (data?.completedLessons || 0) >= (data?.totalLessons || 0) && (data?.totalLessons || 0) > 0,
  };
}

/**
 * Get module resume point (first incomplete lesson)
 * GET /api/modules/:moduleId/resume (note: uses /modules route, not /progress)
 */
export async function getModuleResumePoint(moduleId: string): Promise<ModuleResumePoint | null> {
  const token = getAuthToken();

  try {
    const { res, data } = await http(`/modules/${moduleId}/resume`, {
      method: 'GET',
      ...(token && { authToken: token }),
    });

    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      throw new Error(data?.message || 'Error al obtener punto de reanudación');
    }

    // Backend returns: { resumeLessonId, resumeLessonTitle, resumeLessonProgress, resumeLessonOrder, moduleProgress, totalLessons, completedLessons, nextLessonOrder }
    // Map to expected ModuleResumePoint format
    const resumeData = data?.data || data;
    return {
      lessonId: resumeData?.resumeLessonId || '',
      lessonTitle: resumeData?.resumeLessonTitle || '',
      lessonOrder: resumeData?.resumeLessonOrder || 0,
      moduleId: moduleId,
      completionPercentage: resumeData?.resumeLessonProgress || 0,
      scrollPosition: null, // Not provided by backend
      lastViewedSection: null, // Not provided by backend
    };
  } catch (error) {
    console.error('[progressService] getModuleResumePoint error:', error);
    return null;
  }
}

/**
 * Get user overview (all progress)
 * GET /api/progress/overview
 */
export async function getUserOverview(): Promise<UserOverview> {
  const token = getAuthToken();
  
  const { res, data } = await http('/progress/overview', {
    method: 'GET',
    ...(token && { authToken: token }),
  });

  if (!res.ok) {
    const errorMessage = data?.message || data?.error || 'Error al obtener resumen de progreso';
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Invalidate progress cache (for SWR)
 * Call this after updating progress to refresh cached data
 */
export async function invalidateProgressCache(moduleId?: string, lessonId?: string): Promise<void> {
  try {
    // Invalidate overview (legacy and new keys)
    await mutate('/progress/overview');
    await mutate(SWR_KEYS.userOverview);

    // Invalidate specific module if provided (using correct paths)
    if (moduleId) {
      await mutate(`/progress/module/${moduleId}`); // Correct path (singular)
      await mutate(`/modules/${moduleId}/resume`); // Resume is under /modules
      await mutate(SWR_KEYS.moduleProgress(moduleId));
      await mutate(SWR_KEYS.moduleLessonsProgress(moduleId));
    }

    // Invalidate specific lesson if provided
    if (lessonId) {
      await mutate(SWR_KEYS.lessonProgress(lessonId));
    }

    // Invalidate all progress
    await mutate(SWR_KEYS.allProgress);

    // Invalidate all progress-related keys using the centralized matcher
    await mutate(getProgressInvalidationMatcher(), undefined, { revalidate: true });

    // Also invalidate legacy keys
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/progress'),
      undefined,
      { revalidate: true }
    );
  } catch (error) {
    console.error('[progressService] invalidateProgressCache error:', error);
  }
}

/**
 * SWR fetcher function for use with useSWR hook
 * Example: const { data } = useSWR('/progress/overview', progressFetcher)
 */
export async function progressFetcher(path: string): Promise<any> {
  const token = getAuthToken();
  
  const { res, data } = await http(path, {
    method: 'GET',
    ...(token && { authToken: token }),
  });

  if (!res.ok) {
    const error = new Error(data?.message || 'Error al obtener datos');
    (error as any).status = res.status;
    throw error;
  }

  return data;
}

// ============================================
// Export all functions as default
// ============================================

export default {
  updateLessonProgress,
  getLessonProgress,
  getModuleProgress,
  getModuleResumePoint,
  getUserOverview,
  invalidateProgressCache,
  progressFetcher,
};

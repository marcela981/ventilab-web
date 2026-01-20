/**
 * Progress Service - TypeScript
 * Simplified service for progress tracking with SWR integration
 */

import { http } from './http';
import { mutate } from 'swr';
import { getAuthToken as getAuthTokenFromService } from './authService';
import { SWR_KEYS, getProgressInvalidationMatcher } from '@/lib/swrKeys';

// ============================================
// Type Definitions
// ============================================

export interface UpdateLessonProgressParams {
  completionPercentage: number;
  timeSpent: number; // in seconds
  moduleId?: string; // Optional module ID
  scrollPosition?: number;
  lastViewedSection?: string;
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
 */
export async function updateLessonProgress(
  lessonId: string,
  data: UpdateLessonProgressParams
): Promise<LessonProgress> {
  const token = getAuthToken();

  const { res, data: responseData } = await http(`/progress/lesson/${lessonId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    authToken: token || undefined,
  });

  if (!res.ok) {
    const errorMessage = responseData?.message || responseData?.error || 'Error al actualizar progreso';
    throw new Error(errorMessage);
  }

  // Extract moduleId from lessonId (format: "module-XX-lesson-name")
  const moduleIdMatch = lessonId.match(/^(module-\d+)/);
  const moduleId = moduleIdMatch ? moduleIdMatch[1] : responseData?.lesson?.moduleId;

  // Invalidate related cache
  await invalidateProgressCache(moduleId, lessonId);

  // Emit progress:updated event for UI components to refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('progress:updated', {
      detail: {
        lessonId,
        moduleId,
        completionPercentage: data.completionPercentage,
        completed: responseData?.completed || data.completionPercentage >= 100,
      }
    }));
  }

  return responseData;
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
      authToken: token || undefined,
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
    authToken: token || undefined,
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
    isCompleted: (data?.completionPercentage || 0) >= 100,
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
      authToken: token || undefined,
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
    authToken: token || undefined,
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
    authToken: token || undefined,
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

/**
 * Progress Service - TypeScript
 * Simplified service for progress tracking with SWR integration
 */

import { http } from './http';
import { mutate } from 'swr';
import { getAuthToken as getAuthTokenFromService } from './authService';

// ============================================
// Type Definitions
// ============================================

export interface UpdateLessonProgressParams {
  completionPercentage: number;
  timeSpent: number; // in seconds
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

  // Invalidate related cache
  await invalidateProgressCache(responseData?.lesson?.moduleId);

  return responseData;
}

/**
 * Get lesson progress
 * GET /api/progress/lesson/:lessonId
 */
export async function getLessonProgress(lessonId: string): Promise<LessonProgress | null> {
  const token = getAuthToken();
  
  try {
    const { res, data } = await http(`/progress/lessons/${lessonId}`, {
      method: 'GET',
      authToken: token || undefined,
    });

    if (!res.ok) {
      // Return default progress if not found or error
      if (res.status === 404 || res.status === 401) {
        console.warn(`[progressService] Lesson progress not found for ${lessonId}, using default`);
        return {
          completed: false,
          progress: 0,
          progressPercentage: 0,
          lastAccessed: null,
          completedAt: null,
          scrollPosition: 0,
          lastViewedSection: null,
          timeSpent: 0,
        };
      }
      throw new Error(data?.message || 'Error al obtener progreso');
    }

    // The backend returns { lesson, progress, quizAttempts }
    // We need the progress object
    return data?.progress || {
      completed: false,
      progress: 0,
      progressPercentage: 0,
      lastAccessed: null,
      completedAt: null,
      scrollPosition: 0,
      lastViewedSection: null,
      timeSpent: 0,
    };
  } catch (error) {
    console.error('[progressService] getLessonProgress error:', error);
    // Return default progress on error
    return {
      completed: false,
      progress: 0,
      progressPercentage: 0,
      lastAccessed: null,
      completedAt: null,
      scrollPosition: 0,
      lastViewedSection: null,
      timeSpent: 0,
    };
  }
}

/**
 * Get module progress
 * GET /api/progress/modules/:moduleId
 */
export async function getModuleProgress(moduleId: string): Promise<ModuleProgress> {
  const token = getAuthToken();
  
  const { res, data } = await http(`/progress/modules/${moduleId}`, {
    method: 'GET',
    authToken: token || undefined,
  });

  if (!res.ok) {
    const errorMessage = data?.message || data?.error || 'Error al obtener progreso del módulo';
    throw new Error(errorMessage);
  }

  return data?.progress || {
    moduleId,
    progress: 0,
    completedLessons: 0,
    totalLessons: 0,
    timeSpent: 0,
    lastAccessedAt: null,
    isCompleted: false,
  };
}

/**
 * Get module resume point (first incomplete lesson)
 * GET /api/progress/modules/:moduleId/resume
 */
export async function getModuleResumePoint(moduleId: string): Promise<ModuleResumePoint | null> {
  const token = getAuthToken();
  
  try {
    const { res, data } = await http(`/progress/modules/${moduleId}/resume`, {
      method: 'GET',
      authToken: token || undefined,
    });

    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      throw new Error(data?.message || 'Error al obtener punto de reanudación');
    }

    return data;
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
export async function invalidateProgressCache(moduleId?: string): Promise<void> {
  try {
    // Invalidate overview
    await mutate('/progress/overview');

    // Invalidate specific module if provided
    if (moduleId) {
      await mutate(`/progress/modules/${moduleId}`);
      await mutate(`/progress/modules/${moduleId}/resume`);
    }

    // Invalidate all progress-related keys
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

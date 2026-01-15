/**
 * React hooks for progress tracking with SWR
 */

import useSWR, { mutate } from 'swr';
import {
  progressFetcher,
  updateLessonProgress as updateLessonProgressAPI,
  getUserOverview,
  getModuleProgress,
  getModuleResumePoint,
  getLessonProgress,
  invalidateProgressCache,
  type UserOverview,
  type ModuleProgress,
  type ModuleResumePoint,
  type LessonProgress,
  type UpdateLessonProgressParams,
} from '@/services/progressService';

// ============================================
// Progress Hooks
// ============================================

/**
 * Hook to fetch user progress overview
 */
export function useUserOverview() {
  const { data, error, isLoading, mutate: revalidate } = useSWR<UserOverview>(
    '/progress/overview',
    progressFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    overview: data,
    isLoading,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch module progress
 */
export function useModuleProgress(moduleId: string | null | undefined) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<ModuleProgress>(
    moduleId ? `/progress/modules/${moduleId}` : null,
    progressFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    progress: data,
    isLoading,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch module resume point
 */
export function useModuleResumePoint(moduleId: string | null | undefined) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<ModuleResumePoint>(
    moduleId ? `/progress/modules/${moduleId}/resume` : null,
    progressFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    resumePoint: data,
    isLoading,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch lesson progress
 */
export function useLessonProgress(lessonId: string | null | undefined) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<LessonProgress>(
    lessonId ? `/progress/lessons/${lessonId}` : null,
    progressFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    progress: data,
    isLoading,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to update lesson progress with optimistic updates
 */
export function useUpdateLessonProgress() {
  async function updateProgress(
    lessonId: string,
    data: UpdateLessonProgressParams,
    moduleId?: string
  ) {
    try {
      // Optimistically update the cache
      if (moduleId) {
        mutate(
          `/progress/modules/${moduleId}`,
          async (currentData: ModuleProgress | undefined) => {
            if (!currentData) return currentData;
            
            // Optimistically update progress
            return {
              ...currentData,
              progress: Math.max(currentData.progress, data.completionPercentage),
            };
          },
          false // Don't revalidate yet
        );
      }

      // Make the API call
      const result = await updateLessonProgressAPI(lessonId, data);

      // Revalidate all related data
      await invalidateProgressCache(moduleId);

      return { success: true, data: result };
    } catch (error: any) {
      console.error('[useUpdateLessonProgress] error:', error);
      
      // Revert optimistic update on error
      if (moduleId) {
        mutate(`/progress/modules/${moduleId}`);
      }

      return {
        success: false,
        error: error.message || 'Error al actualizar progreso',
      };
    }
  }

  return { updateProgress };
}

// ============================================
// Export all hooks
// ============================================

export default {
  useUserOverview,
  useModuleProgress,
  useModuleResumePoint,
  useLessonProgress,
  useUpdateLessonProgress,
};

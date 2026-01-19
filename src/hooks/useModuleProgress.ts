/**
 * useModuleProgress Hook
 *
 * Fetches and manages module progress data using SWR
 * Displays progress for module cards and dashboards
 */

import useSWR from 'swr';
import { getModuleProgress, type ModuleProgress } from '@/services/progressService';
import { SWR_KEYS } from '@/lib/swrKeys';

// ============================================
// Type Definitions
// ============================================

export type ModuleState = 'not-started' | 'in-progress' | 'completed';

interface UseModuleProgressOptions {
  moduleId: string | null | undefined;
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
}

interface UseModuleProgressReturn {
  moduleProgress: ModuleProgress | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  mutate: () => void;
  moduleState: ModuleState;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Determine module state based on progress
 */
export function getModuleState(progress: ModuleProgress | null): ModuleState {
  if (!progress) {
    return 'not-started';
  }

  if (progress.isCompleted || progress.progress >= 100) {
    return 'completed';
  }

  if (progress.progress > 0) {
    return 'in-progress';
  }

  return 'not-started';
}

/**
 * Get state color for UI
 */
export function getModuleStateColor(state: ModuleState): string {
  switch (state) {
    case 'completed':
      return 'green';
    case 'in-progress':
      return 'blue';
    case 'not-started':
      return 'gray';
    default:
      return 'gray';
  }
}

/**
 * Get state label for UI
 */
export function getModuleStateLabel(state: ModuleState): string {
  switch (state) {
    case 'completed':
      return 'Completado';
    case 'in-progress':
      return 'En progreso';
    case 'not-started':
      return 'Sin comenzar';
    default:
      return 'Sin comenzar';
  }
}

/**
 * Calculate progress percentage text
 */
export function getProgressText(progress: ModuleProgress | null): string {
  if (!progress) return '0%';
  return `${Math.round(progress.progress)}%`;
}

/**
 * Calculate lessons completion text
 */
export function getLessonsCompletionText(progress: ModuleProgress | null): string {
  if (!progress) return '0 / 0';
  return `${progress.completedLessons} / ${progress.totalLessons}`;
}

/**
 * Calculate estimated time remaining (in minutes)
 */
export function getEstimatedTimeRemaining(
  progress: ModuleProgress | null,
  estimatedTotalTime?: number
): number {
  if (!progress || !estimatedTotalTime) return 0;
  
  const progressFraction = progress.progress / 100;
  const timeRemaining = estimatedTotalTime * (1 - progressFraction);
  
  return Math.max(0, Math.round(timeRemaining));
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Fetches module progress with SWR
 */
export function useModuleProgress({
  moduleId,
  refreshInterval = 0,
  revalidateOnFocus = true,
}: UseModuleProgressOptions): UseModuleProgressReturn {
  // SWR fetcher function
  const fetcher = async (id: string) => {
    return await getModuleProgress(id);
  };

  // Use SWR for data fetching with centralized key
  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR<ModuleProgress, Error>(
    moduleId ? SWR_KEYS.moduleProgress(moduleId) : null,
    () => (moduleId ? fetcher(moduleId) : null),
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Retry on error
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  // Calculate module state
  const moduleState = getModuleState(data || null);

  return {
    moduleProgress: data || null,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate,
    moduleState,
  };
}

// ============================================
// Batch Hook for Multiple Modules
// ============================================

/**
 * Fetches progress for multiple modules at once
 * Useful for dashboards showing multiple module cards
 */
export function useMultipleModulesProgress(moduleIds: string[]) {
  const results = moduleIds.map((moduleId) =>
    useModuleProgress({ moduleId })
  );

  const isLoading = results.some((r) => r.isLoading);
  const hasError = results.some((r) => r.isError);

  return {
    results,
    isLoading,
    hasError,
    mutateAll: () => {
      results.forEach((r) => r.mutate());
    },
  };
}

// ============================================
// Progress Comparison Hook
// ============================================

/**
 * Compare progress between two modules
 * Useful for progress tracking and analytics
 */
export function useProgressComparison(moduleId1: string, moduleId2: string) {
  const module1 = useModuleProgress({ moduleId: moduleId1 });
  const module2 = useModuleProgress({ moduleId: moduleId2 });

  const comparison = {
    module1Progress: module1.moduleProgress?.progress || 0,
    module2Progress: module2.moduleProgress?.progress || 0,
    difference: (module1.moduleProgress?.progress || 0) - (module2.moduleProgress?.progress || 0),
    ahead: function () {
      if (this.difference > 0) return 'module1';
      if (this.difference < 0) return 'module2';
      return 'equal';
    },
  };

  return {
    module1,
    module2,
    comparison,
    isLoading: module1.isLoading || module2.isLoading,
  };
}

// ============================================
// Export all
// ============================================

export default useModuleProgress;

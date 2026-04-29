/**
 * =============================================================================
 * VentyLab — useProgress (single source of truth)
 * =============================================================================
 *
 * SWR-backed hook that owns the dashboard's view of educational progress.
 *
 * Contract:
 *   - DB → API → hook → UI. No localStorage / sessionStorage anywhere in
 *     this path. Clearing browser storage MUST NOT erase progress.
 *   - Components read `modules[]` and look up the row they care about by
 *     `moduleId` via `getModuleProgress(moduleId)`.
 *   - On lesson completion, `completeLesson()` POSTs to the backend (which
 *     triggers the Prisma upsert) and revalidates the SWR cache so every
 *     `ModuleCard` rerenders with the authoritative DB state.
 *
 * Module: src/features/ensenanza/shared/progreso/hooks/useProgress.ts
 * =============================================================================
 */

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import {
  fetchProgressOverview,
  markLessonComplete,
  PROGRESS_OVERVIEW_KEY,
} from '../api/progress.api';
import type {
  CompleteLessonInput,
  ProgressOverviewDTO,
  ProgressOverviewModuleDTO,
} from '../types/progress.types';

const EMPTY_DTO: ProgressOverviewDTO = { modules: [] };

export interface UseProgressReturn {
  modules: ProgressOverviewModuleDTO[];
  isLoading: boolean;
  error: Error | undefined;
  /** Look up a single module's progress (returns null if absent). */
  getModuleProgress: (moduleId: string) => ProgressOverviewModuleDTO | null;
  /** Force-refetch the overview from the backend. */
  refresh: () => Promise<ProgressOverviewDTO | undefined>;
  /** Mark a lesson complete and revalidate the overview. */
  completeLesson: (input: CompleteLessonInput) => Promise<void>;
}

export function useProgress(): UseProgressReturn {
  const { data, error, isLoading, mutate } = useSWR<ProgressOverviewDTO>(
    PROGRESS_OVERVIEW_KEY,
    ({ signal }: { signal?: AbortSignal } = {}) => fetchProgressOverview(signal),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      keepPreviousData: true,
    },
  );

  const modules = data?.modules ?? EMPTY_DTO.modules;

  const moduleIndex = useMemo(() => {
    const map = new Map<string, ProgressOverviewModuleDTO>();
    for (const m of modules) map.set(m.moduleId, m);
    return map;
  }, [modules]);

  const getModuleProgress = useCallback(
    (moduleId: string): ProgressOverviewModuleDTO | null => {
      if (!moduleId) return null;
      return moduleIndex.get(moduleId) ?? null;
    },
    [moduleIndex],
  );

  const refresh = useCallback(() => mutate(), [mutate]);

  const completeLesson = useCallback(
    async (input: CompleteLessonInput) => {
      await markLessonComplete(input);
      await mutate();
    },
    [mutate],
  );

  return {
    modules,
    isLoading,
    error: error as Error | undefined,
    getModuleProgress,
    refresh,
    completeLesson,
  };
}

export default useProgress;

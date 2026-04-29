/**
 * useLevelsCurriculum
 *
 * Fetches the full level + module hierarchy from the backend
 * (GET /api/levels/curriculum — passed as `/levels/curriculum` since the
 * shared axios instance already sets baseURL to `${BACKEND_URL}/api`)
 * instead of reading from static JSON files.
 *
 * Returns levels shaped for LevelStepper:
 *   { id (slug), title, description, color, emoji, order,
 *     modules[], totalModules, completedModules, progressPercentage }
 *
 * Also exposes `getModulesByLevel(levelSlug)` so components that used the
 * old static getModulesByLevel() from curriculum/index.js can be migrated
 * without changing their call-sites.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { get } from '@/shared/services/api/http';

export function useLevelsCurriculum() {
  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLevels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await get('/levels/curriculum');
        if (!cancelled) {
          // `data` may be the raw array or wrapped in { data: [...] }
          const levelsArray = Array.isArray(data) ? data : (data?.data ?? []);
          setLevels(levelsArray);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useLevelsCurriculum] Error fetching levels:', err);
          setError(err?.message ?? 'Error al cargar los niveles');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchLevels();
    return () => { cancelled = true; };
  }, []);

  // Modules by level slug — replaces static getModulesByLevel() from curriculum/index.js.
  const modulesBySlug = useMemo(() => {
    const map = {};
    for (const level of levels) {
      map[level.id] = level.modules ?? [];
    }
    return map;
  }, [levels]);

  const getModulesByLevel = useCallback(
    (levelSlug) => modulesBySlug[levelSlug] ?? [],
    [modulesBySlug]
  );

  /**
   * levelProgress shape consumed by LevelStepper:
   *   { [levelSlug]: { percentage, completed, total, totalModules } }
   *
   * Source of truth: progressPercentage / completedModules / totalModules
   * returned by GET /api/levels/curriculum (computed from UserProgress in backend).
   */
  const levelProgress = useMemo(() => {
    const result = {};
    for (const level of levels) {
      result[level.id] = {
        percentage: level.progressPercentage ?? 0,
        completed: level.completedModules ?? 0,
        total: level.totalModules ?? 0,
        totalModules: level.totalModules ?? 0,
        isCompleted: level.isCompleted ?? false,
        isUnlocked: level.isUnlocked ?? true,
      };
    }
    return result;
  }, [levels]);

  return { levels, getModulesByLevel, levelProgress, isLoading, error };
}

export default useLevelsCurriculum;

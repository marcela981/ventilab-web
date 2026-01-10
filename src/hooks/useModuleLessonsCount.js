/**
 * =============================================================================
 * useModuleLessonsCount Hook
 * =============================================================================
 * Hook para obtener el conteo real de lecciones por módulo desde la BD
 * =============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * API Base URL - Backend API
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Helper function to make authenticated API requests
 */
async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Cache para almacenar conteos de lecciones por módulo
 * Evita múltiples requests para el mismo módulo
 */
const lessonsCountCache = new Map();

/**
 * Hook para obtener el conteo de lecciones de un módulo desde la BD
 * 
 * @param {string} moduleId - ID del módulo
 * @returns {Object} { count, loading, error, refetch }
 */
export function useModuleLessonsCount(moduleId) {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCount = useCallback(async () => {
    if (!moduleId) {
      setCount(0);
      setLoading(false);
      return;
    }

    // Check cache first
    if (lessonsCountCache.has(moduleId)) {
      setCount(lessonsCountCache.get(moduleId));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch module with lesson count
      const response = await fetchWithAuth(`${API_BASE_URL}/modules/${moduleId}`);
      const module = response.data || response.module || response;

      // Get lesson count from _count or lessons array
      const lessonCount = module._count?.lessons || 
                         (Array.isArray(module.lessons) ? module.lessons.length : 0);

      // Cache the result
      lessonsCountCache.set(moduleId, lessonCount);
      setCount(lessonCount);
    } catch (err) {
      console.error(`[useModuleLessonsCount] Error fetching lesson count for module ${moduleId}:`, err);
      setError(err.message || 'Error al obtener conteo de lecciones');
      setCount(0); // Default to 0 on error
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    count: count ?? 0,
    loading,
    error,
    refetch: fetchCount,
  };
}

/**
 * Hook para obtener conteos de múltiples módulos a la vez
 * 
 * @param {string[]} moduleIds - Array de IDs de módulos
 * @returns {Object} { counts, loading, error, refetch }
 */
export function useModulesLessonsCount(moduleIds = []) {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCounts = useCallback(async () => {
    if (!moduleIds || moduleIds.length === 0) {
      setCounts({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Filter out modules already in cache
      const uncachedIds = moduleIds.filter(id => !lessonsCountCache.has(id));
      
      // Fetch uncached modules in parallel
      const fetchPromises = uncachedIds.map(async (moduleId) => {
        try {
          const response = await fetchWithAuth(`${API_BASE_URL}/modules/${moduleId}`);
          const module = response.data || response.module || response;
          const lessonCount = module._count?.lessons || 
                             (Array.isArray(module.lessons) ? module.lessons.length : 0);
          lessonsCountCache.set(moduleId, lessonCount);
          return { moduleId, count: lessonCount };
        } catch (err) {
          console.error(`[useModulesLessonsCount] Error fetching count for module ${moduleId}:`, err);
          return { moduleId, count: 0 };
        }
      });

      const results = await Promise.all(fetchPromises);
      
      // Build counts object from cache and results
      const countsMap = {};
      moduleIds.forEach(id => {
        countsMap[id] = lessonsCountCache.get(id) || 0;
      });

      setCounts(countsMap);
    } catch (err) {
      console.error('[useModulesLessonsCount] Error fetching lesson counts:', err);
      setError(err.message || 'Error al obtener conteos de lecciones');
      // Set all to 0 on error
      const countsMap = {};
      moduleIds.forEach(id => {
        countsMap[id] = 0;
      });
      setCounts(countsMap);
    } finally {
      setLoading(false);
    }
  }, [moduleIds]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return {
    counts,
    loading,
    error,
    refetch: fetchCounts,
  };
}

/**
 * Clear cache (useful for testing or when data changes)
 */
export function clearLessonsCountCache() {
  lessonsCountCache.clear();
}

export default useModuleLessonsCount;


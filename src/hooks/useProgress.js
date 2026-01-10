/**
 * =============================================================================
 * useProgress Hook
 * =============================================================================
 * Custom hook for managing user learning progress
 * Handles fetching progress data, updating lesson progress, and provides
 * statistics with automatic debouncing for timeSpent updates
 * =============================================================================
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNotification } from '../contexts/NotificationContext';

/**
 * API Base URL - Uses Next.js App Router API route
 */
const API_BASE_URL = '/api/progress';

/**
 * Debounce delay for timeSpent updates (in milliseconds)
 * Updates are batched and sent every 30-60 seconds
 */
const TIMESPENT_DEBOUNCE_DELAY = 45000; // 45 seconds

/**
 * Helper function to make authenticated API requests
 * Uses NextAuth session cookies automatically
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If request fails
 */
async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for NextAuth session
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Custom hook for managing user progress
 * 
 * Provides access to:
 * - User's progress records (lessons and modules)
 * - Statistics (total lessons, completed lessons, modules, average score)
 * - Functions to update progress and refresh data
 * - Automatic debouncing for timeSpent updates
 * 
 * @returns {Object} Progress data and functions
 * @returns {Array} progress - Array of progress records
 * @returns {Object} stats - Statistics object
 * @returns {number} stats.totalLessons - Total number of lessons
 * @returns {number} stats.completedLessons - Number of completed lessons
 * @returns {number} stats.totalModules - Total number of modules
 * @returns {number} stats.completedModules - Number of completed modules
 * @returns {number|null} stats.averageScore - Average score (0-100) or null
 * @returns {boolean} loading - Loading state
 * @returns {string|null} error - Error message if any
 * @returns {Function} fetchProgress - Fetch progress data
 * @returns {Function} updateProgress - Update lesson progress
 * @returns {Function} refetch - Alias for fetchProgress
 * 
 * @example
 * function ProgressPage() {
 *   const {
 *     progress,
 *     stats,
 *     loading,
 *     error,
 *     updateProgress
 *   } = useProgress();
 * 
 *   if (loading) return <Loading />;
 *   if (error) return <Error message={error} />;
 * 
 *   return (
 *     <div>
 *       <h1>My Progress</h1>
 *       <p>Completed: {stats.completedLessons} / {stats.totalLessons} lessons</p>
 *       <p>Average Score: {stats.averageScore || 'N/A'}</p>
 *       
 *       <button onClick={() => updateProgress({
 *         lessonId: 'lesson-123',
 *         completed: true,
 *         score: 85
 *       })}>
 *         Mark Lesson Complete
 *       </button>
 *     </div>
 *   );
 * }
 */
export default function useProgress() {
  // State management
  const [progress, setProgress] = useState([]);
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    totalModules: 0,
    completedModules: 0,
    averageScore: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Notification hook
  const { showSuccess, showError: showErrorNotification } = useNotification();

  // Refs for debouncing timeSpent updates
  const timeSpentDebounceRef = useRef(null);
  const pendingTimeSpentUpdatesRef = useRef(new Map()); // Map<lessonId, { timeSpent, lastUpdate }>

  /**
   * Fetch user progress and statistics
   * Makes GET request to /api/progress
   */
  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(API_BASE_URL);

      // Handle response structure: { progress, stats }
      const progressData = response.progress || [];
      const statsData = response.stats || {
        totalLessons: 0,
        completedLessons: 0,
        totalModules: 0,
        completedModules: 0,
        averageScore: null,
      };

      setProgress(Array.isArray(progressData) ? progressData : []);
      setStats(statsData);

      console.log(`[useProgress] Fetched ${progressData.length} progress records`);
    } catch (err) {
      console.error('[useProgress] Error fetching progress:', err);
      const errorMessage = err.message || 'Error al cargar el progreso';
      setError(errorMessage);
      showErrorNotification(errorMessage);
      setProgress([]);
      setStats({
        totalLessons: 0,
        completedLessons: 0,
        totalModules: 0,
        completedModules: 0,
        averageScore: null,
      });
    } finally {
      setLoading(false);
    }
  }, [showErrorNotification]);

  /**
   * Flush pending timeSpent updates
   * Sends all accumulated timeSpent updates to the server
   */
  const flushTimeSpentUpdates = useCallback(async () => {
    const pendingUpdates = pendingTimeSpentUpdatesRef.current;
    
    if (pendingUpdates.size === 0) {
      return;
    }

    // Process all pending updates
    const updates = Array.from(pendingUpdates.entries()).map(([lessonId, data]) => ({
      lessonId,
      timeSpent: data.timeSpent,
    }));

    // Clear pending updates before sending (to avoid duplicates if flush is called multiple times)
    pendingTimeSpentUpdatesRef.current.clear();

    // Send updates individually to maintain consistency
    const updatePromises = updates.map(({ lessonId, timeSpent }) =>
      fetchWithAuth(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify({
          lessonId,
          completed: false, // Don't change completion status
          timeSpent,
        }),
      }).catch(err => {
        console.error(`[useProgress] Failed to update timeSpent for lesson ${lessonId}:`, err);
        // Re-add to pending if it failed (for retry on next flush)
        pendingTimeSpentUpdatesRef.current.set(lessonId, {
          timeSpent,
          lastUpdate: Date.now(),
        });
        throw err; // Re-throw to be caught by Promise.allSettled
      })
    );

    await Promise.allSettled(updatePromises);
    
    // Silently refresh progress after updates (don't show loading/error states)
    // This is a background update - use a separate silent fetch
    try {
      const response = await fetchWithAuth(API_BASE_URL);
      const progressData = response.progress || [];
      const statsData = response.stats || {
        totalLessons: 0,
        completedLessons: 0,
        totalModules: 0,
        completedModules: 0,
        averageScore: null,
      };
      setProgress(Array.isArray(progressData) ? progressData : []);
      setStats(statsData);
    } catch (err) {
      // Silently fail - we'll refresh on next manual fetch
      console.warn('[useProgress] Failed to refresh after timeSpent update:', err);
    }
  }, []);

  /**
   * Update lesson progress
   * Handles immediate updates (completed, score) and debounced updates (timeSpent)
   * 
   * @param {Object} updateData - Update data
   * @param {string} updateData.lessonId - Lesson ID (required)
   * @param {boolean} updateData.completed - Completion status (required)
   * @param {number} [updateData.score] - Optional score (0-100)
   * @param {number} [updateData.timeSpent] - Optional time spent in minutes (will be debounced)
   */
  const updateProgress = useCallback(async (updateData) => {
    const { lessonId, completed, score, timeSpent } = updateData;

    // Validate required fields
    if (!lessonId || typeof completed !== 'boolean') {
      const errorMsg = 'lessonId y completed son requeridos';
      setError(errorMsg);
      showErrorNotification(errorMsg);
      return;
    }

    try {
      // If only timeSpent is provided and completed is false, use debouncing
      if (timeSpent !== undefined && completed === false && score === undefined) {
        // Accumulate timeSpent updates (additive)
        const existing = pendingTimeSpentUpdatesRef.current.get(lessonId);
        const accumulatedTimeSpent = existing
          ? existing.timeSpent + timeSpent
          : timeSpent;

        pendingTimeSpentUpdatesRef.current.set(lessonId, {
          timeSpent: accumulatedTimeSpent,
          lastUpdate: Date.now(),
        });

        // Clear existing debounce timer
        if (timeSpentDebounceRef.current) {
          clearTimeout(timeSpentDebounceRef.current);
        }

        // Set new debounce timer
        timeSpentDebounceRef.current = setTimeout(() => {
          flushTimeSpentUpdates();
          timeSpentDebounceRef.current = null;
        }, TIMESPENT_DEBOUNCE_DELAY);

        // Don't send immediate request for timeSpent-only updates
        return;
      }

      // For completed/score updates, send immediately
      // Also flush any pending timeSpent updates for this lesson
      const pendingTimeSpent = pendingTimeSpentUpdatesRef.current.get(lessonId);
      const finalTimeSpent = pendingTimeSpent
        ? pendingTimeSpent.timeSpent + (timeSpent || 0)
        : timeSpent;

      // Clear pending update for this lesson
      if (pendingTimeSpent) {
        pendingTimeSpentUpdatesRef.current.delete(lessonId);
      }

      // Clear debounce timer if no more pending updates
      if (pendingTimeSpentUpdatesRef.current.size === 0 && timeSpentDebounceRef.current) {
        clearTimeout(timeSpentDebounceRef.current);
        timeSpentDebounceRef.current = null;
      }

      // Send update request
      const response = await fetchWithAuth(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify({
          lessonId,
          completed,
          score: score !== undefined ? score : undefined,
          timeSpent: finalTimeSpent !== undefined ? finalTimeSpent : undefined,
        }),
      });

      // Refresh progress after update
      await fetchProgress();

      // Show success notification for completion
      if (completed) {
        showSuccess('Progreso actualizado correctamente');
      }
    } catch (err) {
      console.error('[useProgress] Error updating progress:', err);
      const errorMessage = err.message || 'Error al actualizar el progreso';
      setError(errorMessage);
      showErrorNotification(errorMessage);
    }
  }, [fetchProgress, flushTimeSpentUpdates, showSuccess, showErrorNotification]);

  /**
   * Auto-fetch progress on mount
   */
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  /**
   * Cleanup: Flush pending updates and clear timers on unmount
   */
  useEffect(() => {
    return () => {
      // Clear debounce timer
      if (timeSpentDebounceRef.current) {
        clearTimeout(timeSpentDebounceRef.current);
      }

      // Flush any remaining pending updates
      if (pendingTimeSpentUpdatesRef.current.size > 0) {
        // Use navigator.sendBeacon for final flush if available
        // Otherwise, just clear the pending updates
        pendingTimeSpentUpdatesRef.current.clear();
      }
    };
  }, []);

  // Return all data and functions
  return {
    // Raw data
    progress,
    stats,

    // Loading states
    loading,
    error,

    // Functions
    fetchProgress,
    updateProgress,
    refetch: fetchProgress, // Alias for convenience
  };
}

/**
 * Helper hook to get progress for a specific lesson
 * @param {string} lessonId - Lesson ID
 * @returns {Object|null} Progress record or null if not found
 * 
 * @example
 * const lessonProgress = useLessonProgress('lesson-123');
 * if (lessonProgress) {
 *   console.log('Completed:', lessonProgress.completed);
 *   console.log('Score:', lessonProgress.score);
 * }
 */
export function useLessonProgress(lessonId) {
  const { progress } = useProgress();

  return useMemo(() => {
    if (!lessonId) return null;
    return progress.find(p => p.lessonId === lessonId) || null;
  }, [progress, lessonId]);
}

/**
 * Helper hook to get progress for a specific module
 * @param {string} moduleId - Module ID
 * @returns {Object|null} Progress record or null if not found
 * 
 * @example
 * const moduleProgress = useModuleProgress('module-123');
 * if (moduleProgress) {
 *   console.log('Completed:', moduleProgress.completed);
 * }
 */
export function useModuleProgress(moduleId) {
  const { progress } = useProgress();

  return useMemo(() => {
    if (!moduleId) return null;
    return progress.find(p => p.moduleId === moduleId && !p.lessonId) || null;
  }, [progress, moduleId]);
}


'use client';

/**
 * useUserProgress Hook
 * Simplified hook for accessing and updating lesson progress
 * Uses the new unified progress model via LearningProgressContext
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLearningProgress } from '@/contexts/LearningProgressContext';

const noop = () => {};
const POSITION_UPDATE_THRESHOLD_SECONDS = 5;

/**
 * Get default progress object (legacy format for compatibility)
 */
const getDefaultProgress = (lessonId, moduleId) => ({
  moduleId: moduleId ?? null,
  lessonId: lessonId ?? null,
  positionSeconds: 0,
  progress: 0,
  isCompleted: false,
  attempts: 0,
  score: null,
  metadata: null,
  clientUpdatedAt: null,
  serverUpdatedAt: null,
});

/**
 * Resolve metadata update
 */
const resolveMetadata = (current, metadata) => {
  if (typeof metadata === 'function') {
    try {
      return metadata(current ?? null);
    } catch (error) {
      console.warn('[useUserProgress] metadata updater failed', error);
      return current ?? null;
    }
  }
  if (metadata && typeof metadata === 'object') {
    return metadata;
  }
  return current ?? null;
};

/**
 * useUserProgress Hook
 * 
 * @param {Object} params - Hook parameters
 * @param {string} params.moduleId - Module ID
 * @param {string} params.lessonId - Lesson ID
 * @returns {Object} Progress state and update functions
 */
export const useUserProgress = (params = {}) => {
  const { moduleId: rawModuleId, lessonId: rawLessonId } = params;
  const moduleId = typeof rawModuleId === 'string' ? rawModuleId : undefined;
  const lessonId = typeof rawLessonId === 'string' ? rawLessonId : undefined;

  const {
    setCurrentLesson,
    updateLessonProgress,
    getLessonProgress,
    loadModuleProgress,
    syncStatus,
    lastSyncError,
    currentModuleId,
    currentLessonId,
  } = useLearningProgress();

  const lastMinuteRef = useRef(null);
  const lastCommittedPositionRef = useRef(0);

  // Load module progress when moduleId changes
  useEffect(() => {
    if (!moduleId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadModuleProgress(moduleId, { force: false });
        if (!cancelled && lessonId) {
          const progressSnapshot = getLessonProgress(lessonId, moduleId);
          if (progressSnapshot) {
            const minute = Math.floor((progressSnapshot.timeSpent * 60) / 60);
            lastMinuteRef.current = minute;
          }
        }
      } catch (error) {
        console.warn('[useUserProgress] Failed to load module progress:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [moduleId, lessonId, loadModuleProgress, getLessonProgress]);

  // Set current lesson when lessonId changes
  useEffect(() => {
    if (!lessonId) {
      return noop;
    }

    let cancelled = false;

    (async () => {
      try {
        setCurrentLesson(lessonId, moduleId);
        if (!cancelled) {
          const progressSnapshot = getLessonProgress(lessonId, moduleId);
          if (progressSnapshot) {
            const minute = Math.floor((progressSnapshot.timeSpent * 60) / 60);
            lastMinuteRef.current = minute;
            lastCommittedPositionRef.current = progressSnapshot.timeSpent * 60;
          }
        }
      } catch (error) {
        console.warn('[useUserProgress] setCurrentLesson failed', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, moduleId, setCurrentLesson, getLessonProgress]);

  // Get current progress (converted to legacy format for compatibility)
  const progress = useMemo(() => {
    if (!lessonId) {
      return getDefaultProgress(undefined, moduleId);
    }

    const lessonProgress = getLessonProgress(lessonId, moduleId);
    
    if (!lessonProgress) {
      return getDefaultProgress(lessonId, moduleId);
    }

    // Convert new format to legacy format
    return {
      moduleId: moduleId || null,
      lessonId: lessonProgress.lessonId,
      positionSeconds: lessonProgress.timeSpent * 60, // Convert minutes to seconds
      progress: lessonProgress.progress,
      isCompleted: lessonProgress.completed,
      attempts: 0, // Not available in new model
      score: null, // Not in lesson progress
      metadata: null, // Not available in new model
      clientUpdatedAt: lessonProgress.lastAccessed,
      serverUpdatedAt: lessonProgress.updatedAt,
    };
  }, [getLessonProgress, lessonId, moduleId]);

  // Update last committed position
  useEffect(() => {
    lastCommittedPositionRef.current = progress.positionSeconds ?? 0;
  }, [progress.positionSeconds]);

  /**
   * Set video position (in seconds)
   */
  const setPosition = useCallback((seconds) => {
    if (!lessonId || !Number.isFinite(seconds)) {
      return;
    }

    const normalizedSeconds = Math.max(0, Math.round(seconds));
    const lastCommitted = lastCommittedPositionRef.current ?? 0;

    // Only update if change is significant
    if (Math.abs(normalizedSeconds - lastCommitted) < POSITION_UPDATE_THRESHOLD_SECONDS) {
      lastCommittedPositionRef.current = normalizedSeconds;
      return;
    }

    lastCommittedPositionRef.current = normalizedSeconds;
    
    // Convert seconds to minutes for timeSpentDelta
    const minutesDelta = Math.floor((normalizedSeconds - lastCommitted) / 60);
    
    if (minutesDelta > 0) {
      updateLessonProgress({
        lessonId,
        moduleId,
        timeSpentDelta: minutesDelta,
      }).catch(error => {
        console.warn('[useUserProgress] Failed to update position:', error);
      });
    }
  }, [lessonId, moduleId, updateLessonProgress]);

  /**
   * Set progress percentage (0-1)
   */
  const setPercent = useCallback((percent) => {
    if (!lessonId || typeof percent !== 'number') {
      return;
    }

    const value = Math.min(1, Math.max(0, percent));
    
    updateLessonProgress({
      lessonId,
      moduleId,
      progress: value,
      completed: progress.isCompleted || value >= 1,
    }).catch(error => {
      console.warn('[useUserProgress] Failed to update progress:', error);
    });
  }, [lessonId, moduleId, progress.isCompleted, updateLessonProgress]);

  /**
   * Mark lesson as completed
   */
  const markCompleted = useCallback(() => {
    if (!lessonId) {
      return;
    }

    updateLessonProgress({
      lessonId,
      moduleId,
      progress: 1,
      completed: true,
    }).catch(error => {
      console.warn('[useUserProgress] Failed to mark completed:', error);
    });
  }, [lessonId, moduleId, updateLessonProgress]);

  /**
   * Set score (legacy - not used in new model)
   */
  const setScore = useCallback((value) => {
    if (!lessonId || (value !== null && typeof value !== 'number')) {
      return;
    }
    // Score is not part of lesson progress in new model
    // This is kept for compatibility but does nothing
    console.warn('[useUserProgress] setScore is deprecated. Score is not part of lesson progress.');
  }, [lessonId]);

  /**
   * Set metadata (legacy - not used in new model)
   */
  const setMetadata = useCallback((metadata) => {
    if (!lessonId) {
      return;
    }
    // Metadata is not part of lesson progress in new model
    // This is kept for compatibility but does nothing
    console.warn('[useUserProgress] setMetadata is deprecated. Metadata is not part of lesson progress.');
  }, [lessonId]);

  // Listen for progress events
  useEffect(() => {
    if (!lessonId) {
      return noop;
    }

    const handleTimeUpdate = (event) => {
      const detail = event?.detail;
      if (!detail || typeof detail.positionSeconds !== 'number') {
        return;
      }

      const seconds = Math.max(0, detail.positionSeconds);
      const minute = Math.floor(seconds / 60);
      const lastMinute = lastMinuteRef.current;

      if (minute !== lastMinute) {
        lastMinuteRef.current = minute;
        setPosition(seconds);
      }

      if (detail.progress != null) {
        setPercent(detail.progress);
      }
    };

    const handleSectionComplete = (event) => {
      if (!event?.detail) {
        return;
      }
      if (typeof event.detail.progress === 'number') {
        setPercent(event.detail.progress);
      }
      if (event.detail.markCompleted) {
        markCompleted();
      }
    };

    window.addEventListener('lesson-progress', handleTimeUpdate);
    window.addEventListener('lesson-section-complete', handleSectionComplete);

    return () => {
      window.removeEventListener('lesson-progress', handleTimeUpdate);
      window.removeEventListener('lesson-section-complete', handleSectionComplete);
    };
  }, [lessonId, setPercent, setPosition, markCompleted]);

  return useMemo(() => ({
    progress,
    syncStatus,
    lastSyncError,
    setPosition,
    setPercent,
    markCompleted,
    setScore,
    setMetadata,
  }), [
    progress,
    syncStatus,
    lastSyncError,
    setPosition,
    setPercent,
    markCompleted,
    setScore,
    setMetadata,
  ]);
};

export default useUserProgress;

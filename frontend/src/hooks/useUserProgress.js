'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLearningProgress } from '@/contexts/LearningProgressContext';

const noop = () => {};
const POSITION_UPDATE_THRESHOLD_SECONDS = 5;

const getDefaultProgress = (lessonId, moduleId) => ({
  moduleId: moduleId ?? null,
  lessonId,
  positionSeconds: 0,
  progress: 0,
  isCompleted: false,
  attempts: 0,
  score: null,
  metadata: null,
  clientUpdatedAt: null,
  serverUpdatedAt: null,
});

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

export const useUserProgress = (params = {}) => {
  const { moduleId: rawModuleId, lessonId: rawLessonId } = params;
  const moduleId = typeof rawModuleId === 'string' ? rawModuleId : undefined;
  const lessonId = typeof rawLessonId === 'string' ? rawLessonId : undefined;

  const {
    setCurrentLesson,
    updateProgress,
    getLessonProgress,
    syncStatus,
    lastSyncError,
  } = useLearningProgress();

  const lastMinuteRef = useRef(null);
  const lastCommittedPositionRef = useRef(0);

  useEffect(() => {
    if (!lessonId) {
      return noop;
    }

    let cancelled = false;

    (async () => {
      try {
        await setCurrentLesson(lessonId, moduleId);
        if (!cancelled) {
          const progressSnapshot = getLessonProgress(lessonId);
          const minute = progressSnapshot ? Math.floor(progressSnapshot.positionSeconds / 60) : null;
          lastMinuteRef.current = minute;
        }
      } catch (error) {
        console.warn('[useUserProgress] setCurrentLesson failed', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, moduleId, setCurrentLesson, getLessonProgress]);

  const progress = useMemo(() => {
    if (!lessonId) {
      return getDefaultProgress(undefined, moduleId);
    }
    return getLessonProgress(lessonId) ?? getDefaultProgress(lessonId, moduleId);
  }, [getLessonProgress, lessonId, moduleId]);

  useEffect(() => {
    lastCommittedPositionRef.current = progress.positionSeconds ?? 0;
  }, [progress.positionSeconds]);

  const setPosition = useCallback((seconds) => {
    if (!lessonId || !Number.isFinite(seconds)) {
      return;
    }
    const normalizedSeconds = Math.max(0, Math.round(seconds));
    const lastCommitted = lastCommittedPositionRef.current ?? 0;

    if (Math.abs(normalizedSeconds - lastCommitted) < POSITION_UPDATE_THRESHOLD_SECONDS) {
      lastCommittedPositionRef.current = normalizedSeconds;
      return;
    }

    lastCommittedPositionRef.current = normalizedSeconds;
    updateProgress({
      lessonId,
      moduleId,
      positionSeconds: normalizedSeconds,
    });
  }, [lessonId, moduleId, updateProgress]);

  const setPercent = useCallback((percent) => {
    if (!lessonId || typeof percent !== 'number') {
      return;
    }
    const value = Math.min(1, Math.max(0, percent));
    updateProgress({
      lessonId,
      moduleId,
      progress: value,
      isCompleted: progress.isCompleted || value >= 1,
    });
  }, [lessonId, moduleId, updateProgress, progress.isCompleted]);

  const markCompleted = useCallback(() => {
    if (!lessonId) {
      return;
    }
    updateProgress({
      lessonId,
      moduleId,
      progress: 1,
      isCompleted: true,
    });
  }, [lessonId, moduleId, updateProgress]);

  const setScore = useCallback((value) => {
    if (!lessonId || (value !== null && typeof value !== 'number')) {
      return;
    }
    updateProgress({
      lessonId,
      moduleId,
      score: value,
    });
  }, [lessonId, moduleId, updateProgress]);

  const setMetadata = useCallback((metadata) => {
    if (!lessonId) {
      return;
    }
  updateProgress({
    lessonId,
    moduleId,
    metadata: resolveMetadata(progress.metadata, metadata),
  });
}, [lessonId, moduleId, updateProgress, progress.metadata]);

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


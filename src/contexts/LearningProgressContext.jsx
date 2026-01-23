'use client';

/**
 * Learning Progress Context
 * Manages user progress state with normalized data structure by module
 * State format: { [moduleId]: { learningProgress, lessonsById: { [lessonId]: LessonProgressDTO } } }
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { configureProgressService, getProgressSummary } from '@/services/api/progressService';
import { getAuthToken, getUserData } from '@/services/authService';
import { getOutboxStats } from '@/utils/progressOutbox';
import { ProgressSource } from '@/services/progress/ProgressSource';
import { debug } from '@/utils/debug';

// Hooks
import { useTokenManager } from './learningProgress/hooks/useTokenManager';
import { useProgressPersistence } from './learningProgress/hooks/useProgressPersistence';
import { useProgressLoader } from './learningProgress/hooks/useProgressLoader';
import { useProgressUpdater } from './learningProgress/hooks/useProgressUpdater';
import { useOutboxReconciliation } from './learningProgress/hooks/useOutboxReconciliation';
import { useLegacyFeatures } from './learningProgress/hooks/useLegacyFeatures';

// Utils
import {
  createProgressMap,
  getCompletedLessons,
  getModuleProgressLegacy,
  getCurriculumProgress,
  convertLegacyUpdate,
} from './learningProgress/utils/legacyProgressHelpers';
import { inferModuleIdFromLesson } from './learningProgress/utils/progressHelpers';

// Constants
import { AUTOSAVE_INTERVAL_MS } from './learningProgress/constants';

const LearningProgressContext = createContext({
  // Unified progress snapshot
  snapshot: null,
  isLoadingSnapshot: false,
  snapshotError: null,

  // State
  progressByModule: {},
  currentModuleId: null,
  currentLessonId: null,
  syncStatus: 'idle',
  lastSyncError: null,
  loadingModules: new Set(),

  // Unified progress actions
  refetchSnapshot: async () => {},
  upsertLessonProgressUnified: async () => {},

  // Actions
  loadModuleProgress: async () => {},
  updateLessonProgress: async () => {},
  getLessonProgress: () => null,
  getModuleProgressData: () => null,
  getProgressSummary: async () => {},
  setCurrentModule: () => {},
  setCurrentLesson: () => {},
  reconcileOutbox: async () => {},
  getOutboxStats: () => ({}),

  // Derived progress aggregation (SINGLE SOURCE OF TRUTH for UI)
  moduleProgressAggregated: {},
  levelProgressAggregated: {},
  getModuleProgressAggregated: () => null,
  getLevelProgressAggregated: () => null,

  // Legacy compatibility
  progressMap: {},
  updateProgress: () => {},
  completedLessons: new Set(),
  markLessonComplete: async () => {},
  getModuleProgress: () => ({ percent: 0, percentInt: 0, completedLessons: 0, totalLessons: 0 }),
  getCurriculumProgress: () => ({}),
  
  // Other features
  quizScores: {},
  saveQuizScore: () => {},
  timeSpent: 0,
  updateTimeSpent: () => {},
  flashcards: [],
  addFlashcard: () => {},
  updateFlashcard: () => {},
  flashcardReviews: {},
  markFlashcardReviewed: () => {},
  getFlashcardsDue: () => [],
  getFlashcardStats: {
    total: 0,
    due: 0,
    new: 0,
    reviewed: 0,
    completionRate: 0,
  },
  dismissError: () => {},
});

export const LearningProgressProvider = ({ children }) => {
  // Get NextAuth session and token management
  const { waitForToken, session } = useTokenManager();
  
  // Unified progress snapshot state
  const [snapshot, setSnapshot] = useState(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState(null);
  
  // Normalized state by module
  const [progressByModule, setProgressByModule] = useState({});
  const [currentModuleId, setCurrentModuleId] = useState(null);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncError, setLastSyncError] = useState(null);
  const [loadingModules, setLoadingModules] = useState(new Set());
  
  // Refs for optimistic updates
  const progressByModuleRef = useRef(progressByModule);
  
  // Update refs when state changes
  useEffect(() => {
    progressByModuleRef.current = progressByModule;
  }, [progressByModule]);

  // Load persisted state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      const stored = localStorage.getItem('vlab:progress:state');
      if (stored) {
        const parsed = JSON.parse(stored);
        setProgressByModule(parsed.progressByModule || {});
        setCurrentModuleId(parsed.currentModuleId || null);
        setCurrentLessonId(parsed.currentLessonId || null);
      }
    } catch (error) {
      console.warn('[LearningProgressContext] Failed to restore state from localStorage:', error);
    }
  }, []);

  // Persist state to localStorage (saves automatically when state changes)
  useProgressPersistence(progressByModule, currentModuleId, currentLessonId);

  // Configure progress service
  useEffect(() => {
    configureProgressService({
      getAuth: () => {
        const token = getAuthToken();
        const user = getUserData?.();
        return {
          token,
          userId: user?.id ?? user?._id ?? session?.user?.id ?? null,
        };
      },
    });
  }, [session]);

  // Track ongoing snapshot load to prevent concurrent calls
  const loadingSnapshotRef = useRef(false);

  // Load unified snapshot on mount and when session changes
  const loadSnapshot = useCallback(async (label='initial') => {
    // Prevent concurrent calls
    if (loadingSnapshotRef.current) {
      debug.info(`Skipping loadSnapshot(${label}) - already loading`);
      return;
    }

    loadingSnapshotRef.current = true;
    const g = debug.group(`LearningProgressProvider.load (${label})`);
    setIsLoadingSnapshot(true);
    setSnapshotError(null);
    
    try {
      const s = await ProgressSource.getSnapshot();
      setSnapshot(s);
      g.info('loaded', { source: s.source, completed: s.overview.completedLessons, total: s.overview.totalLessons });
    } catch (error) {
      setSnapshotError(error?.message || 'Error al cargar el progreso');
      g.error('failed', error?.message);
    } finally {
      setIsLoadingSnapshot(false);
      loadingSnapshotRef.current = false;
      g.end();
    }
  }, []);

  // Refetch snapshot (for revalidation)
  const refetchSnapshot = useCallback(async () => {
    return loadSnapshot('refetch');
  }, [loadSnapshot]);

  /**
   * Validate that a lesson belongs to a module using curriculum data.
   * @param {string} lessonId - The lesson ID to validate
   * @param {string} moduleId - The module ID to check against
   * @returns {boolean} True if the lesson belongs to the module
   */
  const validateLessonBelongsToModule = useCallback((lessonId, moduleId) => {
    // Import curriculum data lazily to avoid circular dependencies
    try {
      const { curriculumData } = require('../data/curriculumData');
      const module = curriculumData?.modules?.[moduleId];

      if (!module || !Array.isArray(module.lessons)) {
        // Module not found in curriculum - could be a valid new module
        // Allow the request but log a warning
        console.warn(`[LearningProgressContext] Module "${moduleId}" not found in curriculumData - allowing request`);
        return true;
      }

      const lessonExists = module.lessons.some(lesson => lesson.id === lessonId);
      return lessonExists;
    } catch (error) {
      // If curriculum data can't be loaded, allow the request but log warning
      console.warn('[LearningProgressContext] Could not validate lesson against curriculum:', error);
      return true;
    }
  }, []);

  // Unified upsert lesson progress with strict validation
  const upsertLessonProgressUnified = useCallback(async (lessonId, progress, moduleId = null) => {
    // ==========================================================================
    // STRICT VALIDATION - Prevent 400 errors from invalid payloads
    // ==========================================================================

    // 1. Validate lessonId is a non-empty string
    if (!lessonId || typeof lessonId !== 'string' || lessonId.trim() === '') {
      console.warn('[LearningProgressContext] upsertLessonProgressUnified ABORTED: lessonId is invalid or empty', { lessonId });
      return;
    }

    // 2. Validate moduleId is provided and is a non-empty string
    if (!moduleId || typeof moduleId !== 'string' || moduleId.trim() === '') {
      console.warn('[LearningProgressContext] upsertLessonProgressUnified ABORTED: moduleId is required but was invalid or empty', { lessonId, moduleId });
      return;
    }

    // 3. Validate progress is a valid number between 0 and 1
    if (typeof progress !== 'number' || isNaN(progress) || progress < 0 || progress > 1) {
      console.warn('[LearningProgressContext] upsertLessonProgressUnified ABORTED: progress must be a number between 0 and 1', { lessonId, moduleId, progress });
      return;
    }

    // 4. Validate the lesson belongs to the given module
    if (!validateLessonBelongsToModule(lessonId, moduleId)) {
      console.warn('[LearningProgressContext] upsertLessonProgressUnified ABORTED: lesson does not belong to module', { lessonId, moduleId });
      return;
    }

    // 5. Log the validated request
    debug.info('[LearningProgressContext] upsertLessonProgressUnified: Validation passed', { lessonId, moduleId, progress });

    // ==========================================================================
    // EXECUTE THE UPSERT
    // ==========================================================================
    try {
      await ProgressSource.upsertLessonProgress(lessonId, progress, moduleId);
      // Refetch snapshot after update
      await loadSnapshot('upsert');

      // Also emit event for other listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('progress:updated', {
          detail: { lessonId, moduleId, progress }
        }));
      }
    } catch (error) {
      debug.error('Failed to upsert lesson progress:', error);
      throw error;
    }
  }, [loadSnapshot, validateLessonBelongsToModule]);

  // Load snapshot on mount
  useEffect(() => {
    debug.info('LearningProgressProvider mount');
    loadSnapshot('mount');

    function onFocus() { loadSnapshot('focus'); }
    function onVisibility() { if (document.visibilityState === 'visible') loadSnapshot('tab-visible'); }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadSnapshot]);


  // Migrate local to DB on login
  useEffect(() => {
    const userId = getUserData()?.id || getUserData()?._id || session?.user?.id || null;
    const hasToken = !!getAuthToken();

    if (userId && hasToken && snapshot?.source === 'local') {
      debug.info('User logged in with local progress, migrating to DB...');
      ProgressSource.migrateLocalToDB()
        .then(() => {
          debug.info('Migration complete, refetching snapshot...');
          loadSnapshot('migration');
        })
        .catch(error => {
          debug.error('Migration failed:', error);
        });
    }
  }, [session, snapshot?.source, loadSnapshot]);

  // Sync snapshot lessons into progressByModule to ensure data consistency
  // This ensures that fresh data from the backend is available in progressByModule
  useEffect(() => {
    if (!snapshot?.lessons || !Array.isArray(snapshot.lessons) || snapshot.lessons.length === 0) {
      return;
    }

    // Only sync if we have meaningful data to sync
    // ONLY count lessons explicitly marked as completed === true
    const completedInSnapshot = snapshot.lessons.filter(l => l.completed === true);
    if (completedInSnapshot.length === 0) {
      return;
    }

    debug.info(`[LearningProgressContext] Syncing ${completedInSnapshot.length} completed lessons from snapshot to progressByModule`);

    setProgressByModule(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      for (const lesson of snapshot.lessons) {
        // Try to determine moduleId from lessonId
        // Common formats: "module-id/lesson-id", "module-id-lesson-id"
        let moduleId = null;
        let lessonIdOnly = lesson.lessonId;

        // Check if lessonId contains a separator
        if (lesson.lessonId.includes('/')) {
          const parts = lesson.lessonId.split('/');
          moduleId = parts.slice(0, -1).join('/');
          lessonIdOnly = parts[parts.length - 1];
        } else if (lesson.lessonId.includes('-')) {
          // For pattern like "respiratory-physiology-lesson-1"
          // Try to find if this matches any existing module
          for (const existingModuleId of Object.keys(prev)) {
            if (lesson.lessonId.startsWith(existingModuleId)) {
              moduleId = existingModuleId;
              lessonIdOnly = lesson.lessonId.substring(existingModuleId.length + 1);
              break;
            }
          }
          // If no match found, use the lessonId as-is and try common patterns
          if (!moduleId) {
            // Try matching "moduleId-lessonId" pattern
            const dashParts = lesson.lessonId.split('-');
            if (dashParts.length >= 2) {
              // Assume the last part is the lesson identifier
              moduleId = dashParts.slice(0, -1).join('-');
              lessonIdOnly = dashParts[dashParts.length - 1];
            }
          }
        }

        // If we still don't have a moduleId, skip this lesson
        if (!moduleId) {
          continue;
        }

        // Ensure module exists in progressByModule
        if (!updated[moduleId]) {
          updated[moduleId] = {
            learningProgress: null,
            lessonsById: {},
          };
          hasChanges = true;
        }

        // Check if this lesson's progress needs to be synced
        const existingProgress = updated[moduleId].lessonsById[lessonIdOnly];
        const snapshotProgress = lesson.progress;
        const snapshotCompleted = snapshotProgress >= 1.0;

        // Only update if snapshot has more progress or if the lesson doesn't exist locally
        const existingProgressValue = existingProgress?.progress ?? 0;
        const existingCompleted = existingProgress?.completed ?? false;

        if (!existingProgress || snapshotProgress > existingProgressValue || (snapshotCompleted && !existingCompleted)) {
          updated[moduleId].lessonsById[lessonIdOnly] = {
            ...existingProgress,
            lessonId: lessonIdOnly,
            progress: Math.max(existingProgressValue, snapshotProgress),
            completed: snapshotCompleted || existingCompleted,
            completionPercentage: Math.round(Math.max(existingProgressValue, snapshotProgress) * 100),
            updatedAt: lesson.updatedAt || new Date().toISOString(),
          };
          hasChanges = true;
        }
      }

      return hasChanges ? updated : prev;
    });
  }, [snapshot]);

  // Progress loading hook
  const { loadModuleProgress } = useProgressLoader({
    session,
    waitForToken,
    progressByModuleRef,
    setProgressByModule,
    setLoadingModules,
    setSyncStatus,
    setLastSyncError,
  });

  // Progress updating hook
  const { updateLessonProgressAction } = useProgressUpdater({
    progressByModuleRef,
    currentModuleId,
    setProgressByModule,
    setSyncStatus,
    setLastSyncError,
  });

  // Outbox reconciliation hook
  const { reconcileOutbox } = useOutboxReconciliation({
    setProgressByModule,
    setSyncStatus,
    loadModuleProgress,
  });

  // Legacy features hook
  const {
    quizScores,
    saveQuizScore,
    timeSpent,
    updateTimeSpent,
    flashcards,
    addFlashcard,
    updateFlashcard,
    flashcardReviews,
    markFlashcardReviewed,
    getFlashcardsDue,
    getFlashcardStats,
  } = useLegacyFeatures();

  // Listen for progress:updated events (must be after loadModuleProgress is defined)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleProgressUpdated = (event) => {
      // Refresh the unified snapshot
      loadSnapshot('progress-event');

      // Also refresh the specific module's progress in progressByModule
      const moduleId = event?.detail?.moduleId;
      if (moduleId && loadModuleProgress) {
        console.log('[LearningProgressContext] Refreshing module progress for:', moduleId);
        loadModuleProgress(moduleId, { force: true }).catch(err => {
          console.warn('[LearningProgressContext] Failed to refresh module progress:', err);
        });
      }
    };

    window.addEventListener('progress:updated', handleProgressUpdated);

    return () => {
      window.removeEventListener('progress:updated', handleProgressUpdated);
    };
  }, [loadSnapshot, loadModuleProgress]);

  /**
   * Get lesson progress
   */
  const getLessonProgress = useCallback((lessonId, moduleId = null) => {
    if (!lessonId) {
      return null;
    }
    
    // Try specified module first
    if (moduleId && progressByModuleRef.current[moduleId]) {
      return progressByModuleRef.current[moduleId].lessonsById[lessonId] || null;
    }
    
    // Search all modules
    for (const moduleData of Object.values(progressByModuleRef.current)) {
      if (moduleData.lessonsById[lessonId]) {
        return moduleData.lessonsById[lessonId];
      }
    }
    
    return null;
  }, []);

  /**
   * Get module progress data
   */
  const getModuleProgressData = useCallback((moduleId) => {
    if (!moduleId) {
      return null;
    }
    
    return progressByModuleRef.current[moduleId] || null;
  }, []);

  /**
   * Set current lesson
   */
  const setCurrentLesson = useCallback((lessonId, moduleId = null) => {
    setCurrentLessonId(lessonId);
    
    // Auto-set module if provided
    if (moduleId) {
      setCurrentModuleId(moduleId);
    }
  }, []);

  /**
   * Set current module and load progress if needed
   */
  const setCurrentModule = useCallback(async (moduleId, options = {}) => {
    setCurrentModuleId(moduleId);
    
    if (moduleId && options.loadProgress !== false) {
      try {
        await loadModuleProgress(moduleId, { force: options.force });
      } catch (error) {
        console.warn('[LearningProgressContext] Failed to load module progress:', error);
      }
    }
  }, [loadModuleProgress]);

  /**
   * Get progress summary
   */
  const getProgressSummaryAction = useCallback(async () => {
    try {
      setSyncStatus('loading');
      const summary = await getProgressSummary();
      setSyncStatus('idle');
      setLastSyncError(null);
      return summary;
    } catch (error) {
      console.error('[LearningProgressContext] Failed to get progress summary:', error);
      setSyncStatus('error');
      setLastSyncError(error.message || 'Error al obtener resumen de progreso');
      throw error;
    }
  }, []);

  /**
   * Mark lesson as complete
   * Supports signature: markLessonComplete(lessonId, moduleId, timeSpentMinutes)
   */
  const markLessonComplete = useCallback(async (lessonId, moduleId = null, timeSpentMinutes = null) => {
    if (!lessonId) {
      return;
    }
    
    let resolvedModuleId = moduleId;
    
    if (!resolvedModuleId) {
      resolvedModuleId = inferModuleIdFromLesson(
        progressByModuleRef.current,
        lessonId,
        currentModuleId
      );
    }
    
    if (!resolvedModuleId) {
      console.warn('[LearningProgressContext] markLessonComplete: moduleId is required');
      return;
    }
    
    try {
      setCurrentLesson(lessonId, resolvedModuleId);
      
      const updateData = {
        lessonId,
        moduleId: resolvedModuleId,
        progress: 1,
        completed: true,
        completionPercentage: 100,
      };
      
      // Add timeSpentDelta if provided (already in minutes)
      if (timeSpentMinutes !== null && typeof timeSpentMinutes === 'number' && timeSpentMinutes > 0) {
        updateData.timeSpentDelta = timeSpentMinutes;
      }
      
      await updateLessonProgressAction(updateData);
    } catch (error) {
      console.error('[LearningProgressContext] Failed to mark lesson complete:', error);
    }
  }, [currentModuleId, setCurrentLesson, updateLessonProgressAction]);

  // Legacy compatibility: progressMap
  const progressMap = useMemo(() => {
    return createProgressMap(progressByModule);
  }, [progressByModule]);

  /**
   * ==========================================================================
   * DERIVED PROGRESS AGGREGATION - Unified progress calculation
   * ==========================================================================
   * These selectors compute module and level progress from the source of truth
   * (progressByModule, completedLessons, snapshot) and ensure consistency
   * across the entire application.
   */

  /**
   * Derive module progress for all modules from curriculum data.
   * This is the SINGLE SOURCE OF TRUTH for module progress in the UI.
   *
   * moduleProgressAggregated[moduleId] = {
   *   completedLessons: number,
   *   totalLessons: number,
   *   progress: number (0-1),
   *   progressPercent: number (0-100),
   *   isCompleted: boolean
   * }
   */
  const moduleProgressAggregated = useMemo(() => {
    const aggregated = {};

    try {
      const { curriculumData } = require('../data/curriculumData');
      if (!curriculumData?.modules) return aggregated;

      // Create a merged view of lesson progress from all sources
      // Priority: progressByModule > snapshot.lessons
      const lessonProgressMap = new Map();

      // First, add data from progressByModule (more detailed, per-page progress)
      for (const [moduleId, moduleData] of Object.entries(progressByModule)) {
        if (!moduleData?.lessonsById) continue;
        for (const [lessonId, lessonProgress] of Object.entries(moduleData.lessonsById)) {
          const key = `${moduleId}-${lessonId}`;
          lessonProgressMap.set(key, {
            progress: lessonProgress.progress ?? (lessonProgress.completionPercentage ? lessonProgress.completionPercentage / 100 : 0),
            completed: lessonProgress.completed === true,
          });
          // Also add by lessonId only for cross-reference
          lessonProgressMap.set(lessonId, {
            progress: lessonProgress.progress ?? (lessonProgress.completionPercentage ? lessonProgress.completionPercentage / 100 : 0),
            completed: lessonProgress.completed === true,
          });
        }
      }

      // Then, merge snapshot data (only if we don't already have better data)
      if (snapshot?.lessons && Array.isArray(snapshot.lessons)) {
        for (const lesson of snapshot.lessons) {
          if (!lessonProgressMap.has(lesson.lessonId)) {
            lessonProgressMap.set(lesson.lessonId, {
              progress: lesson.progress ?? 0,
              completed: lesson.completed === true,
            });
          }
        }
      }

      // Now calculate progress for each module
      for (const [moduleId, module] of Object.entries(curriculumData.modules)) {
        const lessons = module.lessons || [];
        const totalLessons = lessons.length;

        if (totalLessons === 0) {
          aggregated[moduleId] = {
            completedLessons: 0,
            totalLessons: 0,
            progress: 0,
            progressPercent: 0,
            isCompleted: false,
          };
          continue;
        }

        let completedCount = 0;
        let progressSum = 0;

        for (const lesson of lessons) {
          const lessonId = lesson.id;
          const key1 = `${moduleId}-${lessonId}`;

          // Try to find progress data
          const progressData = lessonProgressMap.get(key1) || lessonProgressMap.get(lessonId);

          if (progressData) {
            // A lesson counts as completed ONLY when explicitly marked completed
            if (progressData.completed === true) {
              completedCount++;
              progressSum += 1;
            } else {
              // Use partial progress for incomplete lessons
              progressSum += Math.max(0, Math.min(1, progressData.progress || 0));
            }
          }
          // If no progress data found, the lesson contributes 0 to progressSum
        }

        // Module progress = completedLessons / totalLessons
        // This ensures consistency: module is 100% only when ALL lessons are completed
        const progress = totalLessons > 0 ? (completedCount / totalLessons) : 0;
        const isCompleted = completedCount >= totalLessons && totalLessons > 0;

        aggregated[moduleId] = {
          completedLessons: completedCount,
          totalLessons,
          progress,
          progressPercent: Math.round(progress * 100),
          isCompleted,
        };
      }
    } catch (error) {
      console.warn('[LearningProgressContext] Error calculating moduleProgressAggregated:', error);
    }

    return aggregated;
  }, [progressByModule, snapshot]);

  /**
   * Derive level progress from module progress.
   * Level progress = average of module progress values for modules in that level.
   *
   * levelProgressAggregated[levelId] = {
   *   completedModules: number,
   *   totalModules: number,
   *   completedLessons: number,
   *   totalLessons: number,
   *   progress: number (0-1),
   *   percentage: number (0-100)
   * }
   */
  const levelProgressAggregated = useMemo(() => {
    const aggregated = {};

    try {
      const { curriculumData } = require('../data/curriculumData');
      if (!curriculumData?.levels || !curriculumData?.modules) return aggregated;

      for (const level of curriculumData.levels) {
        const levelId = level.id;

        // Get modules belonging to this level
        const modulesInLevel = Object.values(curriculumData.modules)
          .filter(module => module.level === levelId);

        const totalModules = modulesInLevel.length;

        if (totalModules === 0) {
          aggregated[levelId] = {
            completedModules: 0,
            totalModules: 0,
            completedLessons: 0,
            totalLessons: 0,
            progress: 0,
            percentage: 0,
          };
          continue;
        }

        let completedModulesCount = 0;
        let completedLessonsTotal = 0;
        let totalLessonsInLevel = 0;
        let moduleProgressSum = 0;

        for (const module of modulesInLevel) {
          const moduleProgress = moduleProgressAggregated[module.id];

          if (moduleProgress) {
            if (moduleProgress.isCompleted) {
              completedModulesCount++;
            }
            completedLessonsTotal += moduleProgress.completedLessons;
            totalLessonsInLevel += moduleProgress.totalLessons;
            moduleProgressSum += moduleProgress.progress;
          } else {
            // No progress data, just count total lessons
            totalLessonsInLevel += (module.lessons?.length || 0);
          }
        }

        // Level progress = average of module progress values
        const progress = totalModules > 0 ? (moduleProgressSum / totalModules) : 0;
        const percentage = Math.round(progress * 100);

        aggregated[levelId] = {
          completedModules: completedModulesCount,
          totalModules,
          completedLessons: completedLessonsTotal,
          totalLessons: totalLessonsInLevel,
          progress,
          percentage,
        };
      }
    } catch (error) {
      console.warn('[LearningProgressContext] Error calculating levelProgressAggregated:', error);
    }

    return aggregated;
  }, [moduleProgressAggregated]);

  /**
   * Helper function to get module progress from the aggregated data.
   * Use this instead of computing progress locally in components.
   */
  const getModuleProgressAggregated = useCallback((moduleId) => {
    if (!moduleId) return null;
    return moduleProgressAggregated[moduleId] || null;
  }, [moduleProgressAggregated]);

  /**
   * Helper function to get level progress from the aggregated data.
   */
  const getLevelProgressAggregated = useCallback((levelId) => {
    if (!levelId) return null;
    return levelProgressAggregated[levelId] || null;
  }, [levelProgressAggregated]);

  // Legacy compatibility: updateProgress
  const updateProgress = useCallback((partial) => {
    const updateData = convertLegacyUpdate(partial, currentLessonId, currentModuleId);
    
    if (!updateData.lessonId) {
      console.warn('[LearningProgressContext] updateProgress: lessonId is required');
      return;
    }
    
    updateLessonProgressAction(updateData).catch(error => {
      console.error('[LearningProgressContext] updateProgress failed:', error);
    });
  }, [currentLessonId, currentModuleId, updateLessonProgressAction]);

  // Completed lessons - include both progressByModule and snapshot data
  const completedLessons = useMemo(() => {
    return getCompletedLessons(progressByModule, snapshot);
  }, [progressByModule, snapshot]);

  // Auto-save interval
  useEffect(() => {
    if (!currentLessonId || syncStatus === 'saving') {
      return;
    }
    
    const interval = setInterval(() => {
      // Auto-save is handled by updateLessonProgressAction
      // This is just a periodic check
    }, AUTOSAVE_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [currentLessonId, syncStatus]);

  const dismissError = useCallback(() => {
    setLastSyncError(null);
  }, []);

  // Wrapper for outbox stats
  const getOutboxStatsWrapper = useCallback(() => {
    return getOutboxStats();
  }, []);

  const contextValue = useMemo(() => ({
    // Unified progress snapshot
    snapshot,
    isLoadingSnapshot,
    snapshotError,
    refetchSnapshot: () => loadSnapshot('refetch'),
    upsertLessonProgressUnified,

    // New API
    progressByModule,
    currentModuleId,
    currentLessonId,
    syncStatus,
    lastSyncError,
    loadingModules,
    loadModuleProgress,
    updateLessonProgress: updateLessonProgressAction,
    getLessonProgress,
    getModuleProgressData,
    getProgressSummary: getProgressSummaryAction,
    setCurrentModule,
    setCurrentLesson,
    reconcileOutbox,
    getOutboxStats: getOutboxStatsWrapper,

    // Derived progress aggregation (SINGLE SOURCE OF TRUTH for UI)
    moduleProgressAggregated,
    levelProgressAggregated,
    getModuleProgressAggregated,
    getLevelProgressAggregated,

    // Legacy compatibility
    progressMap,
    updateProgress,
    completedLessons,
    markLessonComplete,
    getModuleProgress: (moduleId, lessonIds) => getModuleProgressLegacy(progressByModule, moduleId, lessonIds),
    getCurriculumProgress: (modules) => getCurriculumProgress(progressByModule, modules),
    
    // Other features
    quizScores,
    saveQuizScore,
    timeSpent,
    updateTimeSpent,
    flashcards,
    addFlashcard,
    updateFlashcard,
    flashcardReviews,
    markFlashcardReviewed,
    getFlashcardsDue,
    getFlashcardStats,
    dismissError,
  }), [
    snapshot,
    isLoadingSnapshot,
    snapshotError,
    loadSnapshot,
    upsertLessonProgressUnified,
    progressByModule,
    currentModuleId,
    currentLessonId,
    syncStatus,
    lastSyncError,
    loadingModules,
    loadModuleProgress,
    updateLessonProgressAction,
    getLessonProgress,
    getModuleProgressData,
    getProgressSummaryAction,
    setCurrentModule,
    setCurrentLesson,
    reconcileOutbox,
    getOutboxStatsWrapper,
    moduleProgressAggregated,
    levelProgressAggregated,
    getModuleProgressAggregated,
    getLevelProgressAggregated,
    progressMap,
    updateProgress,
    completedLessons,
    markLessonComplete,
    quizScores,
    saveQuizScore,
    updateTimeSpent,
    flashcards,
    addFlashcard,
    updateFlashcard,
    flashcardReviews,
    markFlashcardReviewed,
    getFlashcardsDue,
    getFlashcardStats,
    dismissError,
  ]);
  
  return (
    <LearningProgressContext.Provider value={contextValue}>
      {children}
    </LearningProgressContext.Provider>
  );
};

export const useLearningProgress = () => {
  const context = useContext(LearningProgressContext);
  if (context === undefined) {
    throw new Error('useLearningProgress must be used within a LearningProgressProvider');
  }
  return context;
};

// Export ProgressSyncBadge component
export { ProgressSyncBadge } from './learningProgress/components/ProgressSyncBadge';

export default LearningProgressContext;

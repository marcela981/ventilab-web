'use client';

/**
 * Learning Progress Context
 * Manages user progress state with normalized data structure by module
 * State format: { [moduleId]: { learningProgress, lessonsById: { [lessonId]: LessonProgressDTO } } }
 * 
 * ARCHITECTURE: Single Source of Truth
 * ====================================
 * 
 * Lesson Progress (0-1 float) is the SINGLE SOURCE OF TRUTH for all progress calculations.
 * 
 * 1. STORAGE:
 *    - Lesson progress is stored in backend as `progress` (0-1) or `completionPercentage` (0-100)
 *    - Backend may also store a `completed` boolean flag, but this is NOT used for calculations
 *    - Progress is stored in `progressByModule[moduleId].lessonsById[lessonId].progress`
 * 
 * 2. DERIVED VALUES:
 *    - Module Progress = completedLessons / totalLessons
 *      where completedLessons = count of lessons with progress === 1
 *    - Level Progress = sum(moduleProgress) / totalModules
 *      where moduleProgress is derived from lesson progress
 * 
 * 3. CALCULATIONS:
 *    - A lesson is completed ONLY when progress === 1 (not based on flags)
 *    - Module progress is calculated from lesson progress values
 *    - Level progress is calculated from module progress values
 *    - All calculations use progress values (0-1), never flags
 * 
 * 4. UI COMPONENTS:
 *    - UI components MUST use derived progress values from:
 *      - moduleProgressAggregated[moduleId].progress (0-1)
 *      - levelProgressAggregated[levelId].progress (0-1)
 *    - UI components MUST NOT rely on "completed" flags to calculate progress
 *    - The `completedLessons` Set is derived from progress === 1, not from flags
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
import { computeModuleProgress } from '@/utils/computeModuleProgress';

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
  isRateLimited: false, // Rate limiting state

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
  const [isRateLimited, setIsRateLimited] = useState(false); // Track rate limiting state
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
    // Count lessons with progress === 1 (not based on flags)
    // Lesson progress (0-1 float) is the single source of truth
    const lessonsWithProgress = snapshot.lessons.filter(l => {
      const progressValue = Math.max(0, Math.min(1, l.progress || 0));
      return progressValue > 0; // Sync any lesson with progress > 0
    });
    if (lessonsWithProgress.length === 0) {
      return;
    }

    debug.info(`[LearningProgressContext] Syncing ${lessonsWithProgress.length} lessons with progress from snapshot to progressByModule`);

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
        // Lesson progress (0-1 float) is the single source of truth
        // Defensive: ensure lesson data is valid
        if (!lesson || typeof lesson !== 'object') {
          console.warn('[LearningProgressContext] Invalid lesson data in snapshot sync:', lesson);
          continue;
        }
        
        const existingProgress = updated[moduleId].lessonsById[lessonIdOnly];
        
        // Defensive: calculate snapshot progress value safely
        let snapshotProgressValue = 0;
        if (typeof lesson.progress === 'number' && !isNaN(lesson.progress)) {
          snapshotProgressValue = Math.max(0, Math.min(1, lesson.progress));
        } else {
          // Log warning for inconsistent data
          if (lesson.completed === true && (lesson.progress === undefined || lesson.progress < 1)) {
            console.warn('[LearningProgressContext] Inconsistent snapshot data: lesson marked completed but progress < 1', {
              lessonId: lesson.lessonId,
              completed: lesson.completed,
              progress: lesson.progress,
            });
          }
          snapshotProgressValue = 0; // Default to 0 for missing/invalid data
        }

        // Only update if snapshot has more progress or if the lesson doesn't exist locally
        let existingProgressValue = 0;
        if (existingProgress) {
          if (typeof existingProgress.progress === 'number' && !isNaN(existingProgress.progress)) {
            existingProgressValue = existingProgress.progress;
          } else if (typeof existingProgress.completionPercentage === 'number' && !isNaN(existingProgress.completionPercentage)) {
            existingProgressValue = existingProgress.completionPercentage / 100;
          } else {
            existingProgressValue = 0; // Default to 0
          }
        }

        if (!existingProgress || snapshotProgressValue > existingProgressValue) {
          const finalProgressValue = Math.max(existingProgressValue, snapshotProgressValue);
          
          // Defensive: never set completed flag if progress < 1
          // Only set completed if progress is exactly 1 OR if backend explicitly set it
          // But log warning if backend says completed but progress < 1
          let completedFlag = false;
          if (Math.abs(finalProgressValue - 1) < 0.0001) {
            completedFlag = true;
          } else if (lesson.completed === true) {
            // Backend says completed but progress < 1 - log warning and don't set completed
            console.warn('[LearningProgressContext] Backend marked lesson as completed but progress < 1, ignoring completed flag', {
              lessonId: lesson.lessonId,
              progress: finalProgressValue,
              backendCompleted: lesson.completed,
            });
            completedFlag = false; // Don't trust the flag if progress doesn't match
          }
          
          updated[moduleId].lessonsById[lessonIdOnly] = {
            ...(existingProgress || {}),
            lessonId: lessonIdOnly,
            progress: finalProgressValue,
            // Defensive: only set completed if progress === 1
            completed: completedFlag,
            completionPercentage: Math.round(finalProgressValue * 100),
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
    setIsRateLimited,
  });

  // Progress updating hook
  const { updateLessonProgressAction } = useProgressUpdater({
    progressByModuleRef,
    currentModuleId,
    setProgressByModule,
    setSyncStatus,
    setLastSyncError,
    setIsRateLimited, // Pass rate limiting state setter
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

  // Debounce refs to prevent cascading reloads on progress:updated events
  const lastRefreshTimeRef = useRef(0);
  const pendingRefreshTimerRef = useRef(null);
  const REFRESH_DEBOUNCE_MS = 2000; // Minimum time between backend refreshes

  // Listen for progress:updated events (must be after loadModuleProgress is defined)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleProgressUpdated = (event) => {
      const { lessonId, moduleId, progress, completionPercentage } = event?.detail || {};

      // If we have the lesson progress data, update progressByModule immediately
      // This ensures UI updates without waiting for backend refetch
      // Defensive: validate inputs before processing
      if (lessonId && moduleId && typeof lessonId === 'string' && typeof moduleId === 'string' &&
          (progress !== undefined || completionPercentage !== undefined)) {
        try {
          // Defensive: validate and normalize progress value
          let progressValue = 0;
          if (typeof progress === 'number' && !isNaN(progress)) {
            progressValue = Math.max(0, Math.min(1, progress));
          } else if (typeof completionPercentage === 'number' && !isNaN(completionPercentage)) {
            progressValue = Math.max(0, Math.min(1, completionPercentage / 100));
          } else {
            // Log warning for invalid progress data
            console.warn('[LearningProgressContext] Invalid progress data in event:', {
              lessonId,
              moduleId,
              progress,
              completionPercentage,
            });
            progressValue = 0; // Default to 0
          }

          // Update progressByModule optimistically
          setProgressByModule((prev) => {
            // Defensive: ensure prev is valid
            if (!prev || typeof prev !== 'object') {
              console.warn('[LearningProgressContext] Invalid progressByModule state, initializing:', prev);
              prev = {};
            }

            const moduleData = prev[moduleId] || {
              learningProgress: null,
              lessonsById: {},
            };

            // Defensive: ensure moduleData is valid
            let safeModuleData = moduleData;
            if (!safeModuleData || typeof safeModuleData !== 'object') {
              console.warn('[LearningProgressContext] Invalid moduleData, initializing:', moduleId, safeModuleData);
              safeModuleData = {
                learningProgress: null,
                lessonsById: {},
              };
            }

            // Update lesson progress
            const existingLessonProgress = safeModuleData.lessonsById[lessonId] || {};

            // Defensive: never set completed flag if progress < 1
            // Only set completed if progress is exactly 1
            const isCompleted = Math.abs(progressValue - 1) < 0.0001;

            const updatedLessonsById = {
              ...safeModuleData.lessonsById,
              [lessonId]: {
                ...existingLessonProgress,
                progress: progressValue,
                completionPercentage: completionPercentage ?? (progressValue * 100),
                updatedAt: new Date().toISOString(),
                // Defensive: only set completed if progress === 1
                completed: isCompleted,
              },
            };

            // Create new object to ensure React detects the change
            return {
              ...prev,
              [moduleId]: {
                ...safeModuleData,
                lessonsById: updatedLessonsById,
              },
            };
          });
        } catch (error) {
          // Defensive: catch any errors to prevent crashes
          console.error('[LearningProgressContext] Error updating progress from event:', error, {
            lessonId,
            moduleId,
            progress,
            completionPercentage,
          });
          // Don't throw - continue execution
        }
      } else {
        // Log warning for missing required data
        console.warn('[LearningProgressContext] Missing required data in progress:updated event:', {
          lessonId,
          moduleId,
          hasProgress: progress !== undefined,
          hasCompletionPercentage: completionPercentage !== undefined,
        });
      }

      // DEBOUNCE: Prevent cascading reloads by limiting backend refresh frequency
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;

      // Clear any pending refresh timer
      if (pendingRefreshTimerRef.current) {
        clearTimeout(pendingRefreshTimerRef.current);
        pendingRefreshTimerRef.current = null;
      }

      // Only refresh if enough time has passed since the last refresh
      if (timeSinceLastRefresh >= REFRESH_DEBOUNCE_MS) {
        lastRefreshTimeRef.current = now;

        // Refresh the unified snapshot in the background
        loadSnapshot('progress-event');

        // Refresh the specific module's progress in progressByModule from backend
        // Use preserveExistingProgress: true to avoid resetting completed lessons
        if (moduleId && loadModuleProgress) {
          console.log('[LearningProgressContext] Refreshing module progress for:', moduleId);
          loadModuleProgress(moduleId, { force: false, preserveExistingProgress: true }).catch(err => {
            console.warn('[LearningProgressContext] Failed to refresh module progress:', err);
          });
        }
      } else {
        // Schedule a debounced refresh
        pendingRefreshTimerRef.current = setTimeout(() => {
          lastRefreshTimeRef.current = Date.now();
          loadSnapshot('progress-event-debounced');

          if (moduleId && loadModuleProgress) {
            console.log('[LearningProgressContext] Debounced refresh for module:', moduleId);
            loadModuleProgress(moduleId, { force: false, preserveExistingProgress: true }).catch(err => {
              console.warn('[LearningProgressContext] Failed to refresh module progress:', err);
            });
          }
        }, REFRESH_DEBOUNCE_MS - timeSinceLastRefresh);
      }
    };

    window.addEventListener('progress:updated', handleProgressUpdated);

    return () => {
      window.removeEventListener('progress:updated', handleProgressUpdated);
      // Clean up pending timer on unmount
      if (pendingRefreshTimerRef.current) {
        clearTimeout(pendingRefreshTimerRef.current);
      }
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
      // IMPORTANT: Only store progress value (0-1), never store completed flag
      // Lesson progress (0-1 float) is the single source of truth
      for (const [moduleId, moduleData] of Object.entries(progressByModule)) {
        // Defensive check: ensure moduleData is valid
        if (!moduleData || typeof moduleData !== 'object') {
          console.warn('[LearningProgressContext] Invalid moduleData for moduleId:', moduleId, moduleData);
          continue;
        }
        
        if (!moduleData?.lessonsById) continue;
        
        for (const [lessonId, lessonProgress] of Object.entries(moduleData.lessonsById)) {
          // Defensive check: ensure lessonProgress is valid
          if (!lessonProgress || typeof lessonProgress !== 'object') {
            console.warn('[LearningProgressContext] Invalid lessonProgress for lessonId:', lessonId, 'in module:', moduleId, lessonProgress);
            continue;
          }
          
          const key = `${moduleId}-${lessonId}`;
          
          // Get progress value (0-1) - prefer progress field, then completionPercentage
          // Defensive: default to 0 if data is missing or invalid
          let progressValue = 0;
          if (typeof lessonProgress.progress === 'number' && !isNaN(lessonProgress.progress)) {
            progressValue = lessonProgress.progress;
          } else if (typeof lessonProgress.completionPercentage === 'number' && !isNaN(lessonProgress.completionPercentage)) {
            progressValue = lessonProgress.completionPercentage / 100;
          } else {
            // Log warning for inconsistent data
            if (lessonProgress.completed === true && (lessonProgress.progress === undefined || lessonProgress.progress < 1)) {
              console.warn('[LearningProgressContext] Inconsistent progress data: lesson marked completed but progress < 1', {
                lessonId,
                moduleId,
                completed: lessonProgress.completed,
                progress: lessonProgress.progress,
                completionPercentage: lessonProgress.completionPercentage,
              });
            }
            progressValue = 0; // Default to 0 for missing/invalid data
          }
          
          // Normalize to 0-1 range
          progressValue = Math.max(0, Math.min(1, progressValue));
          
          lessonProgressMap.set(key, {
            progress: progressValue,
          });
          // Also add by lessonId only for cross-reference
          lessonProgressMap.set(lessonId, {
            progress: progressValue,
          });
        }
      }

      // Then, merge snapshot data (only if we don't already have better data)
      if (snapshot?.lessons && Array.isArray(snapshot.lessons)) {
        for (const lesson of snapshot.lessons) {
          // Defensive check: ensure lesson data is valid
          if (!lesson || typeof lesson !== 'object' || !lesson.lessonId) {
            console.warn('[LearningProgressContext] Invalid lesson data in snapshot:', lesson);
            continue;
          }
          
          if (!lessonProgressMap.has(lesson.lessonId)) {
            // Defensive: default to 0 if progress is missing or invalid
            let progressValue = 0;
            if (typeof lesson.progress === 'number' && !isNaN(lesson.progress)) {
              progressValue = Math.max(0, Math.min(1, lesson.progress));
            } else {
              // Log warning for inconsistent data
              if (lesson.completed === true && (lesson.progress === undefined || lesson.progress < 1)) {
                console.warn('[LearningProgressContext] Inconsistent snapshot data: lesson marked completed but progress < 1', {
                  lessonId: lesson.lessonId,
                  completed: lesson.completed,
                  progress: lesson.progress,
                });
              }
              progressValue = 0; // Default to 0 for missing/invalid data
            }
            
            lessonProgressMap.set(lesson.lessonId, {
              progress: progressValue,
            });
          }
        }
      }

      // Now calculate progress for each module using computeModuleProgress
      for (const [moduleId, module] of Object.entries(curriculumData.modules)) {
        const lessons = module.lessons || [];

        if (lessons.length === 0) {
          aggregated[moduleId] = {
            completedLessons: 0,
            totalLessons: 0,
            progress: 0,
            progressPercent: 0,
            isCompleted: false,
          };
          continue;
        }

        // Build lessons array with progress values (0-100) for computeModuleProgress
        const lessonsWithProgress = lessons.map(lesson => {
          if (!lesson || typeof lesson !== 'object' || !lesson.id) {
            return { id: 'unknown', progress: 0 };
          }

          const lessonId = lesson.id;
          const key1 = `${moduleId}-${lessonId}`;

          // Try to find progress data for this lesson
          const progressData = lessonProgressMap.get(key1) || lessonProgressMap.get(lessonId);

          // Get progress value (0-1) and convert to 0-100 for computeModuleProgress
          let progressValue = 0;
          if (progressData && typeof progressData.progress === 'number' && !isNaN(progressData.progress)) {
            progressValue = Math.max(0, Math.min(1, progressData.progress));
          }

          // Convert 0-1 to 0-100 for computeModuleProgress
          // Use Math.round to handle floating point issues (0.9999999 -> 100)
          const progressPercent = Math.round(progressValue * 100);

          return {
            id: lessonId,
            progress: progressPercent,
          };
        });

        // Use computeModuleProgress as the single source of truth
        const { completedLessonsCount, totalLessonsCount, progressPercentage } =
          computeModuleProgress(lessonsWithProgress);

        // Module is completed ONLY when all lessons have progress === 100
        const isCompleted = totalLessonsCount > 0 && completedLessonsCount === totalLessonsCount;

        aggregated[moduleId] = {
          completedLessons: completedLessonsCount,
          totalLessons: totalLessonsCount,
          progress: progressPercentage / 100, // Convert back to 0-1 for legacy compatibility
          progressPercent: progressPercentage, // Already floor'd by computeModuleProgress
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

        // Iterate through ALL modules in the level
        // IMPORTANT: Every module must contribute to the average, even if progress is 0
        // Modules with 0 progress contribute 0 to the sum (not skipped)
        for (const module of modulesInLevel) {
          const moduleProgress = moduleProgressAggregated[module.id];

          // Get module progress value (0-1) - use progress field, never flags
          // If no progress data exists, the module contributes 0 (not skipped)
          let moduleProgressValue = 0;
          
          if (moduleProgress) {
            // Defensive: ensure moduleProgress is valid object
            if (typeof moduleProgress !== 'object') {
              console.warn('[LearningProgressContext] Invalid moduleProgress data for module:', module.id, moduleProgress);
              moduleProgressValue = 0;
            } else {
              // Normalize progress value to 0-1 range
              // Defensive: default to 0 if progress is missing or invalid
              if (typeof moduleProgress.progress === 'number' && !isNaN(moduleProgress.progress)) {
                moduleProgressValue = Math.max(0, Math.min(1, moduleProgress.progress));
              } else {
                // Log warning for inconsistent data
                if (moduleProgress.isCompleted === true && (moduleProgress.progress === undefined || moduleProgress.progress < 1)) {
                  console.warn('[LearningProgressContext] Inconsistent module progress: marked completed but progress < 1', {
                    moduleId: module.id,
                    isCompleted: moduleProgress.isCompleted,
                    progress: moduleProgress.progress,
                  });
                }
                moduleProgressValue = 0; // Default to 0 for missing/invalid data
              }
              
              // Aggregate lesson counts for display
              // Defensive: ensure counts are valid numbers
              const completedLessons = typeof moduleProgress.completedLessons === 'number' && !isNaN(moduleProgress.completedLessons)
                ? moduleProgress.completedLessons : 0;
              const totalLessons = typeof moduleProgress.totalLessons === 'number' && !isNaN(moduleProgress.totalLessons)
                ? moduleProgress.totalLessons : 0;
              
              completedLessonsTotal += completedLessons;
              totalLessonsInLevel += totalLessons;
            }
          } else {
            // No progress data - module contributes 0 to progress sum
            // Still count total lessons for display purposes
            const moduleLessonsCount = Array.isArray(module.lessons) ? module.lessons.length : 0;
            totalLessonsInLevel += moduleLessonsCount;
          }
          
          // ALWAYS add to sum (even if 0) - ensures all modules are counted in average
          // This ensures modules with 0 progress contribute 0, not skipped
          // Defensive: ensure value is valid before adding
          if (typeof moduleProgressValue === 'number' && !isNaN(moduleProgressValue)) {
            moduleProgressSum += moduleProgressValue;
          } else {
            console.warn('[LearningProgressContext] Invalid moduleProgressValue, defaulting to 0:', {
              moduleId: module.id,
              moduleProgressValue,
            });
            moduleProgressSum += 0; // Default to 0
          }
          
          // Count completed modules - a module is completed ONLY when progress === 1
          // Defensive: use strict check to prevent false positives
          // Never mark as completed if progress < 1
          if (Math.abs(moduleProgressValue - 1) < 0.0001) {
            completedModulesCount++;
          }
        }

        // Level progress = average of module progress values
        // Formula: sum(moduleProgress) / totalModules
        // 
        // Rules:
        // - ALL modules contribute to the average (including those with 0 progress)
        // - Modules with 0 progress contribute 0 to the sum, not skipped
        // - Partial module progress contributes proportionally
        // - Ignore module.completed flags - only use module.progress values
        // Defensive: ensure division is safe and result is valid
        let progress = 0;
        if (totalModules > 0 && !isNaN(moduleProgressSum) && !isNaN(totalModules)) {
          progress = moduleProgressSum / totalModules;
          // Ensure progress is in valid range
          progress = Math.max(0, Math.min(1, progress));
        } else {
          // Log warning for invalid calculation
          if (totalModules === 0) {
            console.warn('[LearningProgressContext] Level has no modules:', levelId);
          } else {
            console.warn('[LearningProgressContext] Invalid level progress calculation:', {
              levelId,
              moduleProgressSum,
              totalModules,
            });
          }
          progress = 0; // Default to 0
        }
        
        // Normalize to 0-100 for UI display (consistent with module progress bars)
        // Ensure value is clamped to 0-100 range for LinearProgress component
        // This ensures consistency between level progress bar and module card progress bars
        // Use Math.floor to be consistent with computeModuleProgress
        // Defensive: ensure percentage is valid
        let percentage = 0;
        if (typeof progress === 'number' && !isNaN(progress)) {
          percentage = Math.max(0, Math.min(100, Math.floor(progress * 100)));
        } else {
          console.warn('[LearningProgressContext] Invalid progress value for percentage calculation:', {
            levelId,
            progress,
          });
          percentage = 0; // Default to 0
        }

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
    isRateLimited, // Rate limiting state for UI
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

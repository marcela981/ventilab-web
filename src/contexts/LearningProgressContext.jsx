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

  // Unified upsert lesson progress
  const upsertLessonProgressUnified = useCallback(async (lessonId, progress) => {
    try {
      await ProgressSource.upsertLessonProgress(lessonId, progress);
      // Refetch snapshot after update
      await loadSnapshot('upsert');
      
      // Also emit event for other listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('progress:updated', {
          detail: { lessonId, progress }
        }));
      }
    } catch (error) {
      debug.error('Failed to upsert lesson progress:', error);
      throw error;
    }
  }, [loadSnapshot]);

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


  // Listen for progress:updated events
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleProgressUpdated = () => {
      loadSnapshot('progress-event');
    };

    window.addEventListener('progress:updated', handleProgressUpdated);

    return () => {
      window.removeEventListener('progress:updated', handleProgressUpdated);
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

  // Completed lessons
  const completedLessons = useMemo(() => {
    return getCompletedLessons(progressByModule);
  }, [progressByModule]);

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

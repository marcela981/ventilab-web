import { useCallback, useRef } from 'react';
import { updateLessonProgress } from '@/services/api/progressService';
import {
  generateClientEventId,
  addToOutbox,
  removeFromOutbox,
  markAsConfirmed,
} from '@/utils/progressOutbox';
import {
  calculateOptimisticProgress,
  createDefaultLessonProgress,
  inferModuleIdFromLesson,
} from '../utils/progressHelpers';
import { RETRY_DELAY_MS, MAX_RETRIES } from '../constants';

/**
 * Custom hook to handle updating lesson progress
 */
export const useProgressUpdater = ({
  progressByModuleRef,
  currentModuleId,
  setProgressByModule,
  setSyncStatus,
  setLastSyncError,
}) => {
  const pendingUpdatesRef = useRef(new Map()); // Map<updateId, { moduleId, lessonId, optimisticData, retryCount }>
  const updateIdCounterRef = useRef(0);

  const updateLessonProgressAction = useCallback(async (update) => {
    const { lessonId, moduleId, ...updateData } = update;
    
    if (!lessonId) {
      throw new Error('lessonId is required');
    }
    
    // Infer moduleId from current state if not provided
    let resolvedModuleId = moduleId;
    if (!resolvedModuleId) {
      resolvedModuleId = inferModuleIdFromLesson(
        progressByModuleRef.current,
        lessonId,
        currentModuleId
      );
    }
    
    if (!resolvedModuleId) {
      throw new Error('moduleId is required. Cannot infer from context.');
    }
    
    // Generate client event ID for outbox tracking
    const clientEventId = generateClientEventId();
    const updateId = ++updateIdCounterRef.current;
    
    // Get current lesson progress for optimistic update
    const currentModuleData = progressByModuleRef.current[resolvedModuleId];
    const currentLessonProgress = currentModuleData?.lessonsById[lessonId] || 
      createDefaultLessonProgress(lessonId, currentModuleData?.learningProgress?.id || '');
    
    // Calculate optimistic update
    const optimisticLessonProgress = calculateOptimisticProgress(currentLessonProgress, updateData);
    
    // Optimistic update
    setProgressByModule(prev => {
      const moduleData = prev[resolvedModuleId] || {
        learningProgress: null,
        lessonsById: {},
      };
      
      return {
        ...prev,
        [resolvedModuleId]: {
          ...moduleData,
          lessonsById: {
            ...moduleData.lessonsById,
            [lessonId]: optimisticLessonProgress,
          },
        },
      };
    });
    
    // Check if offline or API will fail
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    
    // Create outbox event
    const outboxEvent = {
      clientEventId,
      lessonId,
      moduleId: resolvedModuleId,
      progress: updateData.progress,
      completed: updateData.completed,
      timeSpentDelta: updateData.timeSpentDelta,
      lastAccessed: updateData.lastAccessed || new Date().toISOString(),
      ts: Date.now(),
    };
    
    // If offline, add to outbox immediately
    if (isOffline) {
      addToOutbox(outboxEvent);
      setSyncStatus('offline-queued');
      return optimisticLessonProgress;
    }
    
    setSyncStatus('saving');
    setLastSyncError(null);
    
    // Store pending update for retry
    pendingUpdatesRef.current.set(updateId, {
      moduleId: resolvedModuleId,
      lessonId,
      clientEventId,
      optimisticData: optimisticLessonProgress,
      updateData,
      retryCount: 0,
    });
    
    // Try to sync with backend (with retry)
    const performUpdate = async (retryCount = 0) => {
      try {
        const result = await updateLessonProgress({
          lessonId,
          ...updateData,
        });
        
        // Mark event as confirmed
        markAsConfirmed(clientEventId, result);
        
        // Remove from outbox if it was there
        removeFromOutbox(clientEventId);
        
        // Reconcile with backend response
        setProgressByModule(prev => {
          const moduleData = prev[resolvedModuleId] || {
            learningProgress: null,
            lessonsById: {},
          };
          
          // Update lesson progress
          const updatedLessonsById = {
            ...moduleData.lessonsById,
            [lessonId]: result.lessonProgress,
          };
          
          // Update learning progress if provided
          const updatedLearningProgress = result.moduleProgress
            ? {
                ...moduleData.learningProgress,
                timeSpent: result.moduleProgress.timeSpent,
                score: result.moduleProgress.score,
                completedAt: result.moduleProgress.completedAt,
                updatedAt: new Date().toISOString(),
              }
            : moduleData.learningProgress;
          
          return {
            ...prev,
            [resolvedModuleId]: {
              learningProgress: updatedLearningProgress,
              lessonsById: updatedLessonsById,
            },
          };
        });
        
        // Remove from pending updates
        pendingUpdatesRef.current.delete(updateId);
        
        // Check if there are more pending updates
        if (pendingUpdatesRef.current.size === 0) {
          setSyncStatus('saved');
        }
        
        return result;
      } catch (error) {
        const isNetworkError = error.isNetworkError || 
                              error.name === 'NetworkError' ||
                              (error.message && error.message.includes('conectar'));
        
        // Handle 404 (Lesson not found) - may be temporary or lesson not yet created in backend
        const isNotFound = error.status === 404 || 
                          error.code === 'LESSON_NOT_FOUND' ||
                          (error.message && error.message.includes('not found'));
        
        // If network error, add to outbox
        if (isNetworkError) {
          addToOutbox(outboxEvent);
          setSyncStatus('offline-queued');
          
          // Don't retry immediately if offline - will be handled by reconciliation
          if (retryCount < MAX_RETRIES && navigator.onLine) {
            setTimeout(() => {
              performUpdate(retryCount + 1);
            }, RETRY_DELAY_MS * (retryCount + 1));
          }
          
          return null;
        } else if (isNotFound) {
          // Lesson not found - keep optimistic update and add to outbox for later retry
          // This can happen if the lesson hasn't been created in the backend yet
          console.warn(`[useProgressUpdater] Lesson "${lessonId}" not found in backend. Adding to outbox for later sync.`);
          
          addToOutbox(outboxEvent);
          setSyncStatus('offline-queued');
          setLastSyncError(null); // Don't show error to user, just queue for later
          
          // Don't revert optimistic update - keep it in local state
          // Remove from pending updates but keep the optimistic state
          pendingUpdatesRef.current.delete(updateId);
          
          // Don't throw error - allow user to continue working
          return null;
        } else {
          // Failed after retries or other error
          console.error('[useProgressUpdater] Failed to update lesson progress:', error);
          setSyncStatus('error');
          setLastSyncError(error.message || 'Error al actualizar progreso');
          
          // Only revert optimistic update for non-recoverable errors
          // For recoverable errors (like temporary server issues), keep the optimistic update
          const isRecoverableError = error.status >= 500 || 
                                     error.status === 503 || 
                                     error.status === 502;
          
          if (!isRecoverableError) {
            // Revert optimistic update for client errors (400, 401, 403, etc.)
            setProgressByModule(prev => {
              const moduleData = prev[resolvedModuleId];
              if (!moduleData) return prev;
              
              const revertedLessonsById = { ...moduleData.lessonsById };
              delete revertedLessonsById[lessonId];
              
              return {
                ...prev,
                [resolvedModuleId]: {
                  ...moduleData,
                  lessonsById: revertedLessonsById,
                },
              };
            });
          } else {
            // For recoverable errors, add to outbox instead of reverting
            addToOutbox(outboxEvent);
            setSyncStatus('offline-queued');
          }
          
          pendingUpdatesRef.current.delete(updateId);
          
          // Only throw error if it's not recoverable
          if (!isRecoverableError) {
            throw error;
          }
          
          return null;
        }
      }
    };
    
    // Start update (will retry automatically on network errors)
    performUpdate().catch(() => {
      // Error already handled in performUpdate
    });
    
    return optimisticLessonProgress;
  }, [currentModuleId, progressByModuleRef, setProgressByModule, setSyncStatus, setLastSyncError]);

  return { updateLessonProgressAction };
};


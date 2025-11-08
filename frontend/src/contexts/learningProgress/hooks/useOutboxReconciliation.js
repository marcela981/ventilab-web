import { useCallback, useEffect } from 'react';
import { updateLessonProgress } from '@/services/api/progressService';
import {
  getOutboxEvents,
  removeFromOutbox,
  markAsConfirmed,
  isConfirmed,
  cleanupOldConfirmations,
} from '@/utils/progressOutbox';

/**
 * Custom hook to handle outbox reconciliation
 */
export const useOutboxReconciliation = ({
  setProgressByModule,
  setSyncStatus,
  loadModuleProgress,
}) => {
  /**
   * Reconcile outbox events with backend
   * Processes events in order and removes only confirmed ones
   */
  const reconcileOutbox = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return;
    }
    
    const events = getOutboxEvents();
    if (events.length === 0) {
      return;
    }
    
    console.log(`[useOutboxReconciliation] Reconciling ${events.length} outbox events...`);
    setSyncStatus('saving');
    
    const confirmedIds = [];
    const affectedModuleIds = new Set();
    
    // Process events in order
    for (const event of events) {
      // Skip if already confirmed
      if (isConfirmed(event.clientEventId)) {
        confirmedIds.push(event.clientEventId);
        affectedModuleIds.add(event.moduleId);
        continue;
      }
      
      try {
        const result = await updateLessonProgress({
          lessonId: event.lessonId,
          progress: event.progress,
          completed: event.completed,
          timeSpentDelta: event.timeSpentDelta,
          lastAccessed: event.lastAccessed,
        });
        
        // Mark as confirmed
        markAsConfirmed(event.clientEventId, result);
        confirmedIds.push(event.clientEventId);
        affectedModuleIds.add(event.moduleId);
        
        // Update state with server response
        setProgressByModule(prev => {
          const moduleData = prev[event.moduleId] || {
            learningProgress: null,
            lessonsById: {},
          };
          
          // Update lesson progress
          const updatedLessonsById = {
            ...moduleData.lessonsById,
            [event.lessonId]: result.lessonProgress,
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
            [event.moduleId]: {
              learningProgress: updatedLearningProgress,
              lessonsById: updatedLessonsById,
            },
          };
        });
      } catch (error) {
        console.error(`[useOutboxReconciliation] Failed to reconcile event ${event.clientEventId}:`, error);
        // Continue with next event even if one fails
      }
    }
    
    // Remove confirmed events from outbox
    if (confirmedIds.length > 0) {
      removeFromOutbox(confirmedIds);
      console.log(`[useOutboxReconciliation] Reconciled ${confirmedIds.length} events`);
    }
    
    // Cleanup old confirmations
    cleanupOldConfirmations();
    
    // Update sync status
    const remainingEvents = getOutboxEvents();
    if (remainingEvents.length === 0) {
      setSyncStatus('saved');
    } else {
      setSyncStatus('offline-queued');
    }
    
    // Reload affected modules to refresh aggregates
    for (const moduleId of affectedModuleIds) {
      if (moduleId) {
        try {
          await loadModuleProgress(moduleId, { force: true });
        } catch (error) {
          console.warn(`[useOutboxReconciliation] Failed to reload module ${moduleId} after reconciliation:`, error);
        }
      }
    }
  }, [setProgressByModule, setSyncStatus, loadModuleProgress]);

  // Online/offline handlers
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    const handleOnline = async () => {
      // Reconcile outbox when coming back online
      const outboxEvents = getOutboxEvents();
      if (outboxEvents.length > 0) {
        setSyncStatus('saving');
        await reconcileOutbox();
      }
    };
    
    const handleOffline = () => {
      setSyncStatus('offline-queued');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial reconciliation on mount if online
    if (navigator.onLine) {
      const outboxEvents = getOutboxEvents();
      if (outboxEvents.length > 0) {
        handleOnline();
      }
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reconcileOutbox, setSyncStatus]);

  return { reconcileOutbox };
};


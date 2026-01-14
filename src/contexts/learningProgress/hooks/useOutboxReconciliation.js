import { useCallback, useEffect } from 'react';
import { updateLessonProgress } from '@/services/api/progressService';
import {
  getOutboxEvents,
  removeFromOutbox,
  markAsConfirmed,
  isConfirmed,
  cleanupOldConfirmations,
} from '@/utils/progressOutbox';
import { 
  RECONCILIATION_DELAY_MS, 
  MAX_RECONCILIATION_BATCH_SIZE, 
  RATE_LIMIT_RETRY_DELAY_MS,
  MAX_RETRY_ATTEMPTS 
} from '../constants';

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    
    // Limit batch size to prevent rate limiting
    const eventsToProcess = events.slice(0, MAX_RECONCILIATION_BATCH_SIZE);
    const remainingEventCount = events.length - eventsToProcess.length;
    
    console.log(
      `[useOutboxReconciliation] Reconciling ${eventsToProcess.length} outbox events` +
      (remainingEventCount > 0 ? ` (${remainingEventCount} remaining for next batch)` : '') + '...'
    );
    setSyncStatus('saving');
    
    const confirmedIds = [];
    const affectedModuleIds = new Set();
    const eventsToRemove = []; // Events that should be removed (confirmed or permanently failed)
    
    // Process events in order with delays
    for (let i = 0; i < eventsToProcess.length; i++) {
      const event = eventsToProcess[i];
      
      // Add delay between requests to prevent rate limiting (except for the first one)
      if (i > 0) {
        await delay(RECONCILIATION_DELAY_MS);
      }
      
      // Skip if already confirmed
      if (isConfirmed(event.clientEventId)) {
        confirmedIds.push(event.clientEventId);
        affectedModuleIds.add(event.moduleId);
        eventsToRemove.push(event.clientEventId);
        continue;
      }
      
      try {
        const result = await updateLessonProgress({
          lessonId: event.lessonId,
          progress: event.progress,
          completed: event.completed,
          completionPercentage: event.completionPercentage,
          timeSpentDelta: event.timeSpentDelta,
          lastAccessed: event.lastAccessed,
        });
        
        // Mark as confirmed
        markAsConfirmed(event.clientEventId, result);
        confirmedIds.push(event.clientEventId);
        affectedModuleIds.add(event.moduleId);
        eventsToRemove.push(event.clientEventId);
        
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
        // Check if it's a rate limit error (429)
        const isRateLimited = error.status === 429 || 
                             error.code === 'RATE_LIMIT_EXCEEDED' ||
                             (error.message && (
                               error.message.toLowerCase().includes('too many requests') ||
                               error.message.toLowerCase().includes('rate limit')
                             ));
        
        if (isRateLimited) {
          // Handle rate limiting - wait and stop processing this batch
          const retryAfter = error.retryAfter || 
                            error.payload?.retryAfter || 
                            error.payload?.error?.retryAfter ||
                            RATE_LIMIT_RETRY_DELAY_MS / 1000; // Convert to seconds
          
          const waitTime = Math.max(retryAfter * 1000, RATE_LIMIT_RETRY_DELAY_MS);
          
          console.warn(
            `[useOutboxReconciliation] Rate limited. Stopping batch processing. ` +
            `Will retry after ${retryAfter}s. ` +
            `${eventsToProcess.length - i - 1} events remaining in this batch.`
          );
          
          // Update sync status to indicate rate limiting
          setSyncStatus('offline-queued');
          
          // Wait for the specified time before continuing
          // This helps prevent immediate retry which would cause more rate limiting
          console.log(`[useOutboxReconciliation] Waiting ${waitTime}ms before continuing...`);
          await delay(waitTime);
          
          // Stop processing this batch - remaining events will be processed in next reconciliation cycle
          // The next reconciliation will be triggered by:
          // 1. Manual call to reconcileOutbox
          // 2. Online event handler
          // 3. Periodic check (if implemented elsewhere)
          console.log(`[useOutboxReconciliation] Batch processing stopped due to rate limit. ${eventsToProcess.length - i - 1} events will be processed in next cycle.`);
          break;
        }
        
        // Check if it's a 404 error (Lesson not found)
        const isNotFound = error.status === 404 || 
                          error.code === 'LESSON_NOT_FOUND' ||
                          (error.message && error.message.toLowerCase().includes('not found'));
        
        if (isNotFound) {
          // Track retry attempts for 404 errors
          const retryCount = (event.retryCount || 0) + 1;
          event.retryCount = retryCount;
          event.lastRetryAt = Date.now();
          
          // Only log warning, don't treat as critical error
          if (retryCount <= 3) {
            // Only log first few attempts to reduce console noise
            console.warn(
              `[useOutboxReconciliation] Lesson "${event.lessonId}" not found in backend. ` +
              `Retry attempt ${retryCount}/${MAX_RETRY_ATTEMPTS} for event ${event.clientEventId}`
            );
          }
          
          // If we've exceeded max retries, remove the event to prevent infinite retries
          if (retryCount >= MAX_RETRY_ATTEMPTS) {
            console.warn(
              `[useOutboxReconciliation] Removing event ${event.clientEventId} after ${retryCount} failed attempts. ` +
              `Lesson "${event.lessonId}" does not exist in backend.`
            );
            eventsToRemove.push(event.clientEventId);
          } else {
            // Update event in outbox with new retry count
            try {
              const updatedEvents = getOutboxEvents();
              const eventIndex = updatedEvents.findIndex(e => e.clientEventId === event.clientEventId);
              if (eventIndex >= 0) {
                updatedEvents[eventIndex] = { ...event, retryCount, lastRetryAt: event.lastRetryAt };
                localStorage.setItem('progress.outbox.v2', JSON.stringify(updatedEvents));
              }
            } catch (err) {
              console.error('[useOutboxReconciliation] Failed to update retry count:', err);
            }
          }
        } else {
          // For other errors, log but continue processing
          const isNetworkError = error.isNetworkError || 
                                error.name === 'NetworkError' ||
                                (error.message && error.message.includes('conectar'));
          
          if (!isNetworkError) {
            // Log non-network errors for debugging
            console.error(
              `[useOutboxReconciliation] Failed to reconcile event ${event.clientEventId}:`,
              error.message || error
            );
            
            // Track retry count for non-network errors
            const retryCount = (event.retryCount || 0) + 1;
            if (retryCount >= MAX_RETRY_ATTEMPTS) {
              console.warn(
                `[useOutboxReconciliation] Removing event ${event.clientEventId} after ${retryCount} failed attempts.`
              );
              eventsToRemove.push(event.clientEventId);
            } else {
              // Update retry count
              try {
                const updatedEvents = getOutboxEvents();
                const eventIndex = updatedEvents.findIndex(e => e.clientEventId === event.clientEventId);
                if (eventIndex >= 0) {
                  updatedEvents[eventIndex] = { 
                    ...event, 
                    retryCount, 
                    lastRetryAt: Date.now() 
                  };
                  localStorage.setItem('progress.outbox.v2', JSON.stringify(updatedEvents));
                }
              } catch (err) {
                console.error('[useOutboxReconciliation] Failed to update retry count:', err);
              }
            }
          }
          // For network errors, keep the event for retry without logging (expected behavior)
        }
        
        // Continue with next event even if one fails - errors are handled silently
      }
    }
    
    // Remove confirmed and permanently failed events from outbox
    if (eventsToRemove.length > 0) {
      removeFromOutbox(eventsToRemove);
      const removedCount = eventsToRemove.length;
      const confirmedCount = confirmedIds.length;
      const failedCount = removedCount - confirmedCount;
      
      if (confirmedCount > 0) {
        console.log(`[useOutboxReconciliation] Reconciled ${confirmedCount} events`);
      }
      if (failedCount > 0) {
        console.warn(`[useOutboxReconciliation] Removed ${failedCount} permanently failed events`);
      }
    }
    
    // Cleanup old confirmations
    cleanupOldConfirmations();
    
    // Update sync status
    const eventsStillPending = getOutboxEvents();
    if (eventsStillPending.length === 0) {
      setSyncStatus('saved');
    } else {
      setSyncStatus('offline-queued');
      // Note: Next reconciliation will be triggered by:
      // 1. The online event handler (when connection is restored)
      // 2. Manual call to reconcileOutbox
      // 3. Periodic reconciliation (if implemented)
      // We don't automatically schedule here to avoid potential infinite loops
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
        try {
          await reconcileOutbox();
        } catch (error) {
          // Don't let reconciliation errors break the online handler
          console.error('[useOutboxReconciliation] Error during reconciliation:', error);
          // Update sync status based on remaining events
          const eventsStillPending = getOutboxEvents();
          if (eventsStillPending.length > 0) {
            setSyncStatus('offline-queued');
          } else {
            setSyncStatus('idle');
          }
        }
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


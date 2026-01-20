/**
 * useLessonProgress Hook
 * 
 * Manages automatic progress tracking for a lesson including:
 * - Scroll position tracking
 * - Auto-save with debouncing
 * - Resume functionality
 * - Auto-completion
 * - Time tracking
 */

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import {
  getLessonProgress,
  updateLessonProgress,
  type UpdateLessonProgressParams,
} from '@/services/progressService';
import { debounce } from '@/utils/debounce';
import { getAuthToken } from '@/services/authService';

// ============================================
// Type Definitions
// ============================================

interface UseLessonProgressOptions {
  lessonId: string;
  moduleId: string;
  contentRef: RefObject<HTMLElement>;
  onComplete?: () => void; // Callback when lesson auto-completes
  autoSaveThreshold?: number; // Percentage increase needed to trigger save (default: 10)
  autoCompleteThreshold?: number; // Percentage to trigger auto-complete (default: 90)
}

interface UseLessonProgressReturn {
  localProgress: number;
  isSaving: boolean;
  isCompleted: boolean;
  showResumeAlert: boolean;
  saveProgress: (forceComplete?: boolean) => Promise<void>;
  savePageProgress: (currentPage: number, totalPages: number) => Promise<void>;
  dismissResumeAlert: () => void;
}

// ============================================
// Hook Implementation
// ============================================

export function useLessonProgress({
  lessonId,
  moduleId,
  contentRef,
  onComplete,
    autoSaveThreshold = 5, // Guardar cada 5% de progreso
    autoCompleteThreshold = 90,
}: UseLessonProgressOptions): UseLessonProgressReturn {
  // State
  const [localProgress, setLocalProgress] = useState(0);
  const [lastSavedProgress, setLastSavedProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResumeAlert, setShowResumeAlert] = useState(false);
  
  // Refs for tracking
  const startTimeRef = useRef<number>(Date.now());
  const hasInitializedRef = useRef(false);
  const scrollPositionRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Calculate scroll percentage based on content position
   */
  const calculateScrollPercentage = useCallback((): number => {
    if (!contentRef.current) return 0;

    const element = contentRef.current;
    const scrollTop = element.scrollTop || window.scrollY;
    const scrollHeight = element.scrollHeight || document.documentElement.scrollHeight;
    const clientHeight = element.clientHeight || window.innerHeight;

    // Calculate percentage scrolled
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 0) return 100; // Content fits in viewport

    const percentage = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
    return Math.round(percentage);
  }, [contentRef]);

  /**
   * Save progress to backend
   */
  const saveProgress = useCallback(async (forceComplete = false) => {
    if (isSaving) {
      console.log('[useLessonProgress] Already saving, skipping...');
      return;
    }

    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const completionPercentage = forceComplete ? 100 : localProgress;

    // Always save to localStorage first (immediate feedback)
    try {
      localStorage.setItem(`lesson_progress_${lessonId}`, JSON.stringify({
        progress: completionPercentage,
        scrollPosition: scrollPositionRef.current,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('[useLessonProgress] localStorage save failed:', e);
    }

    // Check if token is available before saving to backend
    const token = getAuthToken();
    if (!token) {
      console.warn('[useLessonProgress] No auth token available, saved to localStorage only. Will sync when token is available.');
      // Mark as failed save so it can be synced later
      try {
        localStorage.setItem(`lesson_progress_${lessonId}_failed`, JSON.stringify({
          progress: completionPercentage,
          scrollPosition: scrollPositionRef.current,
          timeSpent,
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.error('[useLessonProgress] Failed to mark for sync:', e);
      }
      return;
    }

    try {
      setIsSaving(true);

      const data: UpdateLessonProgressParams = {
        completionPercentage,
        timeSpent,
        moduleId, // Include moduleId if available
        scrollPosition: scrollPositionRef.current,
      };

      console.log('[useLessonProgress] Saving to backend:', {
        lessonId,
        progress: completionPercentage,
        timeSpent,
        hasToken: !!token,
      });

      await updateLessonProgress(lessonId, data);
      
      setLastSavedProgress(completionPercentage);
      
      // Remove failed save marker if it exists
      try {
        localStorage.removeItem(`lesson_progress_${lessonId}_failed`);
      } catch (e) {
        // Ignore
      }

      console.log('[useLessonProgress] ✅ Successfully saved to backend:', {
        lessonId,
        progress: completionPercentage,
        timeSpent,
      });
    } catch (error: any) {
      console.error('[useLessonProgress] ❌ Save error:', error);
      
      // Mark as failed save so it can be retried later
      try {
        localStorage.setItem(`lesson_progress_${lessonId}_failed`, JSON.stringify({
          progress: completionPercentage,
          scrollPosition: scrollPositionRef.current,
          timeSpent,
          timestamp: Date.now(),
          error: error?.message || 'Unknown error',
        }));
        console.log('[useLessonProgress] Marked for retry on next sync');
      } catch (e) {
        console.error('[useLessonProgress] Failed to mark for retry:', e);
      }
    } finally {
      setIsSaving(false);
    }
  }, [lessonId, localProgress, isSaving]);

  /**
   * Debounced save function
   * Only saves if progress increased by threshold
   */
  const debouncedSave = useCallback(
    debounce((progress: number) => {
      const progressDiff = progress - lastSavedProgress;
      
      console.log('[useLessonProgress] Debounced save check:', {
        currentProgress: progress,
        lastSaved: lastSavedProgress,
        diff: progressDiff,
        threshold: autoSaveThreshold,
        shouldSave: progressDiff >= autoSaveThreshold || progress >= 100,
      });
      
      // Only save if progress increased by threshold or reached 100%
      if (progressDiff >= autoSaveThreshold || progress >= 100) {
        console.log('[useLessonProgress] Triggering save...');
        saveProgress();
      } else {
        console.log('[useLessonProgress] Progress change too small, not saving yet');
      }
    }, 1000), // Wait 1 second after last scroll (más frecuente)
    [lastSavedProgress, autoSaveThreshold, saveProgress]
  );

  /**
   * Save progress based on page number (for paginated content)
   * This is the PRIMARY way to save progress for step/page-based navigation
   */
  const savePageProgress = useCallback(async (currentPage: number, totalPages: number) => {
    if (totalPages <= 0) return;

    // Calculate percentage from page position
    const pageProgress = Math.round(((currentPage + 1) / totalPages) * 100);

    console.log('[useLessonProgress] 📄 Page progress:', {
      currentPage: currentPage + 1,
      totalPages,
      percentage: pageProgress,
    });

    // Update local state immediately
    setLocalProgress(pageProgress);

    // Check if token is available
    const token = getAuthToken();
    if (!token) {
      console.warn('[useLessonProgress] No auth token, saving to localStorage only');
      try {
        localStorage.setItem(`lesson_progress_${lessonId}`, JSON.stringify({
          progress: pageProgress,
          currentPage,
          totalPages,
          scrollPosition: 0,
          timestamp: Date.now(),
        }));
        localStorage.setItem(`lesson_progress_${lessonId}_failed`, JSON.stringify({
          progress: pageProgress,
          currentPage,
          totalPages,
          scrollPosition: 0,
          timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.error('[useLessonProgress] localStorage save failed:', e);
      }
      return;
    }

    // Only save to backend if progress increased significantly or reached 100%
    const progressDiff = pageProgress - lastSavedProgress;
    if (progressDiff < autoSaveThreshold && pageProgress < 100) {
      console.log('[useLessonProgress] Progress change too small, skipping backend save');
      return;
    }

    try {
      setIsSaving(true);

      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const data: UpdateLessonProgressParams = {
        completionPercentage: pageProgress,
        timeSpent,
        moduleId,
        scrollPosition: 0,
      };

      console.log('[useLessonProgress] 🚀 Saving page progress to backend:', {
        lessonId,
        progress: pageProgress,
        page: `${currentPage + 1}/${totalPages}`,
      });

      await updateLessonProgress(lessonId, data);

      setLastSavedProgress(pageProgress);

      // Save to localStorage as backup
      localStorage.setItem(`lesson_progress_${lessonId}`, JSON.stringify({
        progress: pageProgress,
        currentPage,
        totalPages,
        scrollPosition: 0,
        timestamp: Date.now(),
      }));

      // Clear any failed save markers
      localStorage.removeItem(`lesson_progress_${lessonId}_failed`);

      console.log('[useLessonProgress] ✅ Page progress saved successfully');

      // Check for auto-completion
      if (pageProgress >= autoCompleteThreshold && !isCompleted) {
        setIsCompleted(true);
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error: any) {
      console.error('[useLessonProgress] ❌ Save page progress error:', error);
      // Mark for retry
      try {
        localStorage.setItem(`lesson_progress_${lessonId}_failed`, JSON.stringify({
          progress: pageProgress,
          currentPage,
          totalPages,
          scrollPosition: 0,
          timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
          timestamp: Date.now(),
          error: error?.message || 'Unknown error',
        }));
      } catch (e) {
        // Ignore localStorage errors
      }
    } finally {
      setIsSaving(false);
    }
  }, [lessonId, moduleId, lastSavedProgress, autoSaveThreshold, autoCompleteThreshold, isCompleted, onComplete]);

  /**
   * Handle auto-completion
   */
  const handleAutoComplete = useCallback(async () => {
    if (isCompleted) return;

    console.log('[useLessonProgress] Auto-completing lesson');

    setIsCompleted(true);
    await saveProgress(true);

    // Trigger completion callback (e.g., confetti)
    if (onComplete) {
      onComplete();
    }
  }, [isCompleted, saveProgress, onComplete]);

  /**
   * Initialize: Load previous progress
   */
  useEffect(() => {
    if (hasInitializedRef.current) return;

    const initializeProgress = async () => {
      // Wait for auth token to be available (max 5 seconds)
      let tokenAvailable = getAuthToken();
      if (!tokenAvailable) {
        // Wait up to 5 seconds for token
        const maxWait = 5000;
        const startTime = Date.now();
        while (!tokenAvailable && (Date.now() - startTime) < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 100));
          tokenAvailable = getAuthToken();
        }
      }

      // Check localStorage first (even if token is available, to restore immediately)
      const cached = localStorage.getItem(`lesson_progress_${lessonId}`);
      if (cached) {
        const { progress: cachedProgress, scrollPosition } = JSON.parse(cached);
        setLocalProgress(cachedProgress);
        setLastSavedProgress(cachedProgress);
        
        if (scrollPosition && contentRef.current) {
          setTimeout(() => {
            if (contentRef.current) {
              contentRef.current.scrollTop = scrollPosition;
            } else {
              window.scrollTo(0, scrollPosition);
            }
          }, 100);
        }
      }

      if (!tokenAvailable) {
        console.warn('[useLessonProgress] No auth token available, using localStorage only');
        hasInitializedRef.current = true;
        return;
      }

      hasInitializedRef.current = true;

      try {
        // Try to get progress from backend
        const progress = await getLessonProgress(lessonId);
        
        if (progress && progress.completionPercentage > 0) {
          setLocalProgress(progress.completionPercentage);
          setLastSavedProgress(progress.completionPercentage);
          setIsCompleted(progress.completed);
          
          // Restore scroll position
          if (progress.scrollPosition && contentRef.current) {
            setTimeout(() => {
              if (contentRef.current) {
                contentRef.current.scrollTop = progress.scrollPosition || 0;
              } else {
                window.scrollTo(0, progress.scrollPosition || 0);
              }
            }, 100);
          }
          
          // Show resume alert if progress > 5%
          if (progress.completionPercentage > 5 && !progress.completed) {
            setShowResumeAlert(true);
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
              setShowResumeAlert(false);
            }, 5000);
          }
        } else {
          // Check localStorage fallback
          const cached = localStorage.getItem(`lesson_progress_${lessonId}`);
          if (cached) {
            const { progress: cachedProgress, scrollPosition } = JSON.parse(cached);
            setLocalProgress(cachedProgress);
            setLastSavedProgress(cachedProgress);
            
            if (scrollPosition && contentRef.current) {
              setTimeout(() => {
                if (contentRef.current) {
                  contentRef.current.scrollTop = scrollPosition;
                } else {
                  window.scrollTo(0, scrollPosition);
                }
              }, 100);
            }
          }
        }
      } catch (error) {
        console.error('[useLessonProgress] Initialize error:', error);
      }
    };

    initializeProgress();
  }, [lessonId, contentRef]);

  /**
   * Track scroll position and update progress
   */
  useEffect(() => {
    if (!contentRef.current && typeof window === 'undefined') return;

    const handleScroll = () => {
      const percentage = calculateScrollPercentage();
      
      // Update scroll position ref
      scrollPositionRef.current = contentRef.current?.scrollTop || window.scrollY;
      
      // Only update if progress increased
      if (percentage > localProgress) {
        console.log('[useLessonProgress] Scroll progress:', {
          previous: localProgress,
          current: percentage,
          increased: percentage > localProgress,
        });
        
        setLocalProgress(percentage);
        
        // Trigger debounced save
        debouncedSave(percentage);
        
        // Check for auto-completion
        if (percentage >= autoCompleteThreshold && !isCompleted) {
          console.log('[useLessonProgress] Auto-completion threshold reached:', percentage);
          handleAutoComplete();
        }
      }
    };

    // Attach scroll listener
    const element = contentRef.current || window;
    element.addEventListener('scroll', handleScroll as any);

    return () => {
      element.removeEventListener('scroll', handleScroll as any);
    };
  }, [
    contentRef,
    localProgress,
    isCompleted,
    autoCompleteThreshold,
    calculateScrollPercentage,
    debouncedSave,
    handleAutoComplete,
  ]);

  /**
   * Save on unmount (cleanup) and before page unload
   */
  useEffect(() => {
    // Save before page unload
    const handleBeforeUnload = () => {
      if (localProgress > lastSavedProgress) {
        console.log('[useLessonProgress] Saving on page unload...', {
          progress: localProgress,
          lastSaved: lastSavedProgress,
        });
        
        // Save to localStorage immediately (always works, syncs later)
        try {
          localStorage.setItem(`lesson_progress_${lessonId}`, JSON.stringify({
            progress: localProgress,
            scrollPosition: scrollPositionRef.current,
            timestamp: Date.now(),
          }));
          
          // Mark as failed save so it syncs when token is available
          localStorage.setItem(`lesson_progress_${lessonId}_failed`, JSON.stringify({
            progress: localProgress,
            scrollPosition: scrollPositionRef.current,
            timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
            timestamp: Date.now(),
          }));
        } catch (err) {
          console.error('[useLessonProgress] Failed to save on unload:', err);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Cancel any pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Final save on unmount (when component is removed)
      const finalSave = async () => {
        if (localProgress > lastSavedProgress) {
          console.log('[useLessonProgress] Saving on unmount...', {
            progress: localProgress,
            lastSaved: lastSavedProgress,
          });
          
          const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
          
          try {
            await saveProgress(); // Use the saveProgress function which handles token check
          } catch (error) {
            console.error('[useLessonProgress] Unmount save error:', error);
          }
        }
      };
      
      finalSave();
    };
  }, [lessonId, localProgress, lastSavedProgress, saveProgress]);

  /**
   * Sync localStorage on reconnect or when token becomes available
   */
  useEffect(() => {
    const syncProgress = async () => {
      const token = getAuthToken();
      if (!token) return;

      // Check for failed saves in localStorage
      const failedSave = localStorage.getItem(`lesson_progress_${lessonId}_failed`);
      if (failedSave) {
        try {
          const { progress, scrollPosition, timeSpent } = JSON.parse(failedSave);
          
          await updateLessonProgress(lessonId, {
            completionPercentage: progress,
            timeSpent,
            moduleId,
            scrollPosition,
          });
          
          // Clear failed save after successful sync
          localStorage.removeItem(`lesson_progress_${lessonId}_failed`);
          
          console.log('[useLessonProgress] Synced offline progress');
        } catch (error) {
          console.error('[useLessonProgress] Sync error:', error);
        }
      }

      // Also sync regular cached progress if it's newer than what's on server
      const cached = localStorage.getItem(`lesson_progress_${lessonId}`);
      if (cached) {
        try {
          const { progress: cachedProgress, timestamp } = JSON.parse(cached);
          // Only sync if cached progress is significant (> 5%) and recent (within 24 hours)
          if (cachedProgress > 5 && timestamp && (Date.now() - timestamp) < 24 * 60 * 60 * 1000) {
            const serverProgress = await getLessonProgress(lessonId);
            // If server has less progress, sync the cached one
            if (!serverProgress || serverProgress.completionPercentage < cachedProgress) {
              await updateLessonProgress(lessonId, {
                completionPercentage: cachedProgress,
                timeSpent: 0, // Don't add time for cached progress
                moduleId,
                scrollPosition: JSON.parse(cached).scrollPosition || 0,
              });
              console.log('[useLessonProgress] Synced cached progress to server');
            }
          }
        } catch (error) {
          console.error('[useLessonProgress] Error syncing cached progress:', error);
        }
      }
    };

    // Check token periodically and sync when available
    const checkInterval = setInterval(() => {
      if (getAuthToken()) {
        syncProgress();
        clearInterval(checkInterval);
      }
    }, 1000);

    // Also sync on online event
    const handleOnline = () => {
      if (getAuthToken()) {
        syncProgress();
      }
    };

    window.addEventListener('online', handleOnline);
    
    // Initial sync attempt
    syncProgress();

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('online', handleOnline);
    };
  }, [lessonId]);

  /**
   * Dismiss resume alert
   */
  const dismissResumeAlert = useCallback(() => {
    setShowResumeAlert(false);
  }, []);

  return {
    localProgress,
    isSaving,
    isCompleted,
    showResumeAlert,
    saveProgress,
    savePageProgress,
    dismissResumeAlert,
  };
}

export default useLessonProgress;

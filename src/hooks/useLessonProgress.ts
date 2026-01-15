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
  saveProgress: () => Promise<void>;
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
  autoSaveThreshold = 10,
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
    if (isSaving) return;

    try {
      setIsSaving(true);

      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const completionPercentage = forceComplete ? 100 : localProgress;

      const data: UpdateLessonProgressParams = {
        completionPercentage,
        timeSpent,
        scrollPosition: scrollPositionRef.current,
      };

      await updateLessonProgress(lessonId, data);
      
      setLastSavedProgress(completionPercentage);
      
      // Store in localStorage as backup
      localStorage.setItem(`lesson_progress_${lessonId}`, JSON.stringify({
        progress: completionPercentage,
        scrollPosition: scrollPositionRef.current,
        timestamp: Date.now(),
      }));

      console.log('[useLessonProgress] Saved:', {
        lessonId,
        progress: completionPercentage,
        timeSpent,
      });
    } catch (error) {
      console.error('[useLessonProgress] Save error:', error);
      
      // Fallback: save to localStorage
      try {
        localStorage.setItem(`lesson_progress_${lessonId}_failed`, JSON.stringify({
          progress: localProgress,
          scrollPosition: scrollPositionRef.current,
          timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.error('[useLessonProgress] localStorage fallback failed:', e);
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
      
      // Only save if progress increased by threshold or reached 100%
      if (progressDiff >= autoSaveThreshold || progress >= 100) {
        saveProgress();
      }
    }, 2000), // Wait 2 seconds after last scroll
    [lastSavedProgress, autoSaveThreshold, saveProgress]
  );

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
    hasInitializedRef.current = true;

    const initializeProgress = async () => {
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
        setLocalProgress(percentage);
        
        // Trigger debounced save
        debouncedSave(percentage);
        
        // Check for auto-completion
        if (percentage >= autoCompleteThreshold && !isCompleted) {
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
   * Save on unmount (cleanup)
   */
  useEffect(() => {
    return () => {
      // Cancel any pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Final save on unmount
      const finalSave = async () => {
        if (localProgress > lastSavedProgress) {
          const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
          
          try {
            await updateLessonProgress(lessonId, {
              completionPercentage: localProgress,
              timeSpent,
              scrollPosition: scrollPositionRef.current,
            });
          } catch (error) {
            console.error('[useLessonProgress] Unmount save error:', error);
          }
        }
      };
      
      finalSave();
    };
  }, [lessonId, localProgress, lastSavedProgress]);

  /**
   * Sync localStorage on reconnect
   */
  useEffect(() => {
    const handleOnline = async () => {
      // Check for failed saves in localStorage
      const failedSave = localStorage.getItem(`lesson_progress_${lessonId}_failed`);
      if (failedSave) {
        try {
          const { progress, scrollPosition, timeSpent } = JSON.parse(failedSave);
          
          await updateLessonProgress(lessonId, {
            completionPercentage: progress,
            timeSpent,
            scrollPosition,
          });
          
          // Clear failed save after successful sync
          localStorage.removeItem(`lesson_progress_${lessonId}_failed`);
          
          console.log('[useLessonProgress] Synced offline progress');
        } catch (error) {
          console.error('[useLessonProgress] Sync error:', error);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
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
    dismissResumeAlert,
  };
}

export default useLessonProgress;

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

import { useState, useEffect, useRef, useCallback, useMemo, RefObject } from 'react';
import {
  getLessonProgress,
  updateLessonProgress,
  waitForAuthToken,
  type UpdateLessonProgressParams,
  type UpdateLessonProgressResult,
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
  isRateLimited: boolean; // New: tracks if we're currently rate limited
  showResumeAlert: boolean;
  saveProgress: (forceComplete?: boolean) => Promise<void>; // For scroll/time-based progress (may be throttled)
  saveStepProgress: (currentPage: number, totalPages: number, totalSteps?: number) => Promise<void>; // Always saves on step changes
  savePageProgress: (currentPage: number, totalPages: number, totalSteps?: number) => Promise<void>; // Backward compatibility wrapper
  saveTimeProgress: (forceComplete?: boolean) => Promise<void>; // For time-based updates (throttled)
  dismissResumeAlert: () => void;
  backendProgress: {
    completionPercentage: number;
    currentStep?: number;
    totalSteps?: number;
    completed: boolean;
  } | null;
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
  const [lastSavedStep, setLastSavedStep] = useState<number | null>(null); // Track last saved step for step-based saves
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false); // Track rate limiting state
  const [showResumeAlert, setShowResumeAlert] = useState(false);
  const [backendProgress, setBackendProgress] = useState<{
    completionPercentage: number;
    currentStep?: number;
    totalSteps?: number;
    completed: boolean;
  } | null>(null);
  
  // Refs for tracking
  const startTimeRef = useRef<number>(Date.now());
  const hasInitializedRef = useRef(false);
  const scrollPositionRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rateLimitCooldownRef = useRef<NodeJS.Timeout | null>(null); // Track rate limit cooldown timer

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
   * NOTE: This function is used for scroll-based tracking and may not have step data.
   * If step data is not available, we skip the backend call to avoid percentage-only updates.
   */
  const saveProgress = useCallback(async (forceComplete = false) => {
    if (isSaving) {
      console.log('[useLessonProgress] Already saving, skipping...');
      return;
    }

    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const completionPercentage = forceComplete ? 100 : localProgress;

    // Try to get step data from localStorage (from previous savePageProgress calls)
    let currentStep: number | undefined;
    let totalSteps: number | undefined;
    try {
      const cached = localStorage.getItem(`lesson_progress_${lessonId}`);
      if (cached) {
        const cachedData = JSON.parse(cached);
        currentStep = cachedData.currentStep;
        totalSteps = cachedData.totalSteps;
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Always save to localStorage first (immediate feedback)
    try {
      localStorage.setItem(`lesson_progress_${lessonId}`, JSON.stringify({
        progress: completionPercentage,
        scrollPosition: scrollPositionRef.current,
        currentStep,
        totalSteps,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('[useLessonProgress] localStorage save failed:', e);
    }

    // CRITICAL: Wait for auth token to be available (handles race condition with token bridge)
    console.log('[useLessonProgress] saveProgress: Waiting for auth token...');
    const token = await waitForAuthToken(5000); // Wait up to 5 seconds

    if (!token) {
      console.error('[useLessonProgress] ❌ saveProgress BLOCKED: Auth token not available after 5s wait');
      // Mark as failed save so it can be synced later
      try {
        localStorage.setItem(`lesson_progress_${lessonId}_failed`, JSON.stringify({
          progress: completionPercentage,
          scrollPosition: scrollPositionRef.current,
          currentStep,
          totalSteps,
          timeSpent,
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.error('[useLessonProgress] Failed to mark for sync:', e);
      }
      return;
    }

    console.log('[useLessonProgress] ✅ saveProgress: Auth token ready');

    // CRITICAL: Do not send percentage-only updates - require step data
    if (!currentStep || !totalSteps) {
      console.warn('[useLessonProgress] Skipping backend save: step data not available. Use savePageProgress for step-based updates.');
      return;
    }

    // If rate limited, skip save attempt (will retry after cooldown)
    if (isRateLimited) {
      console.log('[useLessonProgress] Rate limited - skipping save. Progress saved locally and will sync after cooldown.');
      return;
    }

    try {
      setIsSaving(true);
      setIsRateLimited(false); // Clear rate limit state when attempting save

      const data: UpdateLessonProgressParams = {
        completionPercentage,
        currentStep,
        totalSteps,
        timeSpent,
        moduleId, // Include moduleId if available
        scrollPosition: scrollPositionRef.current,
      };

      console.log('[useLessonProgress] Saving to backend:', {
        lessonId,
        progress: completionPercentage,
        step: `${currentStep}/${totalSteps}`,
        timeSpent,
        hasToken: !!token,
      });

      const result: UpdateLessonProgressResult = await updateLessonProgress(lessonId, data);
      
      // Handle rate limiting response (429) - NOT an error, just a temporary pause
      if (!result.success && result.rateLimited) {
        console.warn('[useLessonProgress] ⚠️ Rate limited (429). Progress is safe locally. Will retry after cooldown.');
        
        setIsRateLimited(true);
        
        // Calculate cooldown time (default 30 seconds if not provided)
        const cooldownMs = (result.retryAfter || 30) * 1000;
        
        // Clear any existing cooldown timer
        if (rateLimitCooldownRef.current) {
          clearTimeout(rateLimitCooldownRef.current);
        }
        
        // Set cooldown timer to automatically resume saving
        rateLimitCooldownRef.current = setTimeout(() => {
          console.log('[useLessonProgress] Rate limit cooldown expired. Resuming automatic saves.');
          setIsRateLimited(false);
          
          // Retry saving if there's unsaved progress
          if (localProgress > lastSavedProgress) {
            console.log('[useLessonProgress] Retrying save after rate limit cooldown...');
            saveProgress();
          }
        }, cooldownMs);
        
        // Progress is NOT lost - it's saved locally and will retry automatically
        // No error is thrown, so the UI doesn't show an error message
        return;
      }
      
      // Success case - update state with backend response
      if (result.success) {
        setLastSavedProgress(completionPercentage);
        
        // Dispatch custom event to notify context and other components
        // This ensures module and level progress update immediately
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('progress:updated', {
            detail: {
              lessonId,
              moduleId,
              progress: completionPercentage / 100, // Convert to 0-1
              completionPercentage,
            },
          }));
        }
        
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
      }
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
   * Debounced save function for scroll/time-based progress
   * Only saves if progress increased by threshold
   * Automatically skips if rate limited
   * 
   * NOTE: This is ONLY for scroll-based tracking, NOT for step navigation.
   * Step navigation uses saveStepProgress() which always persists immediately.
   */
  const debouncedSave = useMemo(
    () => debounce((progress: number) => {
      // Skip if rate limited - will retry after cooldown
      if (isRateLimited) {
        console.log('[useLessonProgress] Debounced save skipped - rate limited');
        return;
      }

      const progressDiff = progress - lastSavedProgress;
      
      console.log('[useLessonProgress] Debounced save check (scroll/time-based):', {
        currentProgress: progress,
        lastSaved: lastSavedProgress,
        diff: progressDiff,
        threshold: autoSaveThreshold,
        shouldSave: progressDiff >= autoSaveThreshold || progress >= 100,
      });
      
      // Only save if progress increased by threshold or reached 100%
      // This throttling applies ONLY to scroll/time-based updates, NOT step navigation
      if (progressDiff >= autoSaveThreshold || progress >= 100) {
        console.log('[useLessonProgress] Triggering time-based save...');
        saveProgress();
      } else {
        console.log('[useLessonProgress] Scroll progress change too small, throttling save (this is OK for scroll-based tracking)');
      }
    }, 1000), // Wait 1 second after last scroll
    [lastSavedProgress, autoSaveThreshold, saveProgress, isRateLimited]
  );

  /**
   * Save step progress - ALWAYS persists when currentStep changes
   * This is the PRIMARY way to save progress for step/page-based navigation
   * 
   * CRITICAL: This function ALWAYS saves to backend when currentStep changes,
   * regardless of percentage delta. Step navigation must be persisted immediately.
   * 
   * ALWAYS sends currentStep and totalSteps to backend (required fields)
   * - currentStep = currentPage + 1 (1-based)
   * - totalSteps = totalSteps parameter if provided, otherwise totalPages
   * - completionPercentage is derived from currentStep/totalSteps
   */
  const saveStepProgress = useCallback(async (currentPage: number, totalPages: number, totalSteps?: number) => {
    if (totalPages <= 0) {
      console.warn('[useLessonProgress] saveStepProgress ABORTED: totalPages is invalid', { totalPages });
      return;
    }

    // Calculate step values (backend requires these)
    const currentStep = currentPage + 1; // 1-based step number
    const stepsTotal = totalSteps || totalPages; // Use provided totalSteps or fallback to totalPages
    
    if (stepsTotal <= 0) {
      console.warn('[useLessonProgress] saveStepProgress ABORTED: totalSteps is invalid', { totalSteps, totalPages });
      return;
    }

    // Calculate percentage from step position (derived from currentStep/totalSteps)
    const pageProgress = Math.round((currentStep / stepsTotal) * 100);

    console.log('[useLessonProgress] 📄 Step progress:', {
      currentPage: currentPage + 1,
      totalPages,
      currentStep,
      totalSteps: stepsTotal,
      percentage: pageProgress,
      lastSavedStep,
    });

    // Update local state immediately
    setLocalProgress(pageProgress);

    // CRITICAL: Wait for auth token to be available (handles race condition with token bridge)
    // This ensures the PUT request ALWAYS includes Authorization header
    console.log('[useLessonProgress] Waiting for auth token...');
    const token = await waitForAuthToken(5000); // Wait up to 5 seconds

    if (!token) {
      // HARD FAILURE: Token not available after waiting - save to localStorage for later sync
      console.error('[useLessonProgress] ❌ HARD FAILURE: Auth token not available after 5s wait');
      console.error('[useLessonProgress] Progress NOT sent to backend. Queued for later sync.');
      try {
        localStorage.setItem(`lesson_progress_${lessonId}`, JSON.stringify({
          progress: pageProgress,
          currentPage,
          totalPages,
          currentStep,
          totalSteps: stepsTotal,
          scrollPosition: 0,
          timestamp: Date.now(),
        }));
        localStorage.setItem(`lesson_progress_${lessonId}_failed`, JSON.stringify({
          progress: pageProgress,
          currentPage,
          totalPages,
          currentStep,
          totalSteps: stepsTotal,
          scrollPosition: 0,
          timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.error('[useLessonProgress] localStorage save failed:', e);
      }
      // Throw error to notify caller that save failed
      throw new Error('Auth token not available - progress queued for later sync');
    }

    console.log('[useLessonProgress] ✅ Auth token ready, proceeding with backend save');

    // CRITICAL: Always save when currentStep changes, regardless of percentage delta
    // This ensures step navigation is always persisted to backend
    const stepChanged = lastSavedStep === null || currentStep !== lastSavedStep;
    
    if (!stepChanged) {
      console.log('[useLessonProgress] Step unchanged, skipping backend save');
      return;
    }

    console.log('[useLessonProgress] ✅ Step changed, saving to backend:', {
      from: lastSavedStep,
      to: currentStep,
    });

    try {
      setIsSaving(true);

      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // ALWAYS send currentStep, totalSteps, and derived completionPercentage
      // Do not send percentage-only updates
      const data: UpdateLessonProgressParams = {
        completionPercentage: pageProgress, // Derived from currentStep/totalSteps
        currentStep, // REQUIRED by backend
        totalSteps: stepsTotal, // REQUIRED by backend
        timeSpent,
        moduleId,
        scrollPosition: 0,
      };

      console.log('[useLessonProgress] 🚀 Saving page progress to backend:', {
        lessonId,
        progress: pageProgress,
        page: `${currentPage + 1}/${totalPages}`,
        step: `${currentStep}/${stepsTotal}`,
      });

      await updateLessonProgress(lessonId, data);

      setLastSavedProgress(pageProgress);
      
      // Update backendProgress state to reflect the saved progress
      setBackendProgress({
        completionPercentage: pageProgress,
        currentStep,
        totalSteps: stepsTotal,
        completed: pageProgress >= 100,
      });
      
      // Dispatch custom event to notify context and other components
      // This ensures module and level progress update immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('progress:updated', {
          detail: {
            lessonId,
            moduleId,
            progress: pageProgress / 100, // Convert to 0-1
            completionPercentage: pageProgress,
          },
        }));
      }

      // Save to localStorage as backup
      localStorage.setItem(`lesson_progress_${lessonId}`, JSON.stringify({
        progress: pageProgress,
        currentPage,
        totalPages,
        currentStep,
        totalSteps: stepsTotal,
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
          currentStep,
          totalSteps: stepsTotal,
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
  }, [lessonId, moduleId, lastSavedStep, autoCompleteThreshold, isCompleted, onComplete]);

  /**
   * Save progress based on page number (for paginated content)
   * DEPRECATED: Use saveStepProgress instead for step-based navigation
   * This wrapper maintains backward compatibility
   */
  const savePageProgress = useCallback(async (currentPage: number, totalPages: number, totalSteps?: number) => {
    // Delegate to saveStepProgress which always saves on step changes
    return saveStepProgress(currentPage, totalPages, totalSteps);
  }, [saveStepProgress]);

  /**
   * Save time-based progress (scroll position, time spent)
   * This can be throttled based on percentage delta
   * Use this for scroll-based tracking, NOT for step navigation
   */
  const saveTimeProgress = useCallback(async (forceComplete = false) => {
    // This uses the existing saveProgress function which has throttling for scroll-based updates
    return saveProgress(forceComplete);
  }, [saveProgress]);

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
          // Store backend progress data for parent components
          setBackendProgress({
            completionPercentage: progress.completionPercentage,
            ...(progress.currentStep !== undefined && { currentStep: progress.currentStep }),
            ...(progress.totalSteps !== undefined && { totalSteps: progress.totalSteps }),
            completed: progress.completed,
          });
          
          setLocalProgress(progress.completionPercentage);
          setLastSavedProgress(progress.completionPercentage);
          // Restore last saved step from backend
          if (progress.currentStep !== undefined) {
            setLastSavedStep(progress.currentStep);
          }
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
            const cachedData = JSON.parse(cached);
            const { progress: cachedProgress, scrollPosition, currentStep } = cachedData;
            setLocalProgress(cachedProgress);
            setLastSavedProgress(cachedProgress);
            // Restore last saved step from cache
            if (currentStep !== undefined) {
              setLastSavedStep(currentStep);
            }
            
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
            timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
          });
          
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
          const { progress, scrollPosition, timeSpent, currentStep, totalSteps } = JSON.parse(failedSave);
          
          // Only sync if we have step data (required by backend)
          if (!currentStep || !totalSteps) {
            console.warn('[useLessonProgress] Skipping sync: step data not available');
            return;
          }
          
          const result: UpdateLessonProgressResult = await updateLessonProgress(lessonId, {
            completionPercentage: progress,
            currentStep,
            totalSteps,
            timeSpent,
            moduleId,
            scrollPosition,
          });
          
          // Handle rate limiting - don't clear failed save, will retry later
          if (!result.success && result.rateLimited) {
            console.warn('[useLessonProgress] Rate limited during sync. Will retry later.');
            return;
          }
          
          // Clear failed save after successful sync
          if (result.success) {
            localStorage.removeItem(`lesson_progress_${lessonId}_failed`);
            console.log('[useLessonProgress] Synced offline progress');
          }
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
            const cachedData = JSON.parse(cached);
            const { currentStep, totalSteps } = cachedData;
            
            // Only sync if we have step data (do not send percentage-only updates)
            if (currentStep && totalSteps) {
              const serverProgress = await getLessonProgress(lessonId);
              // If server has less progress, sync the cached one
              if (!serverProgress || serverProgress.completionPercentage < cachedProgress) {
                const result: UpdateLessonProgressResult = await updateLessonProgress(lessonId, {
                  completionPercentage: cachedProgress,
                  currentStep,
                  totalSteps,
                  timeSpent: 0, // Don't add time for cached progress
                  moduleId,
                  scrollPosition: cachedData.scrollPosition || 0,
                });
                
                // Handle rate limiting - will retry on next sync
                if (!result.success && result.rateLimited) {
                  console.warn('[useLessonProgress] Rate limited during cached sync. Will retry later.');
                } else if (result.success) {
                  console.log('[useLessonProgress] Synced cached progress to server');
                }
              }
            } else {
              console.warn('[useLessonProgress] Skipping cached sync: step data not available');
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
    isRateLimited, // Expose rate limit state for UI
    showResumeAlert,
    saveProgress, // For scroll/time-based progress (may be throttled)
    saveStepProgress, // Always saves on step changes
    savePageProgress, // Backward compatibility wrapper
    saveTimeProgress, // For time-based updates (throttled)
    dismissResumeAlert,
    backendProgress,
  };
}

export default useLessonProgress;

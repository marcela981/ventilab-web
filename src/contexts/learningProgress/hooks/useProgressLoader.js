import { useCallback, useRef } from 'react';
import { getModuleProgress } from '@/services/api/progressService';
import { getAuthToken } from '@/services/authService';
import { handleRateLimitError, handleNotFoundError } from '../utils/progressHelpers';

/**
 * Safely convert lessonProgress to an array and build lessonsById map.
 * Handles undefined, null, or non-array values gracefully.
 *
 * IMPORTANT: This function now normalizes lessonId to match curriculum format.
 * Backend may return full paths like "module-01/lesson-intro" or "module-01-lesson-intro",
 * but curriculum expects just "lesson-intro".
 *
 * @param {any} lessonProgress - The lesson progress data from API
 * @param {string} moduleId - Optional module ID to help normalize lessonIds
 * @returns {{ lessonProgressArray: Array, lessonsById: Object }}
 */
const buildLessonsById = (lessonProgress, moduleId = null) => {
  const lessonProgressArray = Array.isArray(lessonProgress) ? lessonProgress : [];

  const lessonsById = lessonProgressArray.reduce((acc, lp) => {
    if (lp && lp.lessonId) {
      // Normalize lessonId to match curriculum format
      let normalizedLessonId = lp.lessonId;

      // If lessonId contains "/" separator, extract just the lesson part
      if (normalizedLessonId.includes('/')) {
        normalizedLessonId = normalizedLessonId.split('/').pop();
      }
      // If lessonId starts with moduleId prefix, strip it
      else if (moduleId && normalizedLessonId.startsWith(`${moduleId}-`)) {
        normalizedLessonId = normalizedLessonId.substring(moduleId.length + 1);
      }

      // Store with BOTH the original and normalized keys for compatibility
      acc[lp.lessonId] = lp; // Original key
      if (normalizedLessonId !== lp.lessonId) {
        acc[normalizedLessonId] = { ...lp, lessonId: normalizedLessonId }; // Normalized key
      }
    }
    return acc;
  }, {});

  return { lessonProgressArray, lessonsById };
};

/**
 * Check if existing module data has meaningful lesson progress.
 * Used to prevent overwriting snapshot-synced data with API responses.
 * @param {Object} existingModuleData - The existing data in progressByModule
 * @returns {boolean} True if there's meaningful progress data to preserve
 */
const hasExistingLessonProgress = (existingModuleData) => {
  if (!existingModuleData?.lessonsById) return false;

  const lessonsById = existingModuleData.lessonsById;
  const lessonKeys = Object.keys(lessonsById);

  // Check if any lesson has actual progress (> 0)
  return lessonKeys.some(key => {
    const lesson = lessonsById[key];
    return (
      (typeof lesson?.progress === 'number' && lesson.progress > 0) ||
      (typeof lesson?.completionPercentage === 'number' && lesson.completionPercentage > 0) ||
      lesson?.completed === true
    );
  });
};

/**
 * Custom hook to handle loading progress from the API
 */
// Maximum number of rate-limit retries to prevent infinite loops
const MAX_RATE_LIMIT_RETRIES = 3;

export const useProgressLoader = ({
  session,
  waitForToken,
  progressByModuleRef,
  setProgressByModule,
  setLoadingModules,
  setSyncStatus,
  setLastSyncError,
  setIsRateLimited,
}) => {
  const pendingLoadRequestsRef = useRef(new Map()); // Map<moduleId, Promise> - for request deduplication
  const rateLimitRetryCountRef = useRef(new Map()); // Map<moduleId, number> - track retry attempts

  const loadModuleProgress = useCallback(async (moduleId, options = {}) => {
    if (!moduleId) {
      return null;
    }
    
    const { force = false, preserveExistingProgress = true } = options;

    // Check if already loaded and not forcing
    const existingData = progressByModuleRef.current[moduleId];
    if (!force && existingData) {
      // CRITICAL: If we have existing lesson progress (e.g., from snapshot sync),
      // don't overwrite it with potentially different-keyed API data.
      // This prevents the accordion expansion bug where progress resets to 0%.
      if (preserveExistingProgress && hasExistingLessonProgress(existingData)) {
        console.log(`[useProgressLoader] Preserving existing progress for ${moduleId} (has ${Object.keys(existingData.lessonsById || {}).length} lessons)`);
        return existingData;
      }
      return existingData;
    }
    
    // Check if there's already a pending request for this module (request deduplication)
    const existingRequest = pendingLoadRequestsRef.current.get(moduleId);
    if (existingRequest && !force) {
      console.log(`[useProgressLoader] Waiting for existing request for module ${moduleId}`);
      try {
        return await existingRequest;
      } catch (error) {
        // If the existing request failed, we'll continue to make a new one
        console.warn('[useProgressLoader] Existing request failed, making new request:', error);
        pendingLoadRequestsRef.current.delete(moduleId);
      }
    }
    
    // Create a new request promise
    const loadPromise = (async () => {
      // Wait for token to be available if we have a session
      if (session?.user) {
        try {
          const tokenAvailable = await waitForToken(5000);
          if (!tokenAvailable && !getAuthToken()) {
            throw new Error('Authentication token is not available. Please try again.');
          }
        } catch (error) {
          console.warn('[useProgressLoader] Token not available, but proceeding anyway:', error.message);
          // Continue anyway - the backend will return an error if token is required
        }
      }
      
      // Set loading state
      setLoadingModules(prev => new Set(prev).add(moduleId));
      setSyncStatus('loading');
      
      try {
        const data = await getModuleProgress(moduleId);

        // Check if result is a rate-limited response
        if (data && typeof data === 'object' && data.type === 'RATE_LIMITED') {
          const currentRetryCount = rateLimitRetryCountRef.current.get(moduleId) || 0;
          console.warn(`[useProgressLoader] Rate limited when loading module progress (retry ${currentRetryCount}/${MAX_RATE_LIMIT_RETRIES})`);
          setSyncStatus('rate_limited');
          setLastSyncError(null); // Don't show error, just rate limit state
          setIsRateLimited?.(true); // Set rate limiting state (defensive call)

          // Only retry if we haven't exceeded max retries
          if (currentRetryCount < MAX_RATE_LIMIT_RETRIES) {
            // Schedule automatic retry after cooldown (default 5 seconds)
            const retryAfter = data.retryAfter || 5;
            rateLimitRetryCountRef.current.set(moduleId, currentRetryCount + 1);

            setTimeout(() => {
              console.log(`[useProgressLoader] Retrying after rate limit cooldown (attempt ${currentRetryCount + 1})...`);
              setIsRateLimited?.(false); // Clear rate limit state before retry (defensive call)
              loadModuleProgress(moduleId, { force: true });
            }, retryAfter * 1000);
          } else {
            // Max retries exceeded - reset counter and give up
            console.error('[useProgressLoader] Max rate limit retries exceeded, giving up');
            rateLimitRetryCountRef.current.delete(moduleId);
            setIsRateLimited?.(false);
            setSyncStatus('error');
            setLastSyncError('Demasiados intentos. Por favor, espera un momento antes de reintentar.');
          }

          // Return existing data or empty structure instead of throwing
          return existingData || {
            learningProgress: null,
            lessonProgress: [],
            isAvailable: false,
          };
        }

        // Successful load - reset retry counter for this module
        rateLimitRetryCountRef.current.delete(moduleId);
        
        // Clear rate limit state on successful load
        setIsRateLimited?.(false);

        // Safely handle undefined/null lessonProgress (module never started)
        // Pass moduleId for lessonId normalization
        const { lessonsById: newLessonsById } = buildLessonsById(data.lessonProgress, moduleId);

        // CRITICAL FIX: Merge with existing lessonsById instead of overwriting
        // This preserves snapshot-synced data that may use different key formats
        setProgressByModule(prev => {
          const existingModule = prev[moduleId] || {};
          const existingLessonsById = existingModule.lessonsById || {};

          return {
            ...prev,
            [moduleId]: {
              learningProgress: data.learningProgress ?? existingModule.learningProgress ?? null,
              lessonsById: {
                ...existingLessonsById,  // Preserve existing lesson data
                ...newLessonsById,        // Add/update with new data
              },
            },
          };
        });
        
        setSyncStatus('idle');
        setLastSyncError(null);
        
        return data;
      } catch (error) {
        console.error('[useProgressLoader] Failed to load module progress:', error);
        
        // Handle rate limiting (429) with exponential backoff
        const retryResult = await handleRateLimitError(
          error,
          async () => {
            const retryData = await getModuleProgress(moduleId);

            // Safely handle undefined/null lessonProgress
            const { lessonsById: retryLessonsById } = buildLessonsById(retryData.lessonProgress, moduleId);

            // CRITICAL FIX: Merge with existing lessonsById
            setProgressByModule(prev => {
              const existingModule = prev[moduleId] || {};
              const existingLessonsById = existingModule.lessonsById || {};

              return {
                ...prev,
                [moduleId]: {
                  learningProgress: retryData.learningProgress ?? existingModule.learningProgress ?? null,
                  lessonsById: {
                    ...existingLessonsById,
                    ...retryLessonsById,
                  },
                },
              };
            });

            setSyncStatus('idle');
            setLastSyncError(null);

            return retryData;
          }
        );
        
        if (retryResult) {
          return retryResult;
        }
        
        // Handle 404 (module not found) gracefully by initializing empty state
        if (error.status === 404 || error.isNotFound || error.code === 'MODULE_NOT_FOUND') {
          const emptyState = handleNotFoundError(moduleId);
          
          // Initialize empty progress state for this module
          setProgressByModule(prev => ({
            ...prev,
            [moduleId]: {
              learningProgress: null,
              lessonsById: {},
            },
          }));
          
          setSyncStatus('idle');
          setLastSyncError(null);
          
          // Return empty structure
          return {
            learningProgress: null,
            lessonProgress: [],
            isAvailable: false,
          };
        }
        
        // If error is due to missing token and we have a session, try to fetch token and retry once
        if (error.message?.includes('authentication token') && session?.user && !getAuthToken()) {
          console.log('[useProgressLoader] Retrying after token fetch...');
          
          // Wait a bit and retry
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const tokenAvailable = await waitForToken(3000);
            
            if (tokenAvailable || getAuthToken()) {
              // Retry the request
              const retryData = await getModuleProgress(moduleId);

              // Safely handle undefined/null lessonProgress
              const { lessonsById: tokenRetryLessonsById } = buildLessonsById(retryData.lessonProgress, moduleId);

              // CRITICAL FIX: Merge with existing lessonsById
              setProgressByModule(prev => {
                const existingModule = prev[moduleId] || {};
                const existingLessonsById = existingModule.lessonsById || {};

                return {
                  ...prev,
                  [moduleId]: {
                    learningProgress: retryData.learningProgress ?? existingModule.learningProgress ?? null,
                    lessonsById: {
                      ...existingLessonsById,
                      ...tokenRetryLessonsById,
                    },
                  },
                };
              });

              setSyncStatus('idle');
              setLastSyncError(null);

              return retryData;
            }
          } catch (retryError) {
            console.error('[useProgressLoader] Retry failed:', retryError);
          }
        }
        
        // SAFEGUARD: Instead of throwing, initialize safe empty state to prevent:
        // - auto-navigation loops
        // - TutorAI activation
        // - curriculum reset
        // The module is treated as "not started" with zero completed lessons
        console.warn('[useProgressLoader] All retries failed, initializing safe empty state for module:', moduleId);

        setProgressByModule(prev => ({
          ...prev,
          [moduleId]: {
            learningProgress: null,
            lessonsById: {},
            _loadFailed: true, // Flag to indicate load failed (for debugging)
          },
        }));

        setSyncStatus('error');
        setLastSyncError(error.message || 'Error al cargar progreso del módulo.');

        // Return a safe "not started" structure instead of throwing
        // This prevents cascading failures in the UI
        return {
          learningProgress: null,
          lessonProgress: [],
          isAvailable: false,
          _loadFailed: true,
        };
      } finally {
        setLoadingModules(prev => {
          const next = new Set(prev);
          next.delete(moduleId);
          return next;
        });
        // Remove from pending requests
        pendingLoadRequestsRef.current.delete(moduleId);
      }
    })();
    
    // Store the promise for deduplication
    pendingLoadRequestsRef.current.set(moduleId, loadPromise);
    
    // Clean up promise after it completes (success or failure)
    loadPromise.finally(() => {
      // Only delete if it's still the same promise (in case a new one was started with force=true)
      if (pendingLoadRequestsRef.current.get(moduleId) === loadPromise) {
        pendingLoadRequestsRef.current.delete(moduleId);
      }
    });
    
    return loadPromise;
  }, [session, waitForToken, progressByModuleRef, setProgressByModule, setLoadingModules, setSyncStatus, setLastSyncError, setIsRateLimited]);

  return { loadModuleProgress };
};


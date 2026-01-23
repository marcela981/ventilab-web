import { useCallback, useRef } from 'react';
import { getModuleProgress } from '@/services/api/progressService';
import { getAuthToken } from '@/services/authService';
import { handleRateLimitError, handleNotFoundError } from '../utils/progressHelpers';

/**
 * Safely convert lessonProgress to an array and build lessonsById map.
 * Handles undefined, null, or non-array values gracefully.
 * @param {any} lessonProgress - The lesson progress data from API
 * @returns {{ lessonProgressArray: Array, lessonsById: Object }}
 */
const buildLessonsById = (lessonProgress) => {
  const lessonProgressArray = Array.isArray(lessonProgress) ? lessonProgress : [];

  const lessonsById = lessonProgressArray.reduce((acc, lp) => {
    if (lp && lp.lessonId) {
      acc[lp.lessonId] = lp;
    }
    return acc;
  }, {});

  return { lessonProgressArray, lessonsById };
};

/**
 * Custom hook to handle loading progress from the API
 */
export const useProgressLoader = ({
  session,
  waitForToken,
  progressByModuleRef,
  setProgressByModule,
  setLoadingModules,
  setSyncStatus,
  setLastSyncError,
}) => {
  const pendingLoadRequestsRef = useRef(new Map()); // Map<moduleId, Promise> - for request deduplication

  const loadModuleProgress = useCallback(async (moduleId, options = {}) => {
    if (!moduleId) {
      return null;
    }
    
    const { force = false } = options;
    
    // Check if already loaded and not forcing
    if (!force && progressByModuleRef.current[moduleId]) {
      return progressByModuleRef.current[moduleId];
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

        // Safely handle undefined/null lessonProgress (module never started)
        const { lessonsById } = buildLessonsById(data.lessonProgress);

        setProgressByModule(prev => ({
          ...prev,
          [moduleId]: {
            learningProgress: data.learningProgress ?? null,
            lessonsById,
          },
        }));
        
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
            const { lessonsById: retryLessonsById } = buildLessonsById(retryData.lessonProgress);

            setProgressByModule(prev => ({
              ...prev,
              [moduleId]: {
                learningProgress: retryData.learningProgress ?? null,
                lessonsById: retryLessonsById,
              },
            }));

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
              const { lessonsById: tokenRetryLessonsById } = buildLessonsById(retryData.lessonProgress);

              setProgressByModule(prev => ({
                ...prev,
                [moduleId]: {
                  learningProgress: retryData.learningProgress ?? null,
                  lessonsById: tokenRetryLessonsById,
                },
              }));

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
  }, [session, waitForToken, progressByModuleRef, setProgressByModule, setLoadingModules, setSyncStatus, setLastSyncError]);

  return { loadModuleProgress };
};


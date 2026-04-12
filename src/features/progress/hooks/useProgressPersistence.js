import { useEffect } from 'react';
import { PROGRESS_STATE_KEY } from '../utils/constants';

/**
 * Custom hook to handle persistence of progress state to localStorage
 */
export const useProgressPersistence = (progressByModule, currentModuleId, currentLessonId) => {
  // Load state from localStorage on mount
  const loadPersistedState = () => {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      const stored = localStorage.getItem(PROGRESS_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          progressByModule: parsed.progressByModule || {},
          currentModuleId: parsed.currentModuleId || null,
          currentLessonId: parsed.currentLessonId || null,
        };
      }
    } catch (error) {
      console.warn('[useProgressPersistence] Failed to restore state from localStorage:', error);
    }
    
    return null;
  };

  // Save state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem(PROGRESS_STATE_KEY, JSON.stringify({
        progressByModule,
        currentModuleId,
        currentLessonId,
      }));
    } catch (error) {
      console.warn('[useProgressPersistence] Failed to save state to localStorage:', error);
    }
  }, [progressByModule, currentModuleId, currentLessonId]);

  return { loadPersistedState };
};


/**
 * =============================================================================
 * TeachingModuleContext for VentyLab
 * =============================================================================
 * 
 * Context that manages the state of the teaching module including:
 * - Active module and lesson
 * - Active category (for modules with subcategories like module-03)
 * - User progress per lesson
 * - Navigation functions
 * 
 * This context is specifically designed for modules with complex structures
 * like module-03-configuration that has subcategories.
 * 
 * @module TeachingModuleContext
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

// =============================================================================
// Action Types
// =============================================================================

const ActionTypes = {
  SET_MODULE: 'SET_MODULE',
  SET_CATEGORY: 'SET_CATEGORY',
  SET_LESSON: 'SET_LESSON',
  MARK_LESSON_COMPLETE: 'MARK_LESSON_COMPLETE',
  RESET_PROGRESS: 'RESET_PROGRESS',
  SET_MODULE_DATA: 'SET_MODULE_DATA',
};

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  activeModuleId: null,
  activeCategoryId: null,
  activeLessonId: null,
  moduleData: null, // Full module data from curriculumData or module content
  lessonProgress: {}, // Map of lessonId -> { completed: boolean, timeSpent: number, lastAccessed: date }
  categories: [], // Array of category objects for the current module
};

// =============================================================================
// Reducer
// =============================================================================

/**
 * Teaching module reducer
 * @param {Object} state - Current state
 * @param {Object} action - Action object with type and payload
 * @returns {Object} New state
 */
const teachingModuleReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_MODULE: {
      return {
        ...state,
        activeModuleId: action.payload.moduleId,
        moduleData: action.payload.moduleData || null,
        // Reset category and lesson when changing modules
        activeCategoryId: action.payload.categoryId || null,
        activeLessonId: action.payload.lessonId || null,
        categories: action.payload.categories || [],
      };
    }

    case ActionTypes.SET_CATEGORY: {
      return {
        ...state,
        activeCategoryId: action.payload.categoryId,
        // Optionally set lesson when changing category
        activeLessonId: action.payload.lessonId || state.activeLessonId,
      };
    }

    case ActionTypes.SET_LESSON: {
      const { lessonId, categoryId } = action.payload;
      
      // Update last accessed time
      const lessonProgress = {
        ...state.lessonProgress,
        [lessonId]: {
          ...state.lessonProgress[lessonId],
          lastAccessed: new Date().toISOString(),
        },
      };

      return {
        ...state,
        activeLessonId: lessonId,
        activeCategoryId: categoryId || state.activeCategoryId,
        lessonProgress,
      };
    }

    case ActionTypes.MARK_LESSON_COMPLETE: {
      const { lessonId, timeSpent } = action.payload;
      
      return {
        ...state,
        lessonProgress: {
          ...state.lessonProgress,
          [lessonId]: {
            ...state.lessonProgress[lessonId],
            completed: true,
            timeSpent: timeSpent || state.lessonProgress[lessonId]?.timeSpent || 0,
            completedAt: new Date().toISOString(),
          },
        },
      };
    }

    case ActionTypes.RESET_PROGRESS: {
      const { lessonId } = action.payload;
      
      if (lessonId) {
        // Reset specific lesson
        const { [lessonId]: _, ...restProgress } = state.lessonProgress;
        return {
          ...state,
          lessonProgress: restProgress,
        };
      }
      
      // Reset all progress
      return {
        ...state,
        lessonProgress: {},
      };
    }

    case ActionTypes.SET_MODULE_DATA: {
      return {
        ...state,
        moduleData: action.payload.moduleData,
        categories: action.payload.categories || [],
      };
    }

    default:
      return state;
  }
};

// =============================================================================
// Context Creation
// =============================================================================

const TeachingModuleContext = createContext({
  // State
  activeModuleId: null,
  activeCategoryId: null,
  activeLessonId: null,
  moduleData: null,
  lessonProgress: {},
  categories: [],

  // Actions
  setModule: () => {},
  setCategory: () => {},
  setLesson: () => {},
  markLessonComplete: () => {},
  resetProgress: () => {},
  setModuleData: () => {},

  // Helpers
  isLessonCompleted: () => false,
  getLessonProgress: () => null,
  getCategoryProgress: () => ({ completed: 0, total: 0, percentage: 0 }),
});

// =============================================================================
// Provider Component
// =============================================================================

/**
 * TeachingModuleProvider
 * Provides teaching module state and actions to child components
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const TeachingModuleProvider = ({ children }) => {
  const [state, dispatch] = useReducer(teachingModuleReducer, initialState);

  // ===========================================================================
  // Action Creators
  // ===========================================================================

  /**
   * Set active module
   * @param {string} moduleId - Module ID
   * @param {Object} moduleData - Full module data
   * @param {string} categoryId - Optional category ID
   * @param {string} lessonId - Optional lesson ID
   * @param {Array} categories - Array of category objects
   */
  const setModule = useCallback((moduleId, moduleData = null, categoryId = null, lessonId = null, categories = []) => {
    dispatch({
      type: ActionTypes.SET_MODULE,
      payload: {
        moduleId,
        moduleData,
        categoryId,
        lessonId,
        categories,
      },
    });
  }, []);

  /**
   * Set active category
   * @param {string} categoryId - Category ID
   * @param {string} lessonId - Optional lesson ID to set when changing category
   */
  const setCategory = useCallback((categoryId, lessonId = null) => {
    dispatch({
      type: ActionTypes.SET_CATEGORY,
      payload: {
        categoryId,
        lessonId,
      },
    });
  }, []);

  /**
   * Set active lesson
   * @param {string} lessonId - Lesson ID
   * @param {string} categoryId - Optional category ID (to set if not already set)
   */
  const setLesson = useCallback((lessonId, categoryId = null) => {
    dispatch({
      type: ActionTypes.SET_LESSON,
      payload: {
        lessonId,
        categoryId,
      },
    });
  }, []);

  /**
   * Mark lesson as completed
   * @param {string} lessonId - Lesson ID
   * @param {number} timeSpent - Time spent in minutes
   */
  const markLessonComplete = useCallback((lessonId, timeSpent = 0) => {
    dispatch({
      type: ActionTypes.MARK_LESSON_COMPLETE,
      payload: {
        lessonId,
        timeSpent,
      },
    });
  }, []);

  /**
   * Reset progress for a lesson or all lessons
   * @param {string} lessonId - Optional lesson ID. If not provided, resets all
   */
  const resetProgress = useCallback((lessonId = null) => {
    dispatch({
      type: ActionTypes.RESET_PROGRESS,
      payload: {
        lessonId,
      },
    });
  }, []);

  /**
   * Set module data (categories, lessons structure)
   * @param {Object} moduleData - Module data object
   * @param {Array} categories - Array of category objects
   */
  const setModuleData = useCallback((moduleData, categories = []) => {
    dispatch({
      type: ActionTypes.SET_MODULE_DATA,
      payload: {
        moduleData,
        categories,
      },
    });
  }, []);

  // ===========================================================================
  // Helper Functions
  // ===========================================================================

  /**
   * Check if a lesson is completed
   * @param {string} lessonId - Lesson ID
   * @returns {boolean} True if lesson is completed
   */
  const isLessonCompleted = useCallback((lessonId) => {
    return state.lessonProgress[lessonId]?.completed === true;
  }, [state.lessonProgress]);

  /**
   * Get progress for a specific lesson
   * @param {string} lessonId - Lesson ID
   * @returns {Object|null} Progress object or null
   */
  const getLessonProgress = useCallback((lessonId) => {
    return state.lessonProgress[lessonId] || null;
  }, [state.lessonProgress]);

  /**
   * Get progress for a category
   * @param {string} categoryId - Category ID
   * @param {Array} lessons - Array of lessons in the category
   * @returns {Object} Progress object with completed, total, percentage
   */
  const getCategoryProgress = useCallback((categoryId, lessons = []) => {
    if (!lessons || lessons.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const completed = lessons.filter(lesson => {
      const lessonId = typeof lesson === 'string' ? lesson : lesson.id;
      return isLessonCompleted(lessonId);
    }).length;

    const total = lessons.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }, [isLessonCompleted]);

  // ===========================================================================
  // Context Value
  // ===========================================================================

  const contextValue = useMemo(() => ({
    // State
    activeModuleId: state.activeModuleId,
    activeCategoryId: state.activeCategoryId,
    activeLessonId: state.activeLessonId,
    moduleData: state.moduleData,
    lessonProgress: state.lessonProgress,
    categories: state.categories,

    // Actions
    setModule,
    setCategory,
    setLesson,
    markLessonComplete,
    resetProgress,
    setModuleData,

    // Helpers
    isLessonCompleted,
    getLessonProgress,
    getCategoryProgress,
  }), [
    state,
    setModule,
    setCategory,
    setLesson,
    markLessonComplete,
    resetProgress,
    setModuleData,
    isLessonCompleted,
    getLessonProgress,
    getCategoryProgress,
  ]);

  return (
    <TeachingModuleContext.Provider value={contextValue}>
      {children}
    </TeachingModuleContext.Provider>
  );
};

// =============================================================================
// Hook Export
// =============================================================================

/**
 * useTeachingModule - Hook to access teaching module context
 * 
 * @returns {Object} Teaching module context value
 * @throws {Error} If used outside TeachingModuleProvider
 * 
 * @example
 * const { activeModuleId, setModule, setLesson } = useTeachingModule();
 */
export const useTeachingModule = () => {
  const context = useContext(TeachingModuleContext);
  
  if (!context) {
    throw new Error('useTeachingModule must be used within TeachingModuleProvider');
  }
  
  return context;
};

export default TeachingModuleContext;


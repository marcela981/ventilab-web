/**
 * =============================================================================
 * useLesson Hook for VentyLab
 * =============================================================================
 *
 * Custom React hook that loads lesson content from the database via the Pages API.
 * Migrated lessons (beginner modules 01-06) are fetched exclusively from the DB.
 * Non-migrated lessons fall back to legacy JSON files.
 *
 * This hook delegates loading to lessonLoader, which calls
 * GET /api/pages/by-lesson/:lessonId and transforms the response into
 * the normalized content format used by LessonViewer.
 *
 * @module useLesson
 *
 * @example
 * const { data, isLoading, error, refetch } = useLesson(
 *   'module-01-inversion-fisiologica',
 *   'module-01-fundamentals'
 * );
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { curriculumData } from '../../../data/curriculumData';
import {
  loadLessonById,
  clearCache,
} from '../../../data/helpers/lessonLoader';

/**
 * Custom hook to load and manage lesson content from JSON files
 * 
 * @param {string} lessonId - Unique identifier of the lesson (must match curriculumData.js)
 * @param {string} moduleId - Identifier of the parent module
 * @returns {Object} Hook return object
 * @returns {Object|null} returns.data - Complete lesson object with enriched metadata, or null if loading/error
 * @returns {boolean} returns.isLoading - Indicates if lesson is currently being loaded
 * @returns {string|null} returns.error - Error message if loading failed, or null if no error
 * @returns {Function} returns.refetch - Function to manually reload the lesson content (invalidates cache)
 * 
 * @example
 * const { data, isLoading, error, refetch } = useLesson('respiratory-anatomy', 'module-01-fundamentals');
 */
const useLesson = (lessonId, moduleId) => {
  // ============================================================================
  // State Management
  // ============================================================================
  
  /**
   * Complete lesson data including JSON content and enriched metadata
   * @type {Object|null}
   */
  const [data, setData] = useState(null);

  /**
   * Loading state indicator
   * @type {boolean}
   */
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Error message if loading fails
   * @type {string|null}
   */
  const [error, setError] = useState(null);

  /**
   * Ref to track if component is mounted (for cleanup)
   * @type {React.MutableRefObject<boolean>}
   */
  const isMountedRef = useRef(true);

  // ============================================================================
  // Parameter Validation
  // ============================================================================

  /**
   * Validates that required parameters are provided
   * @param {string} lessonId - Lesson identifier to validate
   * @param {string} moduleId - Module identifier to validate
   * @returns {string|null} Error message if validation fails, null otherwise
   */
  const validateParameters = useCallback((lessonId, moduleId) => {
    if (!lessonId || lessonId === undefined || lessonId === null) {
      return 'lessonId es requerido y no puede ser null o undefined';
    }
    
    if (!moduleId || moduleId === undefined || moduleId === null) {
      return 'moduleId es requerido y no puede ser null o undefined';
    }
    
    if (typeof lessonId !== 'string' || lessonId.trim() === '') {
      return 'lessonId debe ser una cadena de texto no vacía';
    }
    
    if (typeof moduleId !== 'string' || moduleId.trim() === '') {
      return 'moduleId debe ser una cadena de texto no vacía';
    }
    
    return null;
  }, []);

  // ============================================================================
  // Module Metadata Enrichment
  // ============================================================================

  /**
   * Enriches lesson data with module metadata from curriculumData.js
   * This function adds navigation, position, and module information to the
   * lesson data loaded by the lessonLoader helper.
   *
   * @param {Object} lessonData - The loaded lesson data (already normalized by lessonLoader)
   * @returns {Object} Enriched lesson data with module info, position, and navigation
   */
  const enrichLessonData = useCallback((lessonData) => {
    if (!lessonData) {
      return null;
    }

    // Get module from curriculumData - ONLY use the passed moduleId to avoid cross-module confusion
    // This is critical because some lesson IDs exist in multiple modules (e.g., respiratory-physiology and module-01-fundamentals)
    let module = curriculumData?.modules?.[moduleId];

    // Only fall back to lessonData.moduleId if passed moduleId doesn't exist
    if (!module && lessonData.moduleId && lessonData.moduleId !== moduleId) {
      console.warn(`[useLesson] Module ${moduleId} not found, falling back to ${lessonData.moduleId}`);
      module = curriculumData?.modules?.[lessonData.moduleId];
    }

    // If still not found, try searching by title or other fields (last resort)
    if (!module) {
      module = Object.values(curriculumData?.modules || {}).find(
        m => m.id === moduleId ||
        m.id === lessonData.moduleId ||
        m.title?.toLowerCase().includes(moduleId.toLowerCase()) ||
                     m.title?.toLowerCase().includes(lessonData.moduleId.toLowerCase())
                   );
    }

    if (!module) {
      console.warn(`[useLesson] Module ${moduleId} or ${lessonData.moduleId} not found in curriculumData, using minimal metadata`);
    }

    // Get lessons array from module and SORT BY ORDER to ensure deterministic navigation
    // This is critical because array position determines next/previous lesson
    const rawLessons = module?.lessons || [];
    const moduleLessons = [...rawLessons].sort((a, b) => {
      const orderA = a.order ?? a.lessonData?.order ?? 999;
      const orderB = b.order ?? b.lessonData?.order ?? 999;
      return orderA - orderB;
    });

    // Find current lesson position in module using BOTH lessonId variants for robustness
    const currentLessonId = lessonData.lessonId || lessonId;
    const lessonIndex = moduleLessons.findIndex(
      l => l.id === currentLessonId || l.id === lessonId || l.id === lessonData.lessonId
    );

    // CRITICAL GUARD: If lesson is not found in module, log detailed error
    if (lessonIndex === -1) {
      console.error('[useLesson] ⚠️ LESSON NOT FOUND IN MODULE:', {
        searchedFor: [currentLessonId, lessonId, lessonData.lessonId],
        moduleId: moduleId,
        availableLessons: moduleLessons.map(l => ({ id: l.id, order: l.order })),
        hint: 'This causes navigation to fail. Check if lessonId matches curriculumData exactly.'
      });
    }

    // DEBUG: Log lesson navigation calculation
    console.log('[useLesson] Navigation calculation:', {
      currentLessonId: lessonId,
      lessonDataLessonId: lessonData.lessonId,
      moduleId: moduleId,
      lessonIndex: lessonIndex,
      totalLessons: moduleLessons.length,
      lessonIds: moduleLessons.map(l => l.id),
      sortedByOrder: true
    });

    // Build module info object
    const moduleInfo = module ? {
      id: module.id,
      title: module.title,
      level: module.level,
      order: module.order,
      duration: module.duration,
      prerequisites: module.prerequisites || [],
      learningObjectives: module.learningObjectives || [],
      bloomLevel: module.bloomLevel,
      difficulty: module.difficulty,
      estimatedTime: module.estimatedTime,
    } : {
      id: lessonData.moduleId,
      title: 'Módulo desconocido',
      level: 'unknown',
      order: 0,
      duration: 0,
      prerequisites: [],
      learningObjectives: [],
      bloomLevel: 'unknown',
      difficulty: 'unknown',
      estimatedTime: 'Desconocido',
    };

    // Build lesson position info
    const lessonPosition = {
      current: lessonIndex >= 0 ? lessonIndex + 1 : 1,
      total: moduleLessons.length || 1,
    };

    // Build navigation info
    const previousLesson = lessonIndex > 0 && moduleLessons[lessonIndex - 1] 
      ? {
          id: moduleLessons[lessonIndex - 1].id,
          title: moduleLessons[lessonIndex - 1].title,
        }
      : null;

    // Calculate next lesson - ensure it's actually different from current
    // CRITICAL: This logic must handle lessonIndex === -1 explicitly
    let nextLesson = null;
    let navigationError = null;

    if (lessonIndex === -1) {
      // EXPLICIT GUARD: Lesson not found - DO NOT silently fall back to index 0
      navigationError = 'LESSON_NOT_FOUND';
      console.error('[useLesson] ⚠️ Cannot calculate nextLesson: current lesson not found in module', {
        currentLessonId: lessonId,
        moduleId: moduleId,
        availableLessonCount: moduleLessons.length,
      });
    } else if (lessonIndex < moduleLessons.length - 1) {
      // Normal case: there's a next lesson
      const candidateNextLesson = moduleLessons[lessonIndex + 1];
      if (candidateNextLesson && candidateNextLesson.id !== lessonId && candidateNextLesson.id !== lessonData.lessonId) {
        nextLesson = {
          id: candidateNextLesson.id,
          title: candidateNextLesson.title,
        };
      } else if (candidateNextLesson) {
        // CRITICAL: Log if we detect a potential same-lesson navigation bug
        navigationError = 'SAME_LESSON_BUG';
        console.error('[useLesson] ⚠️ NAVIGATION BUG DETECTED: nextLesson would be same as current!', {
          currentLessonId: lessonId,
          candidateNextLessonId: candidateNextLesson.id,
          lessonIndex,
          hint: 'Check for duplicate lesson IDs or incorrect array sorting',
        });
      }
    }
    // else: lessonIndex === moduleLessons.length - 1, last lesson, nextLesson stays null

    // DEBUG: Log final navigation result
    console.log('[useLesson] Navigation result:', {
      previousLesson: previousLesson?.id || null,
      nextLesson: nextLesson?.id || null,
      isLastLesson: nextLesson === null && lessonIndex === moduleLessons.length - 1,
      lessonIndex: lessonIndex,
      totalLessons: moduleLessons.length,
      navigationError: navigationError,
    });

    const navigation = {
      previousLesson,
      nextLesson,
    };

    // Combine all data
    // CRITICAL: Override lessonData.moduleId with the passed moduleId to ensure
    // navigation stays within the correct module context (fixes cross-module navigation bug)
    return {
      ...lessonData,
      moduleId: moduleId, // Override JSON's moduleId with the actual module being viewed
      moduleInfo,
      lessonPosition,
      navigation,
    };
  }, [lessonId, moduleId]);

  // ============================================================================
  // Content Loading Function
  // ============================================================================

  /**
   * Loads lesson content using lessonLoader helper and enriches it with metadata
   * This function delegates all loading, validation, and normalization to lessonLoader,
   * then enriches the data with curriculum metadata.
   * 
   * @param {boolean} invalidateCache - Whether to clear cache before loading (for refetch)
   * @returns {Promise<void>}
   */
  const loadLessonContent = useCallback(async (invalidateCache = false) => {
    // Don't update state if component is unmounted
    if (!isMountedRef.current) {
      return;
    }

    // Reset states
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      // Step 1: Validate parameters
      const paramError = validateParameters(lessonId, moduleId);
      if (paramError) {
        if (!isMountedRef.current) return;
        setError(paramError);
        setIsLoading(false);
        return;
      }

      // Step 2: Invalidate cache if requested (for refetch)
      if (invalidateCache) {
        clearCache();
        console.log(`[useLesson] Cache invalidated for refetch: ${lessonId}`);
      }

      // Step 3: Load lesson using lessonLoader helper
      // This handles file path resolution, loading, validation, normalization, and caching
      const lessonData = await loadLessonById(lessonId, moduleId);

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.log(`[useLesson] Component unmounted during load, skipping state update`);
        return;
      }

      // Step 4: Verify lessonId and moduleId match (with warnings)
      if (lessonData.lessonId !== lessonId) {
        console.warn(
          `[useLesson] Lesson ID mismatch: expected ${lessonId}, found ${lessonData.lessonId}. ` +
          `Using loaded lessonId: ${lessonData.lessonId}`
        );
      }

      if (lessonData.moduleId !== moduleId && !moduleId.includes(lessonData.moduleId)) {
        console.warn(
          `[useLesson] Module ID mismatch: expected ${moduleId}, found ${lessonData.moduleId}. ` +
          `Using loaded moduleId: ${lessonData.moduleId}`
        );
      }

      // Step 5: Enrich with module metadata from curriculumData
      const enrichedData = enrichLessonData(lessonData);

      // Step 6: Set the data and complete loading
      if (isMountedRef.current) {
        setData(enrichedData);
        setIsLoading(false);
        console.log(`[useLesson] Successfully loaded and enriched lesson: ${lessonId}`);
      }
      
    } catch (err) {
      // Handle all errors with descriptive messages
      console.error(`[useLesson] Error loading lesson ${lessonId}:`, err);
      
      // Don't update state if component is unmounted
      if (!isMountedRef.current) {
        return;
      }

      let errorMessage = 'Error desconocido al cargar la lección';
      
      if (err instanceof SyntaxError) {
        errorMessage = `Error de sintaxis JSON en el archivo de lección: ${err.message}`;
      } else if (err instanceof TypeError) {
        errorMessage = `Error de tipo al procesar el archivo de lección: ${err.message}`;
      } else if (err.message) {
        // Use error message from lessonLoader (already descriptive)
        if (err.message.includes('Failed to load lesson')) {
          errorMessage = `No se pudo cargar la lección "${lessonId}" del módulo "${moduleId}". ` +
                        `Verifica que el archivo existe y que los IDs son correctos. ` +
                        `Error: ${err.message}`;
        } else {
          errorMessage = err.message;
        }
      } else {
        errorMessage = `Error inesperado: ${err.toString()}`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
      setData(null);
    }
  }, [lessonId, moduleId, validateParameters, enrichLessonData]);

  // ============================================================================
  // Refetch Function
  // ============================================================================

  /**
   * Manually reload lesson content with cache invalidation
   * Useful when content is updated or after error recovery.
   * This function invalidates the cache to ensure fresh data is loaded.
   * 
   * @example
   * const { refetch } = useLesson(lessonId, moduleId);
   * // After updating content
   * await updateLesson();
   * refetch(); // Invalidates cache and reloads
   */
  const refetch = useCallback(() => {
    console.log(`[useLesson] Manual refetch requested for lesson: ${lessonId}`);
    loadLessonContent(true); // true = invalidate cache
  }, [loadLessonContent, lessonId]);

  // ============================================================================
  // Memoized Values
  // ============================================================================

  /**
   * Memoized lessonId and moduleId for effect dependencies
   * This prevents unnecessary re-renders when values haven't changed
   */
  const lessonKey = useMemo(() => `${lessonId}-${moduleId}`, [lessonId, moduleId]);

  // ============================================================================
  // Effect Hook
  // ============================================================================

  /**
   * Load lesson content when component mounts or when lessonId/moduleId changes.
   * Cleanup function marks component as unmounted to prevent state updates.
   */
  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true;
    
    // Load content
    loadLessonContent(false); // false = use cache if available

    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [lessonKey, loadLessonContent]);

  // ============================================================================
  // Return Object
  // ============================================================================

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};

// ============================================================================
// PropTypes Documentation
// ============================================================================

/**
 * PropTypes validation for useLesson hook parameters
 * 
 * Note: Since hooks don't use PropTypes directly like components,
 * this serves as documentation for developers using the hook.
 * 
 * @typedef {Object} UseLessonParams
 * @property {string} lessonId - Required. Unique identifier of the lesson
 * @property {string} moduleId - Required. Identifier of the parent module
 */

useLesson.propTypes = {
  lessonId: PropTypes.string.isRequired,
  moduleId: PropTypes.string.isRequired,
};

/**
 * Type definition for the hook's return value
 * 
 * @typedef {Object} UseLessonReturn
 * @property {Object|null} data - Complete lesson object with all enriched data
 * @property {string} data.lessonId - Lesson identifier
 * @property {string} data.moduleId - Module identifier
 * @property {string} data.title - Lesson title
 * @property {string} data.lastUpdated - ISO date string of last update
 * @property {string[]} data.authors - Array of author names
 * @property {string[]} data.reviewers - Array of reviewer names
 * @property {Object} data.content - Complete lesson content
 * @property {Object} data.content.introduction - Introduction section with text and objectives
 * @property {Object} data.content.theory - Theory section with sections, examples, analogies
 * @property {Array} data.content.visualElements - Array of visual element descriptions
 * @property {Array} data.content.practicalCases - Array of practical case studies
 * @property {Array} data.content.keyPoints - Array of key learning points
 * @property {Object} data.content.assessment - Assessment section with questions
 * @property {Array} data.content.references - Array of bibliographic references
 * @property {Object} data.moduleInfo - Enriched module metadata
 * @property {string} data.moduleInfo.id - Module ID
 * @property {string} data.moduleInfo.title - Module title
 * @property {string} data.moduleInfo.level - Module level (beginner, intermediate, advanced)
 * @property {number} data.moduleInfo.order - Module order within level
 * @property {number} data.moduleInfo.duration - Module duration in minutes
 * @property {string[]} data.moduleInfo.prerequisites - Array of prerequisite module IDs
 * @property {string[]} data.moduleInfo.learningObjectives - Array of learning objectives
 * @property {string} data.moduleInfo.bloomLevel - Bloom's taxonomy level
 * @property {string} data.moduleInfo.difficulty - Difficulty level
 * @property {string} data.moduleInfo.estimatedTime - Estimated time as readable string
 * @property {Object} data.lessonPosition - Lesson position information
 * @property {number} data.lessonPosition.current - Current lesson number (1-indexed)
 * @property {number} data.lessonPosition.total - Total lessons in module
 * @property {Object} data.navigation - Navigation between lessons
 * @property {Object|null} data.navigation.previousLesson - Previous lesson info (id, title) or null
 * @property {Object|null} data.navigation.nextLesson - Next lesson info (id, title) or null
 * @property {boolean} isLoading - Loading state indicator
 * @property {string|null} error - Error message or null
 * @property {Function} refetch - Function to manually reload lesson content
 */

export default useLesson;

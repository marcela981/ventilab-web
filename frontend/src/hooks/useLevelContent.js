/**
 * =============================================================================
 * useLevelContent Hook for VentyLab
 * =============================================================================
 * Custom React hook that dynamically loads educational content JSON files
 * based on the authenticated user's learning level (BEGINNER, INTERMEDIATE, ADVANCED).
 *
 * This hook:
 * - Fetches the user's current learning level from their profile
 * - Dynamically imports the appropriate JSON content file
 * - Extracts the specific lesson data from the module
 * - Manages loading and error states
 * - Automatically refetches when moduleId or lessonId changes
 *
 * Content Structure:
 * ------------------
 * Content files are organized in:
 * frontend/src/data/content/{level}/{moduleId}.json
 *
 * Where:
 * - {level} is one of: beginner, intermediate, advanced
 * - {moduleId} is the module identifier (e.g., "respiratory-physiology")
 *
 * Each JSON file contains:
 * - moduleId: Module identifier
 * - level: Content difficulty level
 * - lessons: Array of lesson objects with full content and quizzes
 *
 * Usage Examples:
 * ---------------
 *
 * @example
 * // Basic usage - load a specific lesson
 * const { data, isLoading, error, userLevel } = useLevelContent(
 *   'respiratory-physiology',
 *   'respiratory-basics'
 * );
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage message={error} />;
 * if (!data) return <NotFoundMessage />;
 *
 * return <LessonViewer lesson={data} />;
 *
 * @example
 * // With conditional rendering based on user level
 * const { data, userLevel } = useLevelContent(moduleId, lessonId);
 *
 * return (
 *   <div>
 *     <Badge>{userLevel}</Badge>
 *     <LessonContent content={data?.content} />
 *     {data?.quiz && <Quiz questions={data.quiz.questions} />}
 *   </div>
 * );
 *
 * @example
 * // With refresh capability
 * const { data, isLoading, error, refetch } = useLevelContent(
 *   moduleId,
 *   lessonId
 * );
 *
 * const handleRetry = () => {
 *   refetch();
 * };
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import useAuth from './useAuth';

/**
 * Custom hook to load educational content based on user's learning level
 *
 * @param {string} moduleId - The module identifier (e.g., "respiratory-physiology")
 * @param {string} lessonId - The lesson identifier within the module (e.g., "respiratory-basics")
 * @returns {Object} Content data and state
 * @property {Object|null} data - The lesson content object, or null if not found/loaded
 * @property {boolean} isLoading - True while fetching content
 * @property {string|null} error - Error message if loading failed, null otherwise
 * @property {string|null} userLevel - Current user's learning level (BEGINNER, INTERMEDIATE, ADVANCED)
 * @property {Function} refetch - Function to manually refetch the content
 *
 * @example
 * const { data, isLoading, error, userLevel } = useLevelContent(
 *   'respiratory-physiology',
 *   'oxygen-journey'
 * );
 */
export function useLevelContent(moduleId, lessonId) {
  // ============================================================================
  // State Management
  // ============================================================================

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLevel, setUserLevel] = useState(null);

  // Get authenticated user from auth context
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // ============================================================================
  // Content Loading Function
  // ============================================================================

  /**
   * Load content from JSON file based on user level
   * @param {string} level - User's learning level (BEGINNER, INTERMEDIATE, ADVANCED)
   * @param {string} module - Module identifier
   * @param {string} lesson - Lesson identifier
   */
  const loadContent = useCallback(async (level, module, lesson) => {
    // Validate inputs
    if (!level || !module || !lesson) {
      setError('Missing required parameters: level, moduleId, or lessonId');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      console.log(`📚 [useLevelContent] Loading content: ${module}/${lesson} (Level: ${level})`);

      // Convert level to lowercase for file path
      const levelPath = level.toLowerCase();

      // Dynamically import the JSON file
      // Note: The path must be relative and known at build time for webpack
      let moduleData;
      try {
        moduleData = await import(
          `@/data/content/${levelPath}/${module}.json`
        );
      } catch (importError) {
        console.error(`❌ [useLevelContent] Failed to load module file:`, importError);

        // Check if it's a file not found error
        if (importError.message.includes('Cannot find module')) {
          throw new Error(
            `Contenido no disponible para el módulo "${module}" en nivel ${level}. ` +
            `Verifica que el archivo exista en data/content/${levelPath}/${module}.json`
          );
        }

        throw new Error(`Error al cargar el contenido del módulo: ${importError.message}`);
      }

      // The imported module is wrapped, access .default for JSON content
      const jsonContent = moduleData.default || moduleData;

      // Validate JSON structure
      if (!jsonContent || !jsonContent.lessons || !Array.isArray(jsonContent.lessons)) {
        throw new Error(
          `El archivo de contenido para "${module}" tiene una estructura inválida. ` +
          `Se esperaba un objeto con un array de "lessons".`
        );
      }

      // Find the specific lesson within the module
      const lessonData = jsonContent.lessons.find(
        (l) => l.lessonId === lesson
      );

      if (!lessonData) {
        throw new Error(
          `La lección "${lesson}" no fue encontrada en el módulo "${module}". ` +
          `Lecciones disponibles: ${jsonContent.lessons.map(l => l.lessonId).join(', ')}`
        );
      }

      console.log(`✅ [useLevelContent] Content loaded successfully:`, {
        module,
        lesson: lessonData.lessonId,
        title: lessonData.title,
        level,
      });

      setData(lessonData);
      setError(null);

    } catch (err) {
      console.error(`❌ [useLevelContent] Error loading content:`, err);
      setError(err.message || 'Error desconocido al cargar el contenido');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // Fetch User Level and Load Content
  // ============================================================================

  /**
   * Effect to fetch user level from profile and load content
   * Runs when authentication state changes or when moduleId/lessonId changes
   */
  useEffect(() => {
    // Don't attempt to load if auth is still loading
    if (authLoading) {
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      setError('Debes iniciar sesión para acceder al contenido');
      setIsLoading(false);
      setData(null);
      setUserLevel(null);
      return;
    }

    // Check if we have moduleId and lessonId
    if (!moduleId || !lessonId) {
      setError('Se requiere un ID de módulo y de lección');
      setIsLoading(false);
      setData(null);
      return;
    }

    // Get user level from user object
    // The user object should have a userLevel field after the backend update
    let level = user.userLevel || user.level;

    // Fallback: If userLevel is not available in user object, fetch from API
    if (!level) {
      console.log('⚠️ [useLevelContent] User level not in session, fetching from API...');

      // Fetch user profile to get userLevel
      fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('No se pudo obtener el perfil del usuario');
          }
          return response.json();
        })
        .then(result => {
          if (result.success && result.data?.user?.userLevel) {
            level = result.data.user.userLevel;
            setUserLevel(level);
            loadContent(level, moduleId, lessonId);
          } else {
            throw new Error('No se pudo obtener el nivel del usuario del perfil');
          }
        })
        .catch(err => {
          console.error('❌ [useLevelContent] Error fetching user level:', err);
          // Default to BEGINNER if we can't get the level
          level = 'BEGINNER';
          setUserLevel(level);
          loadContent(level, moduleId, lessonId);
        });

      return; // Exit early, loadContent will be called after fetch
    }

    // We have the level, update state and load content
    setUserLevel(level);
    loadContent(level, moduleId, lessonId);

  }, [
    isAuthenticated,
    authLoading,
    user,
    moduleId,
    lessonId,
    loadContent,
  ]);

  // ============================================================================
  // Refetch Function
  // ============================================================================

  /**
   * Manually refetch content
   * Useful for retry logic or after content updates
   *
   * @returns {void}
   */
  const refetch = useCallback(() => {
    if (userLevel && moduleId && lessonId) {
      loadContent(userLevel, moduleId, lessonId);
    } else if (user) {
      // Trigger effect to re-fetch user level and content
      setIsLoading(true);
    }
  }, [userLevel, moduleId, lessonId, user, loadContent]);

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
    /**
     * The lesson content data
     * Structure matches the JSON file format:
     * {
     *   lessonId: string,
     *   title: string,
     *   content: {
     *     intro: string,
     *     mainContent: array,
     *     keyPoints: array,
     *     examples: array,
     *     summary: string
     *   },
     *   quiz: {
     *     questions: array
     *   }
     * }
     */
    data,

    /**
     * Loading state
     * True while fetching user level or content
     */
    isLoading: isLoading || authLoading,

    /**
     * Error message
     * String describing the error, or null if no error
     */
    error,

    /**
     * Current user's learning level
     * One of: 'BEGINNER', 'INTERMEDIATE', 'ADVANCED', or null
     */
    userLevel,

    /**
     * Manually refetch the content
     * Useful for retry logic after an error
     */
    refetch,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default useLevelContent;

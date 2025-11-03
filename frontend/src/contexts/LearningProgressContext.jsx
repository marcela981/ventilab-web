"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect
} from 'react';
import { Snackbar, Alert } from '@mui/material';

// API Base URL - Adjust according to your environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Helper function to get authentication token
 * Checks both localStorage and sessionStorage
 *
 * @returns {string|null} Authentication token or null
 */
const getAuthToken = () => {
  if (typeof window === 'undefined') return null;

  // Try localStorage first, then sessionStorage
  return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
};

/**
 * Helper function to make authenticated API calls
 *
 * @param {string} endpoint - API endpoint (relative to API_BASE_URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();

  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'API call failed');
  }

  return data;
};

// Crear el Context con valores por defecto expandidos
const LearningProgressContext = createContext({
  // Estado existente
  completedLessons: new Set(),
  quizScores: {},
  timeSpent: 0,
  currentModule: '',
  flashcards: [],
  flashcardReviews: {},

  // Nuevos estados de progreso estructurado
  streak: 0,
  badges: [],
  nextRecommendedLesson: null,
  isLoadingProgress: false,
  progressError: null,

  // Funciones existentes
  markLessonComplete: () => {},
  saveQuizScore: () => {},
  updateTimeSpent: () => {},
  setCurrentModule: () => {},
  addFlashcard: () => {},
  updateFlashcard: () => {},
  markFlashcardReviewed: () => {},
  getFlashcardsDue: () => [],
  getFlashcardStats: {},

  // Nuevas funciones de API
  fetchProgressFromAPI: async () => {},
  fetchStreak: async () => {},
  fetchNextRecommendedLesson: async () => {},
  startLesson: async () => {},
  dismissError: () => {},
});

// Hook personalizado para usar el contexto
export const useLearningProgress = () => {
  const context = useContext(LearningProgressContext);
  if (!context) {
    throw new Error('useLearningProgress debe ser usado dentro de LearningProgressProvider');
  }
  return context;
};

// Provider del contexto
export const LearningProgressProvider = ({ children }) => {
  // =========================================================================
  // ESTADO EXISTENTE (mantenido para compatibilidad)
  // =========================================================================
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [quizScores, setQuizScores] = useState({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [currentModule, setCurrentModule] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardReviews, setFlashcardReviews] = useState({});

  // =========================================================================
  // NUEVOS ESTADOS DE PROGRESO ESTRUCTURADO
  // =========================================================================
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState([]);
  const [nextRecommendedLesson, setNextRecommendedLesson] = useState(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState(null);

  // Estado para Snackbar de errores
  const [showErrorSnackbar, setShowErrorSnackbar] = useState(false);

  // =========================================================================
  // NUEVAS FUNCIONES DE API
  // =========================================================================

  /**
   * Fetch overall user progress from backend API
   * Updates all progress-related states with data from server
   *
   * @returns {Promise<void>}
   */
  const fetchProgressFromAPI = useCallback(async () => {
    try {
      setIsLoadingProgress(true);
      setProgressError(null);

      console.log('[Progress Context] Fetching progress from API...');

      const response = await apiCall('/progress');

      if (response.success && response.data) {
        const {
          completedLessons: completedLessonsCount,
          totalTimeSpent,
          streak: currentStreak,
        } = response.data;

        // Update time spent
        setTimeSpent(totalTimeSpent || 0);

        // Update streak
        setStreak(currentStreak || 0);

        console.log('[Progress Context] Progress updated successfully', {
          completedLessons: completedLessonsCount,
          timeSpent: totalTimeSpent,
          streak: currentStreak,
        });
      }
    } catch (error) {
      console.error('[Progress Context] Error fetching progress:', error);
      setProgressError(error.message);
      setShowErrorSnackbar(true);
    } finally {
      setIsLoadingProgress(false);
    }
  }, []);

  /**
   * Fetch user's current streak from backend API
   *
   * @returns {Promise<void>}
   */
  const fetchStreak = useCallback(async () => {
    try {
      console.log('[Progress Context] Fetching streak...');

      const response = await apiCall('/progress/streak');

      if (response.success && response.data) {
        const { streak: currentStreak, isActive } = response.data;
        setStreak(currentStreak || 0);

        console.log('[Progress Context] Streak updated:', {
          streak: currentStreak,
          isActive,
        });
      }
    } catch (error) {
      console.error('[Progress Context] Error fetching streak:', error);
      // Silently fail for streak - not critical
    }
  }, []);

  /**
   * Fetch next recommended lesson from backend API
   *
   * @returns {Promise<void>}
   */
  const fetchNextRecommendedLesson = useCallback(async () => {
    try {
      console.log('[Progress Context] Fetching next recommended lesson...');

      const response = await apiCall('/progress/next-lesson');

      if (response.success) {
        setNextRecommendedLesson(response.data || null);

        console.log('[Progress Context] Next lesson updated:', response.data);
      }
    } catch (error) {
      console.error('[Progress Context] Error fetching next lesson:', error);
      // Silently fail - not critical
      setNextRecommendedLesson(null);
    }
  }, []);

  /**
   * Start a lesson - marks it as started in the backend
   * Creates or updates lesson progress with lastAccessed timestamp
   *
   * @param {string} moduleId - ID of the module
   * @param {string} lessonId - ID of the lesson to start
   * @returns {Promise<boolean>} Success status
   */
  const startLesson = useCallback(async (moduleId, lessonId) => {
    try {
      console.log('[Progress Context] Starting lesson:', { moduleId, lessonId });

      const response = await apiCall(`/progress/lessons/${lessonId}/start`, {
        method: 'POST',
      });

      if (response.success) {
        console.log('[Progress Context] Lesson started successfully');

        // Update current module
        setCurrentModule(moduleId);

        return true;
      }

      return false;
    } catch (error) {
      console.error('[Progress Context] Error starting lesson:', error);
      setProgressError(error.message);
      setShowErrorSnackbar(true);
      return false;
    }
  }, []);

  /**
   * Mark a lesson as completed
   * UPDATED: Now calls backend API in addition to local state update
   *
   * @param {string} lessonId - ID of the lesson to complete
   * @param {string} moduleId - ID of the module (optional, for better tracking)
   * @param {number} lessonTimeSpent - Time spent on this specific lesson in minutes
   * @returns {Promise<Object|null>} Response data with achievements or null on error
   */
  const markLessonComplete = useCallback(async (lessonId, moduleId = null, lessonTimeSpent = 0) => {
    try {
      console.log('[Progress Context] Completing lesson:', {
        lessonId,
        moduleId,
        lessonTimeSpent
      });

      // Update local state immediately for optimistic UI
      setCompletedLessons(prev => new Set([...prev, lessonId]));

      // Call backend API
      const response = await apiCall(`/progress/lessons/${lessonId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          timeSpent: lessonTimeSpent
        }),
      });

      if (response.success && response.data) {
        const {
          moduleCompleted,
          achievements = [],
          timeSpent: totalTimeSpent
        } = response.data;

        console.log('[Progress Context] Lesson completed successfully', {
          moduleCompleted,
          achievements,
        });

        // Update time spent if returned from backend
        if (totalTimeSpent) {
          setTimeSpent(totalTimeSpent);
        }

        // If achievements were unlocked, update badges
        if (achievements.length > 0) {
          // Fetch updated progress to get latest badges
          await fetchProgressFromAPI();
        }

        // Fetch next recommended lesson after completion
        await fetchNextRecommendedLesson();

        // Return response for UI to show achievements
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('[Progress Context] Error completing lesson:', error);
      setProgressError(error.message);
      setShowErrorSnackbar(true);

      // Don't revert local state - degrade gracefully
      // The lesson will appear completed in UI even if API fails
      return null;
    }
  }, [fetchProgressFromAPI, fetchNextRecommendedLesson]);

  // =========================================================================
  // FUNCIONES EXISTENTES (mantenidas para compatibilidad)
  // =========================================================================

  /**
   * Save quiz score for a lesson
   *
   * @param {string} lessonId - ID of the lesson
   * @param {number} score - Quiz score
   */
  const saveQuizScore = useCallback((lessonId, score) => {
    setQuizScores(prev => ({
      ...prev,
      [lessonId]: score
    }));
  }, []);

  /**
   * Update total time spent learning
   *
   * @param {number} increment - Time increment in minutes
   */
  const updateTimeSpent = useCallback((increment = 1) => {
    setTimeSpent(prev => prev + increment);
  }, []);

  /**
   * Set the current module being studied
   *
   * @param {string} moduleId - ID of the module
   */
  const setCurrentModuleHandler = useCallback((moduleId) => {
    setCurrentModule(moduleId);
  }, []);

  /**
   * Add a flashcard to the user's collection
   *
   * @param {Object} flashcard - Flashcard object
   */
  const addFlashcard = useCallback((flashcard) => {
    setFlashcards(prev => {
      const exists = prev.some(f => f.id === flashcard.id);
      if (exists) return prev;

      return [...prev, {
        ...flashcard,
        createdAt: new Date().toISOString()
      }];
    });
  }, []);

  /**
   * Update an existing flashcard
   *
   * @param {Object} updatedFlashcard - Updated flashcard object
   */
  const updateFlashcard = useCallback((updatedFlashcard) => {
    setFlashcards(prev =>
      prev.map(f =>
        f.id === updatedFlashcard.id ? updatedFlashcard : f
      )
    );
  }, []);

  /**
   * Mark a flashcard as reviewed
   *
   * @param {string} flashcardId - ID of the flashcard
   * @param {number} rating - Review rating
   */
  const markFlashcardReviewed = useCallback((flashcardId, rating) => {
    setFlashcardReviews(prev => ({
      ...prev,
      [flashcardId]: {
        ...prev[flashcardId],
        lastReview: new Date().toISOString(),
        rating,
        totalReviews: (prev[flashcardId]?.totalReviews || 0) + 1
      }
    }));
  }, []);

  /**
   * Get flashcards that are due for review
   *
   * @returns {Array} Array of due flashcards
   */
  const getFlashcardsDue = useCallback(() => {
    if (!Array.isArray(flashcards)) return [];

    const now = new Date();
    return flashcards.filter(flashcard => {
      if (!flashcard || !flashcard.sm2Data || !flashcard.sm2Data.nextReviewDate) {
        return true; // New cards are always due
      }

      const nextReview = new Date(flashcard.sm2Data.nextReviewDate);
      return now >= nextReview;
    });
  }, [flashcards]);

  /**
   * Get flashcard statistics
   *
   * @returns {Object} Flashcard stats
   */
  const getFlashcardStats = useMemo(() => {
    if (!Array.isArray(flashcards)) {
      return {
        total: 0,
        due: 0,
        new: 0,
        reviewed: 0,
        completionRate: 0
      };
    }

    const due = flashcards.filter(flashcard => {
      if (!flashcard || !flashcard.sm2Data || !flashcard.sm2Data.nextReviewDate) {
        return true;
      }

      const nextReview = new Date(flashcard.sm2Data.nextReviewDate);
      const now = new Date();
      return now >= nextReview;
    }).length;

    const total = flashcards.length;
    const newCards = flashcards.filter(f => f && (!f.sm2Data || f.sm2Data.repetitions === 0)).length;
    const reviewed = flashcards.filter(f => f && f.sm2Data && f.sm2Data.repetitions > 0).length;

    return {
      total,
      due,
      new: newCards,
      reviewed,
      completionRate: total > 0 ? (reviewed / total) * 100 : 0
    };
  }, [flashcards]);

  /**
   * Dismiss error message
   */
  const dismissError = useCallback(() => {
    setProgressError(null);
    setShowErrorSnackbar(false);
  }, []);

  // =========================================================================
  // EFFECTS - Initial data loading
  // =========================================================================

  /**
   * Load initial progress data from backend on mount
   * Only runs if user is authenticated (has token)
   */
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      console.log('[Progress Context] Initializing progress data...');

      // Load all initial data in parallel
      Promise.all([
        fetchProgressFromAPI(),
        fetchStreak(),
        fetchNextRecommendedLesson(),
      ]).catch(error => {
        console.error('[Progress Context] Error loading initial data:', error);
      });
    } else {
      console.log('[Progress Context] No auth token found, skipping progress fetch');
    }
  }, []); // Empty dependency array - only run on mount

  // =========================================================================
  // CONTEXT VALUE
  // =========================================================================

  const contextValue = useMemo(() => ({
    // Estado existente
    completedLessons,
    quizScores,
    timeSpent,
    currentModule,
    flashcards,
    flashcardReviews,

    // Nuevos estados
    streak,
    badges,
    nextRecommendedLesson,
    isLoadingProgress,
    progressError,

    // Funciones existentes (markLessonComplete ahora actualizada)
    markLessonComplete,
    saveQuizScore,
    updateTimeSpent,
    setCurrentModule: setCurrentModuleHandler,
    addFlashcard,
    updateFlashcard,
    markFlashcardReviewed,
    getFlashcardsDue,
    getFlashcardStats,

    // Nuevas funciones
    fetchProgressFromAPI,
    fetchStreak,
    fetchNextRecommendedLesson,
    startLesson,
    dismissError,
  }), [
    // Estado existente
    completedLessons,
    quizScores,
    timeSpent,
    currentModule,
    flashcards,
    flashcardReviews,

    // Nuevos estados
    streak,
    badges,
    nextRecommendedLesson,
    isLoadingProgress,
    progressError,

    // Funciones existentes
    markLessonComplete,
    saveQuizScore,
    updateTimeSpent,
    setCurrentModuleHandler,
    addFlashcard,
    updateFlashcard,
    markFlashcardReviewed,
    getFlashcardsDue,
    getFlashcardStats,

    // Nuevas funciones
    fetchProgressFromAPI,
    fetchStreak,
    fetchNextRecommendedLesson,
    startLesson,
    dismissError,
  ]);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <LearningProgressContext.Provider value={contextValue}>
      {children}

      {/* Error Snackbar */}
      <Snackbar
        open={showErrorSnackbar}
        autoHideDuration={6000}
        onClose={dismissError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={dismissError}
          severity="error"
          sx={{ width: '100%' }}
          variant="filled"
        >
          {progressError || 'Error al actualizar el progreso'}
        </Alert>
      </Snackbar>
    </LearningProgressContext.Provider>
  );
};

export default LearningProgressContext;

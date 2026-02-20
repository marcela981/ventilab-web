/**
 * =============================================================================
 * LessonViewer Component for VentyLab
 * =============================================================================
 * 
 * Comprehensive lesson viewer component that renders structured educational content
 * from JSON files. This component integrates with useLesson hook to load detailed
 * lesson content and displays it in a pedagogically effective manner.
 * 
 * Features:
 * - Introduction with learning objectives
 * - Theory sections with subsections, examples, and analogies
 * - Visual element placeholders
 * - Interactive practical cases
 * - Key points summary
 * - Assessment with multiple question types
 * - Bibliographic references
 * - Lesson navigation
 * - Progress tracking
 * - Reading progress indicator
 * 
 * @component
 * @example
 * ```jsx
 * <LessonViewer
 *   lessonId="respiratory-anatomy"
 *   moduleId="module-01-fundamentals"
 * />
 * ```
 * 
 * @param {Object} props - Component props
 * @param {string} props.lessonId - Unique identifier of the lesson
 * @param {string} props.moduleId - Identifier of the parent module
 * @param {Function} [props.onComplete] - Callback when lesson is completed
 * @param {Function} [props.onNavigate] - Callback when navigating to different lesson
 */

import React, { useState, useEffect, useCallback, useRef, memo, Suspense, lazy, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Container,
  Grid,
  Box,
  Button,
  Chip,
  Skeleton,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CssBaseline,
  Portal,
  Stack,
  Paper,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { ThemeProvider } from '@mui/material/styles';
import { teachingModuleTheme } from '../../../theme/teachingModuleTheme';

import useLesson from '../hooks/useLesson';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import useLessonPages from '../hooks/useLessonPages';
import { useProgress } from '@/features/teaching/hooks/useProgress';
import { useLessonProgress } from '@/features/teaching/hooks/useLessonProgress';
import LessonNavigation from './LessonNavigation';
import LessonIndexNavigator from './LessonIndexNavigator';
import TutorAIPopup from './ai/TutorAIPopup';
import AITopicExpander from './ai/AITopicExpander';
import { useTopicContext } from '@/features/teaching/hooks/useTopicContext';
import useScrollCompletion from '@/shared/hooks/useScrollCompletion';
import CompletionConfetti from '@/features/teaching/components/CompletionConfetti';
// Lazy load clinical case components for code splitting
const ClinicalCaseViewer = lazy(() => import('./clinical/ClinicalCaseViewer'));
import PrerequisiteTooltip from '@/features/teaching/components/curriculum/ModuleCard/PrerequisiteTooltip';
import { getModuleById } from '@/features/teaching/data/curriculumData';
import {
  LessonHeader,
  IntroductionSection,
  TheorySection,
  AnalogiesSection,
  VisualElementsSection,
  WaveformsSection,
  ParameterTablesSection,
  KeyPointsSection,
  AssessmentSection,
  ReferencesSection,
  PracticalCaseSection,
  CompletionPage,
} from './sections';

// Lazy load multimedia components
const LazyVideoPlayer = lazy(() => import('./media/VideoPlayer'));
const LazyImageGallery = lazy(() => import('./media/ImageGallery'));
const LazyInteractiveDiagram = lazy(() => import('./media/InteractiveDiagram'));

// Media utility components (from content folder)
import { MediaSkeleton, MediaFallback } from './content';

// Extracted loading/error state components
import LessonLoadingSkeleton from './LessonLoadingSkeleton';
import LessonErrorState from './LessonErrorState';

/**
 * LessonViewer - Main component for displaying lesson content
 */
const LessonViewer = memo(({ lessonId, moduleId, onComplete, onNavigate, defaultOpen = false, onProgressUpdate }) => {
  // ============================================================================
  // Hooks
  // ============================================================================
  
  // Load lesson content using the useLesson hook
  const { data, isLoading, error, refetch } = useLesson(lessonId, moduleId);
  
  // Notify parent component of errors
  useEffect(() => {
    if (error && onNavigate) {
      // Pass error to parent if callback exists
      // This allows TeachingModule to handle errors globally
      console.error('[LessonViewer] Error loading lesson:', error);
    }
  }, [error, onNavigate]);
  
  // Get progress context for marking lessons as complete
  const { completedLessons, updateLessonProgress, syncStatus, getModuleProgressAggregated } = useLearningProgress();
  
  // Get module data to count total lessons
  const module = useMemo(() => {
    return getModuleById(moduleId);
  }, [moduleId]);
  
  // Calculate module completion percentage from completed lessons
  const moduleCompletion = useMemo(() => {
    if (!moduleId || !module?.lessons) return 0;
    const completedCount = module.lessons.filter(lesson => 
      completedLessons.has(`${moduleId}-${lesson.id}`)
    ).length;
    return Math.round((completedCount / module.lessons.length) * 100);
  }, [moduleId, module, completedLessons]);

  // Check if module is fully completed (100%)
  const isModuleCompleted = useMemo(() => {
    if (!moduleId) return false;
    const moduleProgress = getModuleProgressAggregated(moduleId);
    return moduleProgress?.isCompleted === true;
  }, [moduleId, getModuleProgressAggregated]);
  
  const totalLessons = useMemo(() => {
    return module?.lessons?.length || 0;
  }, [module]);
  
  const completedLessonsCount = useMemo(() => {
    if (!module || !module.lessons) return 0;
    return module.lessons.filter(lesson => 
      completedLessons.has(`${moduleId}-${lesson.id}`)
    ).length;
  }, [module, moduleId, completedLessons]);

  // Current lesson index within the module (0-based) for navigation
  const currentLessonIndex = useMemo(() => {
    if (!module?.lessons) return 0;
    const idx = module.lessons.findIndex(l => l.id === lessonId);
    return idx >= 0 ? idx : 0;
  }, [module, lessonId]);

  const lessonType = useMemo(() => {
    if (!data) return 'teoria';
    return data.tipoDeLeccion ||
      data.type ||
      (data.content?.practicalCases?.length > 0 ? 'caso_clinico' :
        data.content?.assessment?.questions?.length > 0 ? 'evaluacion' :
        'teoria');
  }, [data]);

  const estimatedTimeMinutes = useMemo(() => {
    const base = data?.estimatedTime || data?.duration || data?.metadata?.estimatedTime || module?.estimatedTime || 0;
    return typeof base === 'number' ? base : 0;
  }, [data, module]);

  const passingScore = useMemo(() => {
    const score = data?.content?.assessment?.passingScore ?? data?.assessment?.passingScore ?? data?.metadata?.passingScore;
    return typeof score === 'number' ? score : 70;
  }, [data]);

  // Check if this is the first lesson in the module (for TutorAI auto-open logic)
  const isFirstLesson = useMemo(() => {
    if (!module?.lessons || module.lessons.length === 0) return false;
    return module.lessons[0]?.id === lessonId;
  }, [module, lessonId]);

  // NOTE: wasLessonCompletedOnEntry is defined AFTER useLessonProgress hook below,
  // because it depends on backendProgress and isCompleted from that hook.

  // ============================================================================
  // State Management
  // ============================================================================
  
  // Practical cases - user answers
  const [caseAnswers, setCaseAnswers] = useState({});
  const [showCaseAnswers, setShowCaseAnswers] = useState({});
  
  // Assessment - user answers
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [showAssessmentResults, setShowAssessmentResults] = useState(false);
  const [assessmentScore, setAssessmentScore] = useState(null);
  
  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Completion dialog
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  
  // Global pagination state - toda la lección está dividida en páginas
  const [currentPage, setCurrentPage] = useState(0);
  
  // SESSION-LEVEL completion tracking (ref, NOT state).
  // This ref tracks whether completion was triggered during THIS session only.
  // It is NOT the source of truth for completion — that is `wasLessonCompletedOnEntry`
  // which is derived from the database via the context's `completedLessons` Set.
  //
  // Using a ref (not state) because:
  // 1. It doesn't need to trigger re-renders
  // 2. It prevents the "completed → in progress" desync bug that occurred when
  //    useState(false) was reset on every mount/lesson change
  const completedThisSessionRef = useRef(false);
  
  // Track previous lesson ID to detect changes
  const previousLessonIdRef = useRef(lessonId);

  // Confetti state for celebration
  const [showConfetti, setShowConfetti] = useState(false);

  // Guard to prevent TutorAI finalSuggestions from firing multiple times
  const tutorFinalSuggestionsDispatchedRef = useRef(false);
  
  // ============================================================================
  // Refs
  // ============================================================================
  
  const contentRef = useRef(null);
  const autoCompletionRef = useRef(false);
  const autoCompletionInFlightRef = useRef(false);
  const completionNotifiedRef = useRef(false);

  const { isScrolledEnough, meetsReadingTime } = useScrollCompletion({
    contentRef,
    estimatedTimeMinutes,
  });
  
  // ============================================================================
  // NEW: Automatic Progress Tracking with useLessonProgress Hook
  // ============================================================================
  
  const {
    localProgress,
    isSaving,
    isCompleted,
    isRateLimited, // Track rate limiting state
    showResumeAlert,
    dismissResumeAlert,
    saveProgress,
    savePageProgress,
    backendProgress,
  } = useLessonProgress({
    lessonId,
    moduleId,
    contentRef,
    onComplete: () => {
      // GUARD: Only trigger completion if lesson was NOT already completed.
      // Check the DB-backed context Set directly (avoids TDZ with wasLessonCompletedOnEntry
      // which is declared after this hook call).
      const lessonKey = `${moduleId}-${lessonId}`;
      const alreadyCompleted = completedLessons.has(lessonKey);
      if (alreadyCompleted || completedThisSessionRef.current) {
        console.log('[LessonViewer] Skipping completion callback - lesson already completed');
        return;
      }
      completedThisSessionRef.current = true;
      setShowConfetti(true);
      console.log('[LessonViewer] Lesson auto-completed via page tracking');
    },
    autoSaveThreshold: 5, // Guardar cada 5% de progreso (más frecuente)
    autoCompleteThreshold: 90,
  });

  // Check if the lesson was already completed before entering this session.
  // This is used to prevent TutorAI from auto-opening on re-entry AND to prevent
  // re-completion when revisiting an already-completed lesson.
  //
  // CRITICAL: Check BOTH the context's completedLessons Set AND the backend progress.
  // The context Set may be stale if the snapshot hasn't refreshed yet, so we also
  // check backendProgress (from useLessonProgress hook) and isCompleted as fallbacks.
  //
  // MUST be declared AFTER the useLessonProgress hook (which provides backendProgress
  // and isCompleted).
  const wasLessonCompletedOnEntry = useMemo(() => {
    const lessonKey = `${moduleId}-${lessonId}`;
    return (
      completedLessons.has(lessonKey) ||
      backendProgress?.completed === true ||
      isCompleted === true
    );
  }, [moduleId, lessonId, completedLessons, backendProgress, isCompleted]);
  
  // ============================================================================
  // Scroll to top on mount or lesson change
  // ============================================================================

  useEffect(() => {
    // Reset session-level guards when lesson changes.
    // NOTE: completedThisSessionRef resets because this is a NEW lesson session.
    // The actual completion truth comes from wasLessonCompletedOnEntry (DB-derived).
    completedThisSessionRef.current = false;
    autoCompletionRef.current = false;
    autoCompletionInFlightRef.current = false;
    completionNotifiedRef.current = false;
    tutorFinalSuggestionsDispatchedRef.current = false;

    // CRITICAL FIX: Reset currentPage to 0 when lessonId changes
    // This ensures the user starts at the beginning of the new lesson,
    // not at the page index they were at in the previous lesson
    if (previousLessonIdRef.current !== lessonId) {
      console.log('[LessonViewer] Lesson changed from', previousLessonIdRef.current, 'to', lessonId, '- resetting to page 0');
      setCurrentPage(0);
      previousLessonIdRef.current = lessonId;

      // Scroll to top when navigating to new lesson
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [lessonId]);

  // Initialize currentPage from backend progress (synchronized with database)
  useEffect(() => {
    if (!backendProgress) {
      // Backend progress not loaded yet, use localStorage as fallback
      try {
        const savedProgress = localStorage.getItem(`lesson_progress_${lessonId}`);
        if (savedProgress) {
          const { currentPage: savedPage } = JSON.parse(savedProgress);
          if (typeof savedPage === 'number' && savedPage >= 0) {
            console.log('[LessonViewer] Using localStorage page (backend not loaded yet):', savedPage + 1);
            setCurrentPage(savedPage);
            return;
          }
        }
      } catch (e) {
        console.error('[LessonViewer] Error reading localStorage:', e);
      }
      // Default to page 0 if no data available
      setCurrentPage(0);
      return;
    }

    // Backend progress is available - use it to initialize currentPage
    if (backendProgress.completed) {
      // If lesson is completed, always start at page 0
      console.log('[LessonViewer] Lesson completed, starting at page 0');
      setCurrentPage(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (backendProgress.currentStep && backendProgress.currentStep > 0) {
      // Initialize from backend currentStep (convert from 1-based to 0-based)
      const initialPage = backendProgress.currentStep - 1;
      console.log('[LessonViewer] Initializing from backend progress:', {
        currentStep: backendProgress.currentStep,
        initialPage: initialPage + 1,
        completionPercentage: backendProgress.completionPercentage,
      });
      setCurrentPage(initialPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // No step data in backend, fallback to localStorage or page 0
      try {
        const savedProgress = localStorage.getItem(`lesson_progress_${lessonId}`);
        if (savedProgress) {
          const { currentPage: savedPage } = JSON.parse(savedProgress);
          if (typeof savedPage === 'number' && savedPage >= 0) {
            console.log('[LessonViewer] Using localStorage page (no step data in backend):', savedPage + 1);
            setCurrentPage(savedPage);
            return;
          }
        }
      } catch (e) {
        console.error('[LessonViewer] Error reading localStorage:', e);
      }
      console.log('[LessonViewer] No step data available, starting at page 0');
      setCurrentPage(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [lessonId, backendProgress]);
  
  // Progress tracking is now handled by useProgress hook (auto-save every 5 min)
  
  // ============================================================================
  // Navigation Handlers
  // ============================================================================
  
  const handleNavigateToLesson = useCallback(async (targetLessonId, targetModuleId) => {
    // SAFETY CHECK: Prevent navigating to the same lesson (would cause reload loop)
    if (targetLessonId === lessonId) {
      console.warn('[LessonViewer] ⚠️ Attempted to navigate to the same lesson:', targetLessonId);
      console.warn('[LessonViewer] This indicates a bug in nextLesson calculation. Aborting navigation.');
      return;
    }

    // Validate required parameters
    if (!targetLessonId || !targetModuleId) {
      console.error('[LessonViewer] ❌ Invalid navigation parameters:', { targetLessonId, targetModuleId });
      return;
    }

    console.log('[LessonViewer] 🚀 Navigating from', lessonId, 'to', targetLessonId, 'in module', targetModuleId);

    // CRITICAL: Save progress before navigation to ensure persistence
    try {
      console.log('[LessonViewer] Saving progress before navigation...');
      await saveProgress(); // Wait for progress to be saved
      console.log('[LessonViewer] Progress saved, navigating to:', targetLessonId);
    } catch (error) {
      console.error('[LessonViewer] Failed to save progress before navigation:', error);
      // Continue with navigation even if save fails
    }

    if (onNavigate) {
      onNavigate(targetLessonId, targetModuleId);
    } else {
      // Default navigation - update URL or use window.location
      // This will be handled by the parent component or routing system
      if (typeof window !== 'undefined') {
        window.location.href = `/teaching/lesson/${targetModuleId}/${targetLessonId}`;
      }
    }
  }, [lessonId, saveProgress, onNavigate]);
  
  // ============================================================================
  // Automatic Completion
  // ============================================================================

  // Trigger auto-completion by saving progress at 100%
  // This will automatically mark the lesson as completed via useLessonProgress hook
  const triggerAutoCompletion = useCallback(async () => {
    // GUARD: Prevent completion if lesson is already completed (DB or session)
    if (!data || completedThisSessionRef.current || autoCompletionRef.current || autoCompletionInFlightRef.current) {
      return false;
    }

    // GUARD: Do not trigger completion if lesson was already completed in DB
    if (wasLessonCompletedOnEntry) {
      console.log('[LessonViewer] Skipping auto-completion - lesson already completed (DB)');
      return false;
    }

    // GUARD: Do not trigger completion in free navigation mode (module completed)
    if (isModuleCompleted) {
      console.log('[LessonViewer] Skipping auto-completion - module completed, read-only navigation');
      return false;
    }

    autoCompletionInFlightRef.current = true;

    try {
      console.log('[LessonViewer] 🎉 Auto-completing lesson by saving at 100%');
      // Save progress at 100% to complete the lesson
      await saveProgress(true); // forceComplete = true

      autoCompletionRef.current = true;
      completedThisSessionRef.current = true;

      // CRITICAL: Notify parent exactly once using completionNotifiedRef guard
      // GUARD: Only notify if lesson was NOT already completed
      if (!completionNotifiedRef.current && onComplete && !wasLessonCompletedOnEntry) {
        completionNotifiedRef.current = true;
        console.log('[LessonViewer] Notifying parent of completion (triggerAutoCompletion)');
        onComplete(data);
      }

      return true;
    } catch (error) {
      console.error('[LessonViewer] Failed to auto-complete lesson:', error);
      setSnackbarMessage('No se pudo completar la lección automáticamente.');
      setSnackbarOpen(true);
      return false;
    } finally {
      autoCompletionInFlightRef.current = false;
    }
  }, [data, saveProgress, onComplete, wasLessonCompletedOnEntry, isModuleCompleted]);

  // ============================================================================
  // Practical Cases Handlers
  // ============================================================================
  
  const handleCaseAnswerChange = useCallback((caseId, questionIndex, answer) => {
    setCaseAnswers(prev => ({
      ...prev,
      [`${caseId}-${questionIndex}`]: answer,
    }));
  }, []);
  
  const handleShowCaseAnswers = useCallback((caseId) => {
    setShowCaseAnswers(prev => ({
      ...prev,
      [caseId]: !prev[caseId],
    }));
  }, []);
  
  // ============================================================================
  // Assessment Handlers
  // ============================================================================
  
  const handleAssessmentAnswerChange = useCallback((questionId, answer) => {
    setAssessmentAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  }, []);
  
  const handleSubmitAssessment = useCallback(() => {
    if (!data?.content?.assessment?.questions) return;
    
    const questions = data.content.assessment.questions;
    let correct = 0;
    let total = questions.length;
    
    questions.forEach((question) => {
      const userAnswer = assessmentAnswers[question.questionId];
      const correctAnswer = question.correctAnswer;
      
      if (userAnswer !== undefined && String(userAnswer) === String(correctAnswer)) {
        correct++;
      }
    });
    
    const percentage = Math.round((correct / total) * 100);
    setAssessmentScore({ correct, total, percentage });
    setShowAssessmentResults(true);

    // GUARD: Only trigger auto-completion if lesson was NOT already completed
    // This prevents re-completion when navigating to already-completed lessons
    if (percentage >= passingScore && !wasLessonCompletedOnEntry) {
      triggerAutoCompletion();
    } else if (percentage >= passingScore && wasLessonCompletedOnEntry) {
      console.log('[LessonViewer] Skipping assessment completion - lesson already completed on entry');
    }
  }, [data, assessmentAnswers, passingScore, triggerAutoCompletion, wasLessonCompletedOnEntry]);
  
  // ============================================================================
  // Snackbar Handlers
  // ============================================================================
  
  const handleCloseSnackbar = useCallback(() => {
    setSnackbarOpen(false);
  }, []);
  
  // ============================================================================
  // Page Structure and Navigation
  // ============================================================================
  
  // Calculate pages using custom hook (including clinical case page if module is complete)
  const calculatePages = useLessonPages(data, moduleId, moduleCompletion);
  const totalPages = calculatePages.length;
  const currentPageData = calculatePages[currentPage];
  
  // REMOVED: Auto-navigation based on progress percentage
  // This was causing completed lessons to auto-navigate to the final screen.
  // Navigation to the end must ONLY occur after the user explicitly completes the lesson.
  // 
  // Users should always start at the first page when entering a lesson,
  // regardless of completion status. Completed lessons can be reviewed normally
  // by navigating through pages manually.

  // Notificar al padre sobre cambios en el progreso
  useEffect(() => {
    if (onProgressUpdate && totalPages > 0) {
      onProgressUpdate(currentPage, totalPages);
    }
  }, [currentPage, totalPages, onProgressUpdate]);
  
  // Obtener contexto de la página actual para AITopicExpander
  // Se calcula después de currentPageData para tener la información de la sección actual
  const topicContext = useTopicContext({
    contentRef,
    moduleId,
    lessonId,
    sectionId: currentPageData?.section?.id || currentPageData?.sectionId || null,
    moduleData: module,
    lessonData: data,
    sectionData: currentPageData?.section || currentPageData || null,
  });
  
  // Calculate totalSteps from lesson sections (backend requires this)
  const totalSteps = useMemo(() => {
    if (!data?.sections || !Array.isArray(data.sections)) {
      return totalPages; // Fallback to totalPages if sections not available
    }
    return data.sections.length;
  }, [data, totalPages]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // CRITICAL: Save progress when page changes
      // Always send currentStep and totalSteps (required by backend)
      console.log('[LessonViewer] Next page clicked, saving progress:', newPage + 1, '/', totalPages, 'steps:', totalSteps);
      savePageProgress(newPage, totalPages, totalSteps);
    }
  }, [currentPage, totalPages, totalSteps, savePageProgress]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Save progress when page changes (even going back)
      // Always send currentStep and totalSteps (required by backend)
      console.log('[LessonViewer] Prev page clicked, saving progress:', newPage + 1, '/', totalPages, 'steps:', totalSteps);
      savePageProgress(newPage, totalPages, totalSteps);
    }
  }, [currentPage, totalPages, totalSteps, savePageProgress]);

  // Handle direct navigation to a specific page (from LessonIndexNavigator)
  // When module is completed, navigation is read-only and doesn't mark lessons as completed
  const handleNavigateToPage = useCallback((targetPageIndex) => {
    if (targetPageIndex >= 0 && targetPageIndex < totalPages) {
      setCurrentPage(targetPageIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // When module is completed, we still save page position for user convenience
      // but this is read-only navigation - it won't mark the lesson as completed
      // because the lesson is already completed (isCompleted check in savePageProgress prevents re-completion)
      console.log('[LessonViewer] Direct navigation to page:', targetPageIndex + 1, {
        moduleCompleted: isModuleCompleted,
        readOnly: isModuleCompleted,
        wasAlreadyCompleted: wasLessonCompletedOnEntry,
      });
      
      // Save page position for resume - savePageProgress already has guards to prevent
      // re-completion if lesson is already completed (checks !isCompleted before auto-completing)
      // This is safe even in free navigation mode because:
      // 1. savePageProgress checks !isCompleted before auto-completing
      // 2. wasLessonCompletedOnEntry ensures isCompleted is true for already-completed lessons
      // 3. We're only saving position, not triggering completion logic
      savePageProgress(targetPageIndex, totalPages, totalSteps);
    }
  }, [totalPages, totalSteps, savePageProgress, isModuleCompleted, wasLessonCompletedOnEntry]);
  
  // Handle lesson selection from the numeric lesson pagination
  // When module is completed → any lesson is clickable (free navigation)
  // When module is NOT completed → only current or past lessons are accessible
  const handleSelectLesson = useCallback((index) => {
    if (!module?.lessons) return;

    // Guard: if module not completed, only allow navigation to current or earlier lessons
    if (!isModuleCompleted && index > currentLessonIndex) {
      console.log('[LessonViewer] Blocked navigation to future lesson:', index, '(max:', currentLessonIndex, ')');
      return;
    }

    const targetLesson = module.lessons[index];
    if (!targetLesson) return;

    // If navigating to the same lesson, do nothing
    if (targetLesson.id === lessonId) return;

    console.log('[LessonViewer] Navigating to lesson via progress bar:', targetLesson.id);
    if (onNavigate) {
      onNavigate(targetLesson.id, moduleId);
    }
  }, [module, isModuleCompleted, currentLessonIndex, lessonId, moduleId, onNavigate]);

  // Handle completion page display and progress marking
  // IMPORTANT: This effect ONLY marks progress and shows confetti.
  // It does NOT trigger navigation - that's handled by user clicking buttons on CompletionPage.
  useEffect(() => {
    // Find the completion page index
    const completionPageIndex = calculatePages.findIndex(page => page.type === 'completion');

    // When user reaches the completion page, notify parent to update global progress state
    // Use completionNotifiedRef to ensure we only notify once per lesson session
    if (completionPageIndex >= 0 && currentPage === completionPageIndex && data) {
      // GUARD: Only show confetti if this is a FRESH completion (not revisiting)
      // Completion truth comes from DB (wasLessonCompletedOnEntry), not local state.
      if (!completedThisSessionRef.current && !wasLessonCompletedOnEntry) {
        completedThisSessionRef.current = true;
        setShowConfetti(true);
      }

      // GUARD: Only notify parent if lesson was NOT already completed (DB-derived)
      // This prevents duplicate completion events when navigating to already-completed lessons
      if (!completionNotifiedRef.current && onComplete && !wasLessonCompletedOnEntry) {
        completionNotifiedRef.current = true;
        console.log('[LessonViewer] User reached completion page, notifying parent');
        onComplete(data);
      } else if (wasLessonCompletedOnEntry) {
        console.log('[LessonViewer] Skipping completion notification - lesson already completed (DB)');
      }

      // GUARD: Only dispatch tutor:finalSuggestions ONCE per lesson session
      // and ONLY if this is a fresh completion (not re-entering a completed lesson)
      if (!tutorFinalSuggestionsDispatchedRef.current) {
        // Check if this lesson was already completed before this session
        const lessonKey = `${moduleId}-${lessonId}`;
        const wasAlreadyCompleted = completedLessons.has(lessonKey);

        // Only dispatch if this is NOT a re-entry to an already-completed lesson
        if (!wasAlreadyCompleted) {
          tutorFinalSuggestionsDispatchedRef.current = true;
          console.log('[LessonViewer] Dispatching tutor:finalSuggestions (fresh completion)');

          const event = new CustomEvent('tutor:finalSuggestions', {
            detail: {
              ctx: {
                moduleId: data?.moduleId || moduleId,
                lessonId: data?.lessonId || lessonId,
                pageId: currentPageData?.section?.id || currentPageData?.id,
                sectionId: currentPageData?.section?.id,
                moduleTitle: module?.title,
                lessonTitle: data?.title,
                pageTitle: currentPageData?.section?.title || currentPageData?.title,
                sectionTitle: currentPageData?.section?.title,
              },
              results: assessmentScore ? {
                correct: assessmentScore.correct,
                total: assessmentScore.total,
                percentage: assessmentScore.percentage,
              } : null,
            },
          });
          window.dispatchEvent(event);
        } else {
          console.log('[LessonViewer] Skipping tutor:finalSuggestions - lesson already completed');
        }
      }
    }

    // Show confetti when isCompleted becomes true from progress tracking
    // (before user reaches completion page). Don't notify parent here -
    // parent notification only happens when user reaches the completion page.
    // GUARD: Only trigger if lesson was NOT already completed (DB-derived)
    if (isCompleted && !completedThisSessionRef.current && !wasLessonCompletedOnEntry) {
      completedThisSessionRef.current = true;
      setShowConfetti(true);
      console.log('[LessonViewer] Progress completed, showing confetti (no redirect)');
    } else if (isCompleted && wasLessonCompletedOnEntry) {
      console.log('[LessonViewer] Skipping completion UI - lesson already completed (DB)');
    }
  }, [currentPage, calculatePages, data, isCompleted, moduleId, lessonId, module, currentPageData, assessmentScore, onComplete, completedLessons, wasLessonCompletedOnEntry]);
  
  // ============================================================================
  // Build lesson context for AI Tutor
  // ============================================================================
  
  const buildLessonContext = useCallback(() => {
    if (!data) return null;
    
    // Extraer tags del contenido o metadata
    const tags = data.tags || 
                 data.content?.tags || 
                 (data.content?.theory?.sections?.[0]?.tags) || 
                 [];
    
    // Determinar tipo de lección desde metadata o inferir del contenido
    const tipoDeLeccion = data.tipoDeLeccion || 
                          data.type || 
                          (data.content?.practicalCases?.length > 0 ? 'caso_clinico' : 
                           data.content?.assessment?.questions?.length > 0 ? 'evaluacion' : 
                           'teoria');
    
    return {
      lessonId: data.lessonId || lessonId,
      title: data.title || '',
      objectives: data.content?.introduction?.objectives || 
                  data.learningObjectives || 
                  data.objectives || 
                  [],
      tags: Array.isArray(tags) ? tags : [],
      tipoDeLeccion: tipoDeLeccion,
    };
  }, [data, lessonId]);
  
  // ============================================================================
  // Media Blocks Rendering
  // ============================================================================
  
  /**
   * Renders a single media block based on its type
   * @param {Object} block - Media block object with type and data
   * @param {number} index - Index of the block in the media array
   * @returns {React.Element} Rendered media component or fallback
   */
  const renderMediaBlock = useCallback((block, index) => {
    // Validación inicial: bloque malformado
    if (!block || !block.type || !block.data) {
      console.warn(
        `[LessonViewer] Bloque multimedia ${index + 1} malformado:`,
        'Falta type o data',
        block
      );
      return (
        <MediaFallback
          message="Contenido no disponible: estructura de datos inválida"
          blockIndex={index}
          blockType="unknown"
        />
      );
    }

    const { type, data } = block;
    const ariaLabelBase = `Bloque multimedia ${index + 1}`;

    switch (type) {
      case 'video': {
        // Validación: video sin URL
        if (!data.url || typeof data.url !== 'string') {
          console.warn(
            `[LessonViewer] Bloque video ${index + 1} inválido:`,
            'URL no proporcionada o inválida',
            data
          );
          return (
            <MediaFallback
              message="Video: URL no proporcionada o inválida"
              actionUrl={data.url} // Por si acaso hay una URL pero está mal formada
              blockIndex={index}
              blockType="video"
            />
          );
        }

        const ariaLabel = data.title 
          ? `Video: ${data.title}` 
          : `${ariaLabelBase} - Video`;

        return (
          <Suspense fallback={<MediaSkeleton variant="video" />}>
            <Box sx={{ my: 2 }} aria-label={ariaLabel}>
              <LazyVideoPlayer
                url={data.url}
                title={data.title}
                provider={data.provider || 'auto'}
                start={data.start}
                poster={data.poster}
                onError={(error, url) => {
                  console.warn(
                    `[LessonViewer] Error en video ${index + 1}:`,
                    error,
                    { url, blockIndex: index }
                  );
                }}
              />
            </Box>
          </Suspense>
        );
      }

      case 'imageGallery': {
        // Validación: galería sin imágenes o array vacío
        if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
          console.warn(
            `[LessonViewer] Bloque imageGallery ${index + 1} inválido:`,
            'No hay imágenes o array inválido',
            data
          );
          return (
            <MediaFallback
              message="Galería: No hay imágenes disponibles"
              blockIndex={index}
              blockType="imageGallery"
            />
          );
        }

        const ariaLabel = `${ariaLabelBase} - Galería de imágenes`;

        return (
          <Suspense fallback={<MediaSkeleton variant="imageGallery" />}>
            <Box sx={{ my: 2 }} aria-label={ariaLabel}>
              <LazyImageGallery
                images={data.images}
                columns={data.columns}
                onImageError={(imgIndex, src) => {
                  console.warn(
                    `[LessonViewer] Error en imagen ${imgIndex + 1} de galería ${index + 1}:`,
                    { src, imageIndex: imgIndex, galleryIndex: index }
                  );
                }}
              />
            </Box>
          </Suspense>
        );
      }

      case 'diagram': {
        // Validación: diagrama sin svgSrc ni svgString
        if (!data.svgSrc && !data.svgString) {
          console.warn(
            `[LessonViewer] Bloque diagram ${index + 1} inválido:`,
            'No se proporcionó svgSrc ni svgString',
            data
          );
          return (
            <MediaFallback
              message="Diagrama: No se proporcionó svgSrc ni svgString"
              actionUrl={data.svgSrc} // Por si hay svgSrc pero está mal formado
              blockIndex={index}
              blockType="diagram"
            />
          );
        }

        const ariaLabel = data.ariaLabel || `${ariaLabelBase} - Diagrama interactivo`;

        return (
          <Suspense fallback={<MediaSkeleton variant="diagram" />}>
            <Box sx={{ my: 2 }} aria-label={ariaLabel}>
              <LazyInteractiveDiagram
                svgSrc={data.svgSrc}
                svgString={data.svgString}
                height={data.height || 500}
                width={data.width || '100%'}
                initialScale={data.initialScale || 1}
                onLoad={() => {
                  console.log(
                    `[LessonViewer] Diagrama ${index + 1} cargado exitosamente`,
                    { blockIndex: index }
                  );
                }}
                onError={(error) => {
                  console.warn(
                    `[LessonViewer] Error en diagrama ${index + 1}:`,
                    error,
                    { blockIndex: index, svgSrc: data.svgSrc }
                  );
                }}
                aria-label={ariaLabel}
              />
            </Box>
          </Suspense>
        );
      }

      default:
        console.warn(
          `[LessonViewer] Tipo de bloque multimedia no soportado:`,
          type,
          { blockIndex: index, block }
        );
        return (
          <MediaFallback
            message={`Tipo de contenido multimedia no soportado: ${type}`}
            blockIndex={index}
            blockType={type}
          />
        );
    }
  }, []);

  /**
   * Renders all media blocks from lesson.media array
   * @returns {React.Element|null} Stack of media blocks or null if no media
   */
  const renderMediaBlocks = useCallback(() => {
    if (!data?.media || !Array.isArray(data.media) || data.media.length === 0) {
      return null;
    }

    return (
      <Stack spacing={2} sx={{ my: 3 }}>
        {data.media.map((block, index) => (
          <Box key={`media-block-${index}`}>
            {renderMediaBlock(block, index)}
          </Box>
        ))}
      </Stack>
    );
  }, [data, renderMediaBlock]);

  // ============================================================================
  // Render Functions
  // ============================================================================
  
  /**
   * Render current page based on page type
   */
  const renderCurrentPage = () => {
    if (!currentPageData || !data) return null;
    
    switch (currentPageData.type) {
      case 'header-intro':
    return (
          <Box>
            <LessonHeader data={data} currentPage={currentPage} totalPages={totalPages} />
            <IntroductionSection introduction={data.content?.introduction} />
      </Box>
    );
      case 'theory':
    return (
          <TheorySection
            section={currentPageData.section}
            sectionIndex={currentPageData.sectionIndex}
            theory={data.content?.theory}
            moduleId={moduleId}
            lessonId={lessonId}
            lessonData={data}
            currentPageType={currentPageData.type}
          />
        );
      case 'analogies':
    return (
          <AnalogiesSection analogies={data.content?.theory?.analogies} />
        );
      case 'analogy':
    return (
          <AnalogiesSection singleAnalogy={currentPageData.analogy} />
        );
      case 'visual-elements':
          return (
          <VisualElementsSection visualElements={data.content?.visualElements} />
        );
      case 'waveforms':
    return (
          <WaveformsSection data={data} />
        );
      case 'parameter-tables':
    return (
          <ParameterTablesSection data={data} />
        );
      case 'practical-case':
    return (
          <PracticalCaseSection
            practicalCase={data.content?.practicalCases?.[currentPageData.caseIndex]}
            caseIndex={currentPageData.caseIndex}
            caseAnswers={caseAnswers}
            showAnswers={showCaseAnswers[currentPageData.case?.caseId || `case-${currentPageData.caseIndex}`]}
            onAnswerChange={handleCaseAnswerChange}
            onToggleAnswers={handleShowCaseAnswers}
          />
        );
      case 'key-points':
    return (
          <KeyPointsSection keyPoints={data.content?.keyPoints} />
        );
      case 'assessment':
        return (
          <AssessmentSection
            questions={data.content?.assessment?.questions}
            assessmentAnswers={assessmentAnswers}
            showAssessmentResults={showAssessmentResults}
            assessmentScore={assessmentScore}
            onAnswerChange={handleAssessmentAnswerChange}
            onSubmit={handleSubmitAssessment}
            onReset={() => {
                setShowAssessmentResults(false);
                setAssessmentAnswers({});
              }}
            onCloseResults={() => setShowAssessmentResults(false)}
          />
        );
      case 'references':
    return (
          <ReferencesSection references={data.content?.references} />
        );
      case 'completion':
    return (
          <CompletionPage
            data={data}
            totalPages={totalPages}
            onNavigateToLesson={handleNavigateToLesson}
            startTime={Date.now()}
          />
        );
      case 'clinical-case':
        return (
          <Box id="clinical-case-section">
            {moduleCompletion === 100 ? (
              <Suspense fallback={
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Skeleton variant="rectangular" width="100%" height={200} sx={{ mb: 2 }} />
                  <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} />
                </Paper>
              }>
                <ClinicalCaseViewer
                  moduleId={moduleId}
                  onCompleted={triggerAutoCompletion}
                  onBack={() => {
                    // Navegar a la página anterior (completion)
                    const completionPageIndex = calculatePages.findIndex(page => page.type === 'completion');
                    if (completionPageIndex >= 0) {
                      setCurrentPage(completionPageIndex);
                    }
                  }}
                />
              </Suspense>
            ) : (
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                  }}
                >
                  <PrerequisiteTooltip
                    missing={[]}
                    side="top"
                  >
                    <LockIcon
                      sx={{
                        fontSize: 40,
                        color: 'text.disabled',
                      }}
                      aria-label="Caso clínico bloqueado"
                    />
                  </PrerequisiteTooltip>
                </Box>

                <Box sx={{ mt: 4, mb: 2 }}>
                  <LockIcon
                    sx={{
                      fontSize: 64,
                      color: 'text.disabled',
                      mb: 2,
                    }}
                  />
                </Box>

                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Caso Clínico Bloqueado
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mt: 2 }}>
                  Debes completar {completedLessonsCount}/{totalLessons} lecciones antes de iniciar el caso clínico
                </Typography>
              </Paper>
            )}
          </Box>
        );
      default:
        return null;
    }
  };
  
  // ============================================================================
  // Loading State - Using extracted component
  // ============================================================================

  if (isLoading) {
    return <LessonLoadingSkeleton />;
  }

  // ============================================================================
  // Error State - Using extracted component
  // ============================================================================

  if (error || !data) {
    return <LessonErrorState error={error} onRetry={refetch} />;
  }
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  return (
    <ThemeProvider theme={teachingModuleTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh' }}>
        {/* Resume Alert */}
        {showResumeAlert && (
          <Alert
            severity="info"
            onClose={dismissResumeAlert}
            sx={{
              position: 'fixed',
              top: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1300,
              minWidth: '300px',
              maxWidth: '500px',
            }}
          >
            Continuando desde {Math.round(backendProgress?.completionPercentage || localProgress)}%
          </Alert>
        )}

        {/* Completion Confetti */}
        <CompletionConfetti
          show={showConfetti}
          onComplete={() => {
            setShowConfetti(false);
            // Optionally navigate to next lesson or module
            console.log('[LessonViewer] Confetti animation complete');
          }}
          message="¡Lección completada! ✅"
          duration={3000}
        />
        
        <Container
          maxWidth="lg"
            sx={{
            py: { xs: 2, md: 4 },
              backgroundColor: (theme) => theme.palette.teaching.paperBg,
              borderRadius: '8px 8px 0 0', // Redondeado solo arriba para continuar con la navegación
              p: { xs: 2, md: 3 },
            minHeight: '70vh',
            color: '#ffffff',
            '& .MuiTypography-root': {
              color: '#ffffff',
            },
            }}
          >

              {/* Review Mode Indicator - Only visible when module is completed */}
              {isModuleCompleted && (
                <Box
                  sx={{
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Chip
                    icon={<VisibilityIcon sx={{ fontSize: 16, color: '#e8f4fd' }} />}
                    label="Modo revisión – el progreso no se verá afectado"
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      borderColor: 'rgba(33, 150, 243, 0.4)',
                      color: '#e8f4fd',
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(33, 150, 243, 0.15)',
                        borderColor: 'rgba(33, 150, 243, 0.6)',
                      },
                      '& .MuiChip-icon': {
                        color: '#e8f4fd',
                      },
                    }}
                  />
                </Box>
              )}

              <article id="lesson-content" ref={contentRef}>
                {renderCurrentPage()}
                
                {/* Media Blocks Section - Rendered after main content */}
                {renderMediaBlocks()}
                
                {/* AI Topic Expander - Renderizado al final del contenido */}
                {data && (
                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                    <AITopicExpander
                      context={topicContext}
                      variant={data.metadata?.aiExpanderVariant || 'button'}
                      enabled={data.metadata?.aiExpander !== false}
                    />
                  </Box>
                )}
              </article>
        </Container>
        
        {/* Lesson Index Navigator - Only visible when module is completed */}
        {isModuleCompleted && (
          <LessonIndexNavigator
            currentPage={currentPage}
            totalPages={totalPages}
            pages={calculatePages}
            isModuleCompleted={isModuleCompleted}
            onNavigateToPage={handleNavigateToPage}
            moduleId={moduleId}
            lessonId={lessonId}
          />
        )}

        {/* Global Navigation - Always visible */}
        <LessonNavigation
          currentPage={currentPage}
          totalPages={totalPages}
          data={data}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onNavigateToLesson={handleNavigateToLesson}
          isModuleCompleted={isModuleCompleted}
          totalLessons={totalLessons}
          currentLessonIndex={currentLessonIndex}
          onSelectLesson={handleSelectLesson}
        />
        
        {/* Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="success" variant="filled">
            {snackbarMessage}
          </Alert>
        </Snackbar>
        
        {/* Rate Limit Notification - Friendly message instead of error */}
        <Snackbar
          open={isRateLimited}
          autoHideDuration={null} // Don't auto-hide - user should see it until rate limit expires
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ mt: 8 }} // Margin top to avoid overlap with header
        >
          <Alert 
            severity="info" 
            variant="filled"
            sx={{ 
              backgroundColor: '#1976d2', // Blue color for info
              '& .MuiAlert-icon': {
                color: 'white',
              },
            }}
          >
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
              Estás progresando muy rápido. Por favor continúa un poco más despacio.
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', display: 'block', mt: 0.5 }}>
              Tu progreso está seguro y se guardará automáticamente en breve.
            </Typography>
          </Alert>
        </Snackbar>
        
        {/* Completion Dialog */}
        <Dialog open={completionDialogOpen} onClose={() => setCompletionDialogOpen(false)}>
          <DialogTitle>¡Lección Completada!</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Has completado exitosamente esta lección. ¡Felicidades!
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompletionDialogOpen(false)}>Cerrar</Button>
            {data?.navigation?.nextLesson && (
              <Button
                variant="contained"
                onClick={() => {
                  setCompletionDialogOpen(false);
                  handleNavigateToLesson(data.navigation.nextLesson.id, data.moduleId);
                }}
              >
                Continuar a la Siguiente Lección
              </Button>
            )}
          </DialogActions>
        </Dialog>
        
        {/* AI Tutor Chat Widget - Usando Portal para z-index alto */}
        {data && buildLessonContext() && (
          <Portal>
            <Box
              sx={{
                position: 'fixed',
                right: 0,
                bottom: 0,
                zIndex: 1700, // Mayor que navegación sticky (1200) y otros elementos
                pointerEvents: 'none', // Permitir clicks a través del contenedor
                '& > *': {
                  pointerEvents: 'auto', // Restaurar clicks en el widget
                },
              }}
            >
              <TutorAIPopup
                lessonContext={buildLessonContext()}
                context={{
                  moduleId: data?.moduleId || moduleId,
                  lessonId: data?.lessonId || lessonId,
                  pageId: currentPageData?.section?.id || currentPageData?.id,
                  sectionId: currentPageData?.section?.id,
                  moduleTitle: module?.title,
                  lessonTitle: data?.title,
                  pageTitle: currentPageData?.section?.title || currentPageData?.title,
                  sectionTitle: currentPageData?.section?.title,
                }}
                defaultOpen={defaultOpen}
                defaultTab="suggestions"
                isFirstLesson={isFirstLesson}
                isLessonCompleted={wasLessonCompletedOnEntry}
              />
            </Box>
          </Portal>
        )}
      </Box>
    </ThemeProvider>
  );
});

LessonViewer.displayName = 'LessonViewer';

LessonViewer.propTypes = {
  onProgressUpdate: PropTypes.func,
  /**
   * Unique identifier of the lesson to display
   */
  lessonId: PropTypes.string.isRequired,
  
  /**
   * Identifier of the parent module
   */
  moduleId: PropTypes.string.isRequired,
  
  /**
   * Callback function executed when lesson is completed
   * Receives the lesson data object as parameter
   */
  onComplete: PropTypes.func,
  
  /**
   * Callback function executed when navigating to a different lesson
   * Receives (lessonId, moduleId) as parameters
   */
  onNavigate: PropTypes.func,
  
  /**
   * Si es true, el chat del tutor IA se abre automáticamente al montar
   * Útil para demos y pruebas
   */
  defaultOpen: PropTypes.bool,
};

LessonViewer.defaultProps = {
  onComplete: null,
  onNavigate: null,
  defaultOpen: false,
};

export default LessonViewer;

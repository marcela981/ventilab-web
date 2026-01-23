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
} from '@mui/icons-material';
import { ThemeProvider } from '@mui/material/styles';
import { teachingModuleTheme } from '../../../theme/teachingModuleTheme';

import useLesson from '../hooks/useLesson';
import { useLearningProgress } from '../../../contexts/LearningProgressContext';
import useLessonPages from '../hooks/useLessonPages';
import { useProgress } from '@/hooks/useProgress';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import LessonNavigation from './LessonNavigation';
import TutorAIPopup from './ai/TutorAIPopup';
import AITopicExpander from './ai/AITopicExpander';
import { useTopicContext } from '../../../hooks/useTopicContext';
import useScrollCompletion from '../../../hooks/useScrollCompletion';
import CompletionConfetti from '@/components/CompletionConfetti';
// Lazy load clinical case components for code splitting
const ClinicalCaseViewer = lazy(() => import('./clinical/ClinicalCaseViewer'));
import PrerequisiteTooltip from '../../../view-components/teaching/components/curriculum/ModuleCard/PrerequisiteTooltip';
import { getModuleById } from '../../../data/curriculumData';
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
  const { completedLessons, updateLessonProgress, syncStatus } = useLearningProgress();
  
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
  
  const totalLessons = useMemo(() => {
    return module?.lessons?.length || 0;
  }, [module]);
  
  const completedLessonsCount = useMemo(() => {
    if (!module || !module.lessons) return 0;
    return module.lessons.filter(lesson => 
      completedLessons.has(`${moduleId}-${lesson.id}`)
    ).length;
  }, [module, moduleId, completedLessons]);

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

  // Check if the lesson was already completed before entering this session
  // This is used to prevent TutorAI from auto-opening on re-entry
  const wasLessonCompletedOnEntry = useMemo(() => {
    const lessonKey = `${moduleId}-${lessonId}`;
    return completedLessons.has(lessonKey);
  }, [moduleId, lessonId, completedLessons]);

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
  
  // Lesson completion state
  const [lessonCompleted, setLessonCompleted] = useState(false);
  
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
    showResumeAlert,
    dismissResumeAlert,
    saveProgress,
    savePageProgress,
  } = useLessonProgress({
    lessonId,
    moduleId,
    contentRef,
    onComplete: () => {
      setShowConfetti(true);
      setLessonCompleted(true);
      console.log('[LessonViewer] Lesson auto-completed via page tracking');
    },
    autoSaveThreshold: 5, // Guardar cada 5% de progreso (más frecuente)
    autoCompleteThreshold: 90,
  });
  
  // ============================================================================
  // Scroll to top on mount or lesson change
  // ============================================================================
  
  useEffect(() => {
    // Reset state when lesson changes
    setLessonCompleted(false);
    autoCompletionRef.current = false;
    autoCompletionInFlightRef.current = false;
    completionNotifiedRef.current = false;
    tutorFinalSuggestionsDispatchedRef.current = false;

    // Try to restore saved page from localStorage
    try {
      const savedProgress = localStorage.getItem(`lesson_progress_${lessonId}`);
      if (savedProgress) {
        const { currentPage: savedPage, totalPages: savedTotalPages, progress } = JSON.parse(savedProgress);
        // If we have a saved page number, restore it
        if (typeof savedPage === 'number' && savedPage > 0) {
          console.log('[LessonViewer] Restoring saved page:', savedPage + 1);
          setCurrentPage(savedPage);
        } else if (progress > 0) {
          // Fallback: calculate page from progress percentage (will be adjusted when totalPages is known)
          console.log('[LessonViewer] Restoring from progress percentage:', progress);
          // Don't reset to 0, let the progress-based restoration happen below
        } else {
          setCurrentPage(0);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        setCurrentPage(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      console.error('[LessonViewer] Error restoring page:', e);
      setCurrentPage(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Track lesson change
    if (previousLessonIdRef.current !== lessonId) {
      previousLessonIdRef.current = lessonId;
    }
  }, [lessonId]);
  
  // Progress tracking is now handled by useProgress hook (auto-save every 5 min)
  
  // ============================================================================
  // Navigation Handlers
  // ============================================================================
  
  const handleNavigateToLesson = useCallback(async (targetLessonId, targetModuleId) => {
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
  }, [saveProgress, onNavigate]);
  
  // ============================================================================
  // Automatic Completion
  // ============================================================================

  // Trigger auto-completion by saving progress at 100%
  // This will automatically mark the lesson as completed via useLessonProgress hook
  const triggerAutoCompletion = useCallback(async () => {
    if (!data || lessonCompleted || autoCompletionRef.current || autoCompletionInFlightRef.current) {
      return false;
    }

    autoCompletionInFlightRef.current = true;

    try {
      console.log('[LessonViewer] 🎉 Auto-completing lesson by saving at 100%');
      // Save progress at 100% to complete the lesson
      await saveProgress(true); // forceComplete = true

      autoCompletionRef.current = true;
      setLessonCompleted(true);

      // CRITICAL: Notify parent exactly once using completionNotifiedRef guard
      if (!completionNotifiedRef.current && onComplete) {
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
  }, [data, lessonCompleted, saveProgress, onComplete]);

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

    if (percentage >= passingScore) {
      triggerAutoCompletion();
    }
  }, [data, assessmentAnswers, passingScore, triggerAutoCompletion]);
  
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
  
  // Restore page from backend progress when totalPages becomes available
  const hasRestoredFromBackendRef = useRef(false);
  useEffect(() => {
    // Only restore once per lesson, and only if we have progress from backend
    if (hasRestoredFromBackendRef.current || totalPages <= 0 || localProgress <= 0) return;

    // Calculate page from progress percentage
    const calculatedPage = Math.min(
      Math.floor((localProgress / 100) * totalPages),
      totalPages - 1
    );

    // Only restore if calculated page is different from current and greater than 0
    if (calculatedPage > 0 && calculatedPage !== currentPage) {
      console.log('[LessonViewer] Restoring page from backend progress:', {
        progress: localProgress,
        calculatedPage: calculatedPage + 1,
        totalPages,
      });
      setCurrentPage(calculatedPage);
      hasRestoredFromBackendRef.current = true;
    }
  }, [totalPages, localProgress, currentPage, lessonId]);

  // Reset the restoration flag when lesson changes
  useEffect(() => {
    hasRestoredFromBackendRef.current = false;
  }, [lessonId]);

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
  
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // CRITICAL: Save progress when page changes
      console.log('[LessonViewer] Next page clicked, saving progress:', newPage + 1, '/', totalPages);
      savePageProgress(newPage, totalPages);
    }
  }, [currentPage, totalPages, savePageProgress]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Save progress when page changes (even going back)
      console.log('[LessonViewer] Prev page clicked, saving progress:', newPage + 1, '/', totalPages);
      savePageProgress(newPage, totalPages);
    }
  }, [currentPage, totalPages, savePageProgress]);
  
  // Handle completion page display and progress marking
  // IMPORTANT: This effect ONLY marks progress and shows confetti.
  // It does NOT trigger navigation - that's handled by user clicking buttons on CompletionPage.
  useEffect(() => {
    // Find the completion page index
    const completionPageIndex = calculatePages.findIndex(page => page.type === 'completion');

    // When user reaches the completion page, notify parent to update global progress state
    // Use completionNotifiedRef to ensure we only notify once per lesson session
    if (completionPageIndex >= 0 && currentPage === completionPageIndex && data) {
      // Show confetti and mark as completed locally
      if (!lessonCompleted) {
        setShowConfetti(true);
        setLessonCompleted(true);
      }

      // Notify parent to update progress state (but parent should NOT auto-redirect)
      // This is done separately from lessonCompleted to handle the case where
      // progress callback already set lessonCompleted=true before reaching this page
      if (!completionNotifiedRef.current && onComplete) {
        completionNotifiedRef.current = true;
        console.log('[LessonViewer] User reached completion page, notifying parent');
        onComplete(data);
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
    if (isCompleted && !lessonCompleted) {
      setShowConfetti(true);
      setLessonCompleted(true);
      console.log('[LessonViewer] Progress completed, showing confetti (no redirect)');
    }
  }, [currentPage, calculatePages, lessonCompleted, data, isCompleted, moduleId, lessonId, module, currentPageData, assessmentScore, onComplete, completedLessons]);
  
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
            Continuando desde {Math.round(localProgress)}%
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
        
        {/* Global Navigation - Always visible */}
        <LessonNavigation
          currentPage={currentPage}
          totalPages={totalPages}
          data={data}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onNavigateToLesson={handleNavigateToLesson}
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

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

import React, { useState, useEffect, useCallback, useRef, memo, Suspense, lazy } from 'react';
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
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { ThemeProvider } from '@mui/material/styles';
import { teachingModuleTheme } from '../../../theme/teachingModuleTheme';

import useLesson from '../hooks/useLesson';
import { useLearningProgress } from '../../../contexts/LearningProgressContext';
import useLessonPages from '../hooks/useLessonPages';
import LessonNavigation from './LessonNavigation';
import { AITutorChat } from './ai';
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

/**
 * MediaSkeleton - Local skeleton component for media blocks
 */
const MediaSkeleton = ({ variant = 'video' }) => {
  if (variant === 'imageGallery') {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={6} sm={4} md={3} key={i}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
          </Grid>
        ))}
      </Grid>
    );
  }
  
  // Default: video/diagram skeleton (16:9 aspect ratio)
  return (
    <Skeleton
      variant="rectangular"
      sx={{
        width: '100%',
        paddingTop: '56.25%', // 16:9 aspect ratio
        borderRadius: 1,
      }}
    />
  );
};

MediaSkeleton.propTypes = {
  variant: PropTypes.oneOf(['video', 'diagram', 'imageGallery']),
};

/**
 * MediaFallback - Componente unificado para estados vacíos y errores
 * Última red de seguridad cuando un bloque multimedia está malformado
 */
const MediaFallback = memo(({ message, actionUrl, blockIndex, blockType }) => {
  const handleOpenExternal = useCallback(() => {
    if (actionUrl) {
      window.open(actionUrl, '_blank', 'noopener,noreferrer');
    }
  }, [actionUrl]);

  // Emitir warning para debug
  useEffect(() => {
    if (blockIndex !== undefined && blockType) {
      console.warn(
        `[LessonViewer] Fallback activado para bloque multimedia ${blockIndex + 1} (tipo: ${blockType}):`,
        message
      );
    }
  }, [message, blockIndex, blockType]);

  return (
    <Alert
      severity="warning"
      sx={{ my: 2 }}
      action={
        actionUrl ? (
          <Button
            color="inherit"
            size="small"
            onClick={handleOpenExternal}
            startIcon={<OpenInNewIcon />}
          >
            Abrir en nueva pestaña
          </Button>
        ) : null
      }
    >
      {message || 'Contenido no disponible'}
    </Alert>
  );
});

MediaFallback.displayName = 'MediaFallback';

MediaFallback.propTypes = {
  message: PropTypes.string.isRequired,
  actionUrl: PropTypes.string,
  blockIndex: PropTypes.number,
  blockType: PropTypes.string,
};

MediaFallback.defaultProps = {
  actionUrl: null,
  blockIndex: undefined,
  blockType: undefined,
};

/**
 * LessonViewer - Main component for displaying lesson content
 */
const LessonViewer = memo(({ lessonId, moduleId, onComplete, onNavigate, defaultOpen = false }) => {
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
  const { markLessonComplete } = useLearningProgress();
  
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
  
  // ============================================================================
  // Refs
  // ============================================================================
  
  const contentRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  
  // ============================================================================
  // Scroll to top on mount or lesson change
  // ============================================================================
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    startTimeRef.current = Date.now();
    // Reset to first page when lesson changes
    setCurrentPage(0);
    setLessonCompleted(false);
    
    // Cuando cambia la lección, el hook useAITutor creará una nueva sesión automáticamente
    // La sesión anterior se conserva en localStorage según la lógica del hook
    if (previousLessonIdRef.current !== lessonId) {
      previousLessonIdRef.current = lessonId;
    }
  }, [lessonId, moduleId]);
  
  // ============================================================================
  // Navigation Handlers
  // ============================================================================
  
  const handleNavigateToLesson = useCallback((targetLessonId, targetModuleId) => {
    if (onNavigate) {
      onNavigate(targetLessonId, targetModuleId);
    } else {
      // Default navigation - update URL or use window.location
      // This will be handled by the parent component or routing system
      if (typeof window !== 'undefined') {
        window.location.href = `/teaching/lesson/${targetModuleId}/${targetLessonId}`;
      }
    }
  }, [onNavigate]);
  
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
    
    setAssessmentScore({ correct, total, percentage: Math.round((correct / total) * 100) });
    setShowAssessmentResults(true);
  }, [data, assessmentAnswers]);
  
  // ============================================================================
  // Snackbar Handlers
  // ============================================================================
  
  const handleCloseSnackbar = useCallback(() => {
    setSnackbarOpen(false);
  }, []);
  
  // ============================================================================
  // Page Structure and Navigation
  // ============================================================================
  
  // Calculate pages using custom hook
  const calculatePages = useLessonPages(data);
  const totalPages = calculatePages.length;
  const currentPageData = calculatePages[currentPage];
  
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, totalPages]);
  
  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);
  
  // Auto-advance to completion page when reaching the last content page
  useEffect(() => {
    if (currentPage === totalPages - 2 && !lessonCompleted && data) {
      // Si estamos en la penúltima página (antes de completion), marcar como completada
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 60000);
      markLessonComplete(data.lessonId, data.moduleId, timeSpent).then(() => {
        setLessonCompleted(true);
        if (onComplete) {
          onComplete(data);
        }
      });
    }
  }, [currentPage, totalPages, lessonCompleted, data, markLessonComplete, onComplete]);
  
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
            startTime={startTimeRef.current}
          />
        );
      default:
        return null;
    }
  };
  
  // ============================================================================
  // Loading State
  // ============================================================================
  
  if (isLoading) {
    return (
      <ThemeProvider theme={teachingModuleTheme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 1 }} />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
            </Grid>
          </Grid>
        </Container>
      </ThemeProvider>
    );
  }
  
  // ============================================================================
  // Error State
  // ============================================================================
  
  if (error || !data) {
    return (
      <ThemeProvider theme={teachingModuleTheme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={refetch}>
                Reintentar
              </Button>
            }
          >
            {error || 'No se pudo cargar la lección. Por favor, intenta de nuevo.'}
          </Alert>
        </Container>
      </ThemeProvider>
    );
  }
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  return (
    <ThemeProvider theme={teachingModuleTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh' }}>
        <Container
          ref={contentRef}
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
              {renderCurrentPage()}
              
              {/* Media Blocks Section - Rendered after main content */}
              {renderMediaBlocks()}
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
              <AITutorChat 
                lessonContext={buildLessonContext()}
                defaultOpen={defaultOpen}
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

import { useLessonViewerState } from './useLessonViewerState';
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
import { teachingModuleTheme } from '@/theme/teachingModuleTheme';

import useLesson from '@/features/ensenanza/shared/hooks/useLesson';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import useLessonPages from '@/features/ensenanza/shared/hooks/useLessonPages';
import { useProgress } from '@/features/ensenanza/shared/hooks/useProgress';
import { useLessonProgress } from '@/features/ensenanza/shared/hooks/useLessonProgress';
import LessonNavigation from './LessonNavigation';
import LessonIndexNavigator from './LessonIndexNavigator';
import TutorAIPopup from '@/features/ensenanza/shared/components/ai/TutorAIPopup';
import AITopicExpander from '@/features/ensenanza/shared/components/ai/AITopicExpander';
import { useTopicContext } from '@/features/ensenanza/shared/hooks/useTopicContext';
import useScrollCompletion from '@/shared/hooks/useScrollCompletion';
import CompletionConfetti from '@/features/ensenanza/shared/components/leccion/CompletionConfetti';
// Lazy load clinical case components for code splitting
const ClinicalCaseViewer = lazy(() => import('../clinical/ClinicalCaseViewer'));
import PrerequisiteTooltip from '@/features/ensenanza/shared/components/modulos/ModuleCard/PrerequisiteTooltip';
import { getModuleById } from '@/features/ensenanza/shared/data/curriculumData';
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
const LazyVideoPlayer = lazy(() => import('../media/VideoPlayer'));
const LazyImageGallery = lazy(() => import('../media/ImageGallery'));
const LazyInteractiveDiagram = lazy(() => import('../media/InteractiveDiagram'));

// Media utility components (from content folder)
import { MediaSkeleton, MediaFallback } from './content';

// Extracted loading/error state components
import LessonLoadingSkeleton from '@/features/ensenanza/shared/components/leccion/LessonLoadingSkeleton';
import LessonErrorState from '@/features/ensenanza/shared/components/leccion/LessonErrorState';

/**
 * LessonViewer - Main component for displaying lesson content
 */
const LessonViewer = memo(({ lessonId, moduleId, onComplete, onNavigate, defaultOpen = false, onProgressUpdate }) => {
  const state = useLessonViewerState({ lessonId, moduleId, onComplete, onNavigate, onProgressUpdate });
  const {
    data, isLoading, error, refetch, module, moduleCompletion, isModuleCompleted,
    totalLessons, completedLessonsCount, currentLessonIndex, lessonType, isFirstLesson,
    caseAnswers, showCaseAnswers, assessmentAnswers, showAssessmentResults, assessmentScore,
    snackbarOpen, snackbarMessage, completionDialogOpen, currentPage, showConfetti,
    contentRef, isRateLimited, showResumeAlert, backendProgress, localProgress,
    dismissResumeAlert, totalPages, currentPageData, topicContext, totalSteps,
    wasLessonCompletedOnEntry,
    handleNavigateToLesson, triggerAutoCompletion, handleCaseAnswerChange,
    handleShowCaseAnswers, handleAssessmentAnswerChange, handleSubmitAssessment,
    handleNextPage, handlePrevPage, handleNavigateToPage, handleSelectLesson,
    setSnackbarOpen, setCompletionDialogOpen, setShowAssessmentResults,
    setAssessmentAnswers, setShowConfetti, buildLessonContext, setCurrentPage,
    calculatePages
  } = state;

  const handleCloseSnackbar = useCallback(() => setSnackbarOpen(false), [setSnackbarOpen]);

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

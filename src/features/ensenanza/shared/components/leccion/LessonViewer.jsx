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

import LessonPageRenderer from './LessonPageRenderer';
import MediaBlocksContainer from './MediaBlocksContainer';

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

  // ============================================================================
  // Rendering extracted to LessonPageRenderer and MediaBlocksContainer
  // ============================================================================
  
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
                <LessonPageRenderer
                  data={data}
                  currentPageData={currentPageData}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  moduleId={moduleId}
                  lessonId={lessonId}
                  caseAnswers={caseAnswers}
                  showCaseAnswers={showCaseAnswers}
                  handleCaseAnswerChange={handleCaseAnswerChange}
                  handleShowCaseAnswers={handleShowCaseAnswers}
                  assessmentAnswers={assessmentAnswers}
                  showAssessmentResults={showAssessmentResults}
                  assessmentScore={assessmentScore}
                  handleAssessmentAnswerChange={handleAssessmentAnswerChange}
                  handleSubmitAssessment={handleSubmitAssessment}
                  setShowAssessmentResults={setShowAssessmentResults}
                  setAssessmentAnswers={setAssessmentAnswers}
                  handleNavigateToLesson={handleNavigateToLesson}
                  moduleCompletion={moduleCompletion}
                  triggerAutoCompletion={triggerAutoCompletion}
                  calculatePages={calculatePages}
                  setCurrentPage={setCurrentPage}
                  completedLessonsCount={completedLessonsCount}
                  totalLessons={totalLessons}
                />
                
                {/* Media Blocks Section - Rendered after main content */}
                <MediaBlocksContainer media={data?.media} />
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
                  handleNavigateToLesson(data.navigation.nextLesson.id, data.navigation.nextLesson.moduleId || data.moduleId);
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

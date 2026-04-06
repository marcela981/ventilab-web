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
import { useEditMode } from '@/features/ensenanza/shared/components/edit/EditModeContext';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import useLessonPages from '@/features/ensenanza/shared/hooks/useLessonPages';
import { useProgress } from '@/features/ensenanza/shared/hooks/useProgress';
import { useLessonProgress } from '@/features/ensenanza/shared/hooks/useLessonProgress';
import LessonNavigation from './LessonNavigation';
import LessonIndexNavigator from './LessonIndexNavigator';
import TutorAIPopup from '@/features/ensenanza/shared/components/ai/TutorAIPopup';
import BlockInjector from '@/features/ensenanza/shared/components/edit/BlockInjector/BlockInjector';
import LessonEditBanner from '@/features/ensenanza/shared/components/edit/LessonEditBanner/LessonEditBanner';
import EditableSectionWrapper from '@/features/ensenanza/shared/components/edit/EditableSectionWrapper/EditableSectionWrapper';
import UnsavedChangesAlert from '@/features/ensenanza/shared/components/edit/UnsavedChangesAlert/UnsavedChangesAlert';
import SaveProgressButton from './SaveProgressButton/SaveProgressButton';
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

/* ─── Utilidad: convierte datos de una página a HTML inicial para el editor ── */
function getPageInitialHtml(pageData, data) {
  if (!pageData || !data) return '';
  const t = pageData.type;
  const LABELS = {
    'header-intro': 'Introducción', 'theory': 'Teoría', 'analogies': 'Analogías',
    'visual-elements': 'Elementos Visuales', 'waveforms': 'Curvas',
    'parameter-tables': 'Parámetros', 'practical-case': 'Caso Práctico',
    'key-points': 'Puntos Clave', 'assessment': 'Evaluación',
    'references': 'Referencias', 'completion': 'Completado',
    'clinical-case': 'Caso Clínico',
  };

  if (t === 'header-intro') {
    const intro = data.content?.introduction;
    return [
      `<h1>${data.title || 'Lección'}</h1>`,
      intro?.overview ? `<p>${intro.overview}</p>` : data.description ? `<p>${data.description}</p>` : '',
      intro?.objectives?.length
        ? `<h2>Objetivos</h2><ul>${intro.objectives.map(o => `<li>${o}</li>`).join('')}</ul>`
        : '',
    ].join('');
  }

  if (t === 'theory' && pageData.section) {
    const s = pageData.section;
    let html = `<h2>${s.title || ''}</h2>`;
    const processContent = (c) => {
      if (!c) return '';
      if (typeof c === 'string') return `<p>${c}</p>`;
      if (Array.isArray(c)) {
        return c.map(block => {
          if (typeof block === 'string') return `<p>${block}</p>`;
          if (block.type === 'list') return `<ul>${(block.items || []).map(i => `<li>${i}</li>`).join('')}</ul>`;
          return `<p>${block.text || block.content || ''}</p>`;
        }).join('');
      }
      return '';
    };
    html += processContent(s.content);
    (s.subsections || []).forEach(sub => {
      html += `<h3>${sub.title || ''}</h3>${processContent(sub.content || sub.text)}`;
    });
    return html;
  }

  if (t === 'key-points') {
    const kp = data.content?.keyPoints;
    if (!kp?.length) return '<h2>Puntos Clave</h2>';
    return `<h2>Puntos Clave</h2><ul>${kp.map(k =>
      `<li><strong>${k.title || k}</strong>${k.description ? ': ' + k.description : ''}</li>`
    ).join('')}</ul>`;
  }

  if (t === 'references') {
    const refs = data.content?.references || data.resources?.references;
    if (!refs?.length) return '<h2>Referencias</h2>';
    return `<h2>Referencias</h2><ol>${refs.map(r =>
      `<li>${r.authors ? `<strong>${r.authors}</strong>. ` : ''}${r.title || r}${r.year ? ` (${r.year})` : ''}.</li>`
    ).join('')}</ol>`;
  }

  if (t === 'analogies') {
    const analogies = data.content?.theory?.analogies || [];
    if (!analogies.length) return '<h2>Analogías</h2>';
    return `<h2>Analogías</h2>${analogies.map(a =>
      `<h3>${a.title || ''}</h3><blockquote>${a.description || a.content || ''}</blockquote>`
    ).join('')}`;
  }

  return `<h2>${LABELS[t] ?? t ?? 'Sección'}</h2><p>Contenido de esta sección.</p>`;
}

/**
 * LessonViewer - Main component for displaying lesson content
 */
const LessonViewer = memo(({ lessonId, moduleId, onComplete, onNavigate, defaultOpen = false, onProgressUpdate }) => {
  // Scroll continuo SOLO cuando el profesor activa "Modo Edición" — en modo normal ve el mismo stepper que el alumno
  const { isEditMode } = useEditMode();
  const isScrollMode = isEditMode;

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

  // ── Estado local de secciones para reordenamiento optimista en scroll mode ──
  const [localPages, setLocalPages] = useState([]);
  useEffect(() => {
    if (calculatePages?.length) setLocalPages(calculatePages);
  }, [calculatePages]);

  const handleMoveSection = useCallback((fromIdx, toIdx) => {
    setLocalPages(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIdx, 1);
      result.splice(toIdx, 0, removed);
      return result;
    });
    // TODO Fase 3: PATCH /api/lessons/{lessonId}/sections/reorder
    console.log('[EditableSectionWrapper] move section:', { from: fromIdx, to: toIdx });
  }, []);

  const handleDeleteSection = useCallback((idx) => {
    setLocalPages(prev => prev.filter((_, i) => i !== idx));
    // TODO Fase 3: DELETE /api/lessons/{lessonId}/sections/{idx}
    console.log('[EditableSectionWrapper] delete section at index:', idx);
  }, []);

  const handleAddSection = useCallback(() => {
    // Scroll al último BlockInjector visible
    const injectors = document.querySelectorAll('[data-block-injector]');
    if (injectors.length) {
      injectors[injectors.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleLessonTitleChange = useCallback((newTitle) => {
    // TODO Fase 3: PATCH /api/lessons/{lessonId} { title: newTitle }
    console.log('[LessonEditBanner] lesson title updated:', newTitle);
  }, []);

  // ── Dirty state: rastrear cambios sin guardar en el editor ──
  const [dirtyMap, setDirtyMap] = useState({});     // { [sectionIdx]: htmlContent }
  const [unsavedAlertOpen, setUnsavedAlertOpen] = useState(false);
  const pendingNavRef = useRef(null);                // navegación pendiente mientras hay cambios
  const hasDirtyChanges = Object.keys(dirtyMap).length > 0;

  const handleSectionContentChange = useCallback((html, idx) => {
    setDirtyMap(prev => ({ ...prev, [idx]: html }));
  }, []);

  // Interceptar navegación si hay cambios pendientes
  const guardedNavigate = useCallback((navigateFn) => {
    if (hasDirtyChanges) {
      pendingNavRef.current = navigateFn;
      setUnsavedAlertOpen(true);
    } else {
      navigateFn();
    }
  }, [hasDirtyChanges]);

  // Guardar todos los cambios (console.log TODO hasta Fase 3)
  const saveAllChanges = useCallback(() => {
    Object.entries(dirtyMap).forEach(([idx, html]) => {
      console.log('[LessonViewer] save section content:', { sectionIndex: idx, html });
      // TODO Fase 3: PATCH /api/lessons/{lessonId}/sections/{idx} { content: html }
    });
    setDirtyMap({});
  }, [dirtyMap]);

  // Alert: guardar y continuar
  const handleAlertSave = useCallback(() => {
    saveAllChanges();
    setUnsavedAlertOpen(false);
    pendingNavRef.current?.();
    pendingNavRef.current = null;
  }, [saveAllChanges]);

  // Alert: descartar y continuar
  const handleAlertDiscard = useCallback(() => {
    setDirtyMap({});
    setUnsavedAlertOpen(false);
    pendingNavRef.current?.();
    pendingNavRef.current = null;
  }, []);

  // Alert: cancelar (volver a editar)
  const handleAlertCancel = useCallback(() => {
    setUnsavedAlertOpen(false);
    pendingNavRef.current = null;
  }, []);

  // Advertencia del navegador al intentar cerrar pestaña
  useEffect(() => {
    if (!hasDirtyChanges) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasDirtyChanges]);

  // Páginas a renderizar en scroll mode: usar estado local (permite reorden optimista)
  const scrollPages = isScrollMode
    ? (localPages.length ? localPages : (calculatePages ?? []))
    : [];

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
        {/* ─ Alerta de cambios sin guardar en modo edición ─ */}
        <UnsavedChangesAlert
          open={unsavedAlertOpen}
          onSave={handleAlertSave}
          onDiscard={handleAlertDiscard}
          onCancel={handleAlertCancel}
        />

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
                {isScrollMode && scrollPages.length > 0 ? (
                  /* ── Modo Scroll Continuo (TEACHER / ADMIN) ─────────────────
                     Todas las páginas apiladas verticalmente; sin Anterior/Siguiente.
                     LessonEditBanner sticky + EditableSectionWrapper por sección
                     + BlockInjector entre cada bloque. */
                  <>
                    {/* Barra de edición sticky con título editable */}
                    <LessonEditBanner
                      lessonTitle={data?.title}
                      lessonType={data?.type ?? lessonType}
                      totalSections={scrollPages.length}
                      onTitleChange={handleLessonTitleChange}
                      onAddSection={handleAddSection}
                    />

                    {scrollPages.map((pageData, idx) => (
                      <React.Fragment key={`${pageData.type ?? 'page'}-${idx}`}>
                        {/* Wrapper con overlay de controles por sección */}
                        <EditableSectionWrapper
                          pageType={pageData.type}
                          sectionIndex={idx}
                          totalSections={scrollPages.length}
                          initialContent={getPageInitialHtml(pageData, data)}
                          onContentChange={handleSectionContentChange}
                          onMoveUp={idx > 0 ? () => handleMoveSection(idx, idx - 1) : undefined}
                          onMoveDown={idx < scrollPages.length - 1 ? () => handleMoveSection(idx, idx + 1) : undefined}
                          onDelete={() => handleDeleteSection(idx)}
                        >
                          <Box
                            sx={{
                              pb: 4,
                              ...(idx < scrollPages.length - 1 && {
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                              }),
                            }}
                          >
                            <LessonPageRenderer
                              data={data}
                              currentPageData={pageData}
                              currentPage={idx}
                              totalPages={scrollPages.length}
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
                              calculatePages={scrollPages}
                              setCurrentPage={setCurrentPage}
                              completedLessonsCount={completedLessonsCount}
                              totalLessons={totalLessons}
                            />
                          </Box>
                        </EditableSectionWrapper>

                        {/* BlockInjector: separador + entre secciones */}
                        <div data-block-injector="true">
                          <BlockInjector afterPageIndex={idx} />
                        </div>
                      </React.Fragment>
                    ))}
                  </>
                ) : (
                  /* ── Modo Paginado (STUDENT) ─────────────────────────────── */
                  <>
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
                    {/* SaveProgressButton: al pie del contenido interactivo del estudiante */}
                    {currentPageData && ['assessment', 'practical-case', 'clinical-case'].includes(currentPageData.type) && (
                      <SaveProgressButton
                        onSave={triggerAutoCompletion}
                        isAlreadySaved={wasLessonCompletedOnEntry}
                      />
                    )}
                  </>
                )}
                
                {/* Media Blocks Section - Rendered after main content */}
                <MediaBlocksContainer media={data?.media} />
              </article>
        </Container>
        
        {/* Lesson Index Navigator - Hidden in scroll mode */}
        {!isScrollMode && isModuleCompleted && (
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

        {/* Global Navigation - Hidden in scroll mode (teachers scroll, students paginate) */}
        {!isScrollMode && (
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
        )}
        
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

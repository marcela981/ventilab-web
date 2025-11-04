import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
  Box,
  Button,
  LinearProgress,
  Fab,
  Drawer,
  Skeleton,
  Alert,
  Snackbar,
  Fade,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  LessonHeader,
  SectionNavigation,
  MarkdownRenderer,
  ZoomableImage,
  VideoPlayer,
  InteractiveQuiz,
  PersonalNotes,
} from './content';

/**
 * Hook personalizado mock para cargar datos de lección
 * En producción, este hook debería hacer fetch a la API
 * 
 * @param {string} lessonId - ID de la lección
 * @param {string} moduleId - ID del módulo
 * @returns {Object} - Datos de la lección y estados
 */
const useLesson = (lessonId, moduleId) => {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLesson = async () => {
      try {
        setLoading(true);
        // Simulación de carga desde API
        // En producción: const response = await api.get(`/lessons/${lessonId}`);
        
        // Datos mock
        const mockLesson = {
          id: lessonId,
          moduleId,
          title: 'Fundamentos de Ventilación Mecánica',
          description: 'Aprende los conceptos básicos de la ventilación mecánica',
          estimatedTime: 45,
          difficulty: 'beginner',
          level: 'Nivel 1',
          moduleTitle: 'Introducción a Ventilación',
          learningObjectives: [
            'Comprender los principios básicos',
            'Identificar componentes clave',
            'Aplicar conocimientos en práctica',
          ],
          sections: [
            {
              id: 's1',
              title: 'Introducción',
              type: 'text',
              content: '# Introducción\n\nLa ventilación mecánica es...',
            },
            {
              id: 's2',
              title: 'Video Explicativo',
              type: 'video',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            },
            {
              id: 's3',
              title: 'Conceptos Clave',
              type: 'text',
              content: '# Conceptos Clave\n\n## PEEP\n\nLa PEEP es...',
            },
            {
              id: 's4',
              title: 'Evaluación',
              type: 'quiz',
              quiz: {
                question: '¿Cuál es el rango normal de PEEP?',
                options: ['0-2 cmH₂O', '5-10 cmH₂O', '15-20 cmH₂O'],
                correctAnswer: '5-10 cmH₂O',
                explanation: 'El rango normal es 5-10 cmH₂O...',
                type: 'single-choice',
              },
            },
          ],
        };

        setTimeout(() => {
          setLesson(mockLesson);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadLesson();
  }, [lessonId, moduleId]);

  return { lesson, loading, error };
};

/**
 * Hook personalizado mock para gestionar progreso
 * 
 * @param {string} lessonId - ID de la lección
 * @returns {Object} - Funciones y estados de progreso
 */
const useLessonProgress = (lessonId) => {
  const [completedSections, setCompletedSections] = useState(new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  const markSectionComplete = useCallback((sectionIndex) => {
    setCompletedSections((prev) => new Set([...prev, sectionIndex]));
  }, []);

  const markComplete = useCallback(async () => {
    try {
      // En producción: await api.post(`/lessons/${lessonId}/complete`);
      setIsCompleted(true);
      return true;
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      return false;
    }
  }, [lessonId]);

  return {
    completedSections,
    isCompleted,
    markSectionComplete,
    markComplete,
  };
};

/**
 * LessonViewer - Componente principal para visualización de lecciones completas.
 * 
 * Orquesta todos los componentes de contenido educativo (MarkdownRenderer, VideoPlayer,
 * InteractiveQuiz, etc.) en un layout profesional con navegación lateral, progreso,
 * y funcionalidades completas de aprendizaje.
 * 
 * @component
 * @example
 * ```jsx
 * <LessonViewer
 *   lessonId="lesson-123"
 *   moduleId="module-456"
 * />
 * ```
 * 
 * @example
 * ```jsx
 * // Con callbacks
 * <LessonViewer
 *   lessonId="lesson-123"
 *   moduleId="module-456"
 *   onComplete={() => router.push('/dashboard')}
 *   onSectionChange={(index) => trackProgress(index)}
 * />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.lessonId - ID de la lección a mostrar
 * @param {string} props.moduleId - ID del módulo al que pertenece
 * @param {Function} [props.onComplete] - Callback al completar la lección
 * @param {Function} [props.onSectionChange] - Callback al cambiar de sección
 */
const LessonViewer = memo(({ lessonId, moduleId, onComplete, onSectionChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Hooks personalizados
  const { lesson, loading, error } = useLesson(lessonId, moduleId);
  const { completedSections, isCompleted, markSectionComplete, markComplete } = 
    useLessonProgress(lessonId);

  // Estados
  const [currentSection, setCurrentSection] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Referencias
  const sectionRefs = useRef([]);
  const contentRef = useRef(null);

  /**
   * Renderiza una sección según su tipo
   * @param {Object} section - Objeto de sección
   * @param {number} index - Índice de la sección
   * @returns {JSX.Element} - Componente renderizado
   */
  const renderSection = useCallback((section, index) => {
    const commonProps = {
      key: section.id,
      'data-section-index': index,
    };

    switch (section.type) {
      case 'text':
      case 'article':
        return (
          <MarkdownRenderer
            {...commonProps}
            content={section.content || ''}
          />
        );

      case 'video':
        return (
          <VideoPlayer
            {...commonProps}
            url={section.videoUrl}
            title={section.title}
            onProgress={(state) => {
              if (state.played > 0.9) {
                markSectionComplete(index);
              }
            }}
          />
        );

      case 'image':
        return (
          <ZoomableImage
            {...commonProps}
            src={section.imageUrl}
            alt={section.title}
            caption={section.caption}
          />
        );

      case 'quiz':
        return (
          <InteractiveQuiz
            {...commonProps}
            quiz={section.quiz}
            onComplete={() => {
              markSectionComplete(index);
              showSnackbar('¡Quiz completado con éxito!');
            }}
          />
        );

      case 'diagram':
        // Placeholder para diagrama interactivo
        return (
          <Paper {...commonProps} elevation={2} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Diagrama Interactivo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {section.title}
            </Typography>
          </Paper>
        );

      default:
        return (
          <Alert severity="warning" {...commonProps}>
            Tipo de sección no soportado: {section.type}
          </Alert>
        );
    }
  }, [markSectionComplete]);

  /**
   * Navega a una sección específica
   * @param {number} index - Índice de la sección
   */
  const goToSection = useCallback((index) => {
    if (!lesson || index < 0 || index >= lesson.sections.length) return;

    setCurrentSection(index);
    
    // Scroll suave al inicio del contenido
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Callback externo
    if (onSectionChange && typeof onSectionChange === 'function') {
      onSectionChange(index);
    }
  }, [lesson, onSectionChange]);

  /**
   * Navega a la sección anterior
   */
  const handlePrevious = useCallback(() => {
    if (currentSection > 0) {
      goToSection(currentSection - 1);
    }
  }, [currentSection, goToSection]);

  /**
   * Navega a la siguiente sección
   */
  const handleNext = useCallback(() => {
    if (lesson && currentSection < lesson.sections.length - 1) {
      goToSection(currentSection + 1);
    }
  }, [currentSection, lesson, goToSection]);

  /**
   * Marca la lección como completada
   */
  const handleComplete = useCallback(async () => {
    const success = await markComplete();
    
    if (success) {
      showSnackbar('¡Felicitaciones! Has completado la lección.');
      
      if (onComplete && typeof onComplete === 'function') {
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } else {
      showSnackbar('Error al marcar como completada. Intenta de nuevo.');
    }
  }, [markComplete, onComplete]);

  /**
   * Muestra el snackbar con un mensaje
   * @param {string} message - Mensaje a mostrar
   */
  const showSnackbar = useCallback((message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  }, []);

  /**
   * Cierra el snackbar
   */
  const handleCloseSnackbar = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  /**
   * Toggle del drawer de navegación en móvil
   */
  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => !prev);
  }, []);

  /**
   * Navegación con teclado
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Evitar navegación si hay un input/textarea enfocado
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext]);

  // Estado de carga
  if (loading) {
    return (
      <Box sx={{ py: 4, px: { xs: 2, sm: 2, md: 3, lg: 2 } }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 1 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={9}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Estado de error
  if (error || !lesson) {
    return (
      <Box sx={{ py: 4, px: { xs: 2, sm: 2, md: 3, lg: 2 } }}>
        <Alert severity="error">
          {error || 'No se pudo cargar la lección. Por favor, intenta de nuevo.'}
        </Alert>
      </Box>
    );
  }

  const progress = ((currentSection + 1) / lesson.sections.length) * 100;
  const isFirstSection = currentSection === 0;
  const isLastSection = currentSection === lesson.sections.length - 1;

  // Preparar secciones con estado de completado
  const sectionsWithStatus = lesson.sections.map((section, index) => ({
    ...section,
    completed: completedSections.has(index),
  }));

  return (
    <Box sx={{ py: 4, px: { xs: 2, sm: 2, md: 3, lg: 2 } }}>
      {/* Header de la lección */}
      <LessonHeader
        lesson={lesson}
        onHomeClick={() => window.history.back()}
        onModuleClick={() => window.history.back()}
      />

      {/* Barra de progreso */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#e8f4fd' }}>
            Progreso de la lección
          </Typography>
          <Typography variant="body2" sx={{ color: '#e8f4fd' }} fontWeight={600}>
            {Math.round(progress)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#e8f4fd',
            }
          }}
        />
      </Box>

      {/* Layout principal reorganizado */}
      <Grid container spacing={{ xs: 2, lg: 3 }}>
        {/* Columna izquierda: Navegación de contenido (desktop) */}
        <Grid item xs={12} lg={2.5} sx={{ display: { xs: 'none', lg: 'block' } }}>
          <SectionNavigation
            sections={sectionsWithStatus}
            currentSection={currentSection}
            onSectionClick={goToSection}
          />
        </Grid>

        {/* Columna centro-derecha: Contenido principal de la lección - ocupa el resto */}
        <Grid item xs={12} lg={9.5}>
          <Box ref={contentRef}>
            {/* Contenedor del contenido con mejor organización */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 4 },
                backgroundColor: '#A0DBE9', // Azul claro para legibilidad
                border: '1px solid rgba(160, 219, 233, 0.5)',
                borderRadius: 2,
                mb: 3,
              }}
            >
              {/* Indicador de sección actual */}
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: '#1a1a1a',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    opacity: 0.7,
                  }}
                >
                  Sección {currentSection + 1} de {lesson.sections.length}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#1a1a1a',
                    fontWeight: 600,
                    mt: 0.5,
                  }}
                >
                  {lesson.sections[currentSection]?.title || 'Contenido'}
                </Typography>
              </Box>

              {/* Sección actual con transición */}
              <Fade in key={currentSection} timeout={300}>
                <Box>
                  {renderSection(lesson.sections[currentSection], currentSection)}
                </Box>
              </Fade>
            </Paper>

            {/* Botones de navegación mejorados */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                display: 'flex', 
                gap: 2, 
                flexWrap: 'wrap',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'none',
                borderRadius: 2,
                mb: 3,
              }}
            >
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handlePrevious}
                disabled={isFirstSection}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#e8f4fd',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                  '&.Mui-disabled': {
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.3)',
                  }
                }}
              >
                Anterior
              </Button>

              <Box sx={{ flex: 1 }} />

              {!isLastSection ? (
                <Button
                  endIcon={<ArrowForwardIcon />}
                  onClick={handleNext}
                  variant="contained"
                  sx={{
                    backgroundColor: '#e8f4fd',
                    color: '#1a1a1a',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: '#ffffff',
                    }
                  }}
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  startIcon={<CheckCircleIcon />}
                  onClick={handleComplete}
                  variant="contained"
                  disabled={isCompleted}
                  sx={{
                    backgroundColor: isCompleted ? 'rgba(255, 255, 255, 0.1)' : '#e8f4fd',
                    color: isCompleted ? '#9e9e9e' : '#1a1a1a',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: isCompleted ? 'rgba(255, 255, 255, 0.1)' : '#ffffff',
                    }
                  }}
                >
                  {isCompleted ? 'Lección Completada' : 'Marcar como Completado'}
                </Button>
              )}
            </Paper>

            {/* Notas personales - abajo del contenido con fondo azul oscuro */}
            <Box 
              sx={{ 
                mt: 3,
                p: 3,
                backgroundColor: 'rgba(33, 150, 243, 0.15)', // Azul más oscuro
                border: '1px solid rgba(33, 150, 243, 0.3)',
                borderRadius: 2,
              }}
            >
              <PersonalNotes
                lessonId={lessonId}
                moduleId={moduleId}
                onNoteAdded={(note) => showSnackbar('Nota agregada')}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* FAB para abrir navegación en móvil */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="abrir navegación"
          onClick={toggleSidebar}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: theme.zIndex.speedDial,
          }}
        >
          <MenuIcon />
        </Fab>
      )}

      {/* Drawer para móvil */}
      <Drawer
        anchor="right"
        open={showSidebar}
        onClose={toggleSidebar}
        sx={{
          '& .MuiDrawer-paper': {
            width: '85%',
            maxWidth: 360,
            p: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button startIcon={<CloseIcon />} onClick={toggleSidebar}>
            Cerrar
          </Button>
        </Box>

        <SectionNavigation
          sections={sectionsWithStatus}
          currentSection={currentSection}
          onSectionClick={(index) => {
            goToSection(index);
            toggleSidebar();
          }}
        />
      </Drawer>

      {/* Snackbar de notificaciones */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
});

LessonViewer.displayName = 'LessonViewer';

LessonViewer.propTypes = {
  /**
   * ID de la lección a visualizar
   */
  lessonId: PropTypes.string.isRequired,

  /**
   * ID del módulo al que pertenece la lección
   */
  moduleId: PropTypes.string.isRequired,

  /**
   * Callback opcional ejecutado cuando se completa la lección
   */
  onComplete: PropTypes.func,

  /**
   * Callback opcional ejecutado cuando cambia de sección.
   * Recibe el índice de la nueva sección.
   */
  onSectionChange: PropTypes.func,
};

LessonViewer.defaultProps = {
  onComplete: null,
  onSectionChange: null,
};

export default LessonViewer;


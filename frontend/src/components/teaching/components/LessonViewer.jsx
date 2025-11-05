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

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import {
  Container,
  Grid,
  Box,
  Button,
  LinearProgress,
  Fab,
  Skeleton,
  Alert,
  Snackbar,
  Typography,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Lightbulb as LightbulbIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  ExpandMore as ExpandMoreIcon,
  Image as ImageIcon,
  Timeline as TimelineIcon,
  PlayCircle as PlayCircleIcon,
  Description as DescriptionIcon,
  School as SchoolIcon,
  Book as BookIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

import { MarkdownRenderer } from './content';
import useLesson from '../hooks/useLesson';
import { useLearningProgress } from '../../../contexts/LearningProgressContext';

/**
 * LessonViewer - Main component for displaying lesson content
 */
const LessonViewer = memo(({ lessonId, moduleId, onComplete, onNavigate }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
  const { markLessonComplete, completedLessons } = useLearningProgress();
  
  // ============================================================================
  // State Management
  // ============================================================================
  
  // Reading progress state
  const [readingProgress, setReadingProgress] = useState(0);
  
  // Practical cases - user answers
  const [caseAnswers, setCaseAnswers] = useState({});
  const [expandedCases, setExpandedCases] = useState({});
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
  }, [lessonId, moduleId]);
  
  // ============================================================================
  // Reading Progress Calculation
  // ============================================================================
  
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      const progress = Math.min(
        ((scrollTop + windowHeight) / documentHeight) * 100,
        100
      );
      
      setReadingProgress(progress);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // ============================================================================
  // Check if lesson is already completed
  // ============================================================================
  
  const isLessonCompleted = useCallback(() => {
    if (!data || !completedLessons) return false;
    return completedLessons.has(data.lessonId) || completedLessons.has(lessonId);
  }, [data, lessonId, completedLessons]);
  
  // ============================================================================
  // Handle Lesson Completion
  // ============================================================================
  
  const handleMarkAsComplete = useCallback(async () => {
    if (!data) return;
    
    try {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 60000); // minutes
      
      const result = await markLessonComplete(data.lessonId, data.moduleId, timeSpent);
      
      if (result) {
        setSnackbarMessage('¡Lección completada exitosamente!');
        setSnackbarOpen(true);
        setCompletionDialogOpen(true);
        
        // Call onComplete callback with full lesson data
        if (onComplete) {
          onComplete(data);
        }
      } else {
        setSnackbarMessage('Error al marcar la lección como completada');
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error('Error completing lesson:', err);
      setSnackbarMessage('Error al marcar la lección como completada');
      setSnackbarOpen(true);
    }
  }, [data, markLessonComplete, onComplete]);
  
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
  
  const handleToggleCaseExpansion = useCallback((caseId) => {
    setExpandedCases(prev => ({
      ...prev,
      [caseId]: !prev[caseId],
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
  // Render Functions
  // ============================================================================
  
  /**
   * Render lesson header with metadata
   */
  const renderHeader = () => {
    if (!data) return null;
    
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          {data.title}
        </Typography>
        
        {data.moduleInfo && (
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {data.moduleInfo.title}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          {data.moduleInfo?.level && (
            <Chip
              label={data.moduleInfo.level}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {data.moduleInfo?.difficulty && (
            <Chip
              label={data.moduleInfo.difficulty}
              size="small"
              color="secondary"
              variant="outlined"
            />
          )}
          {data.moduleInfo?.bloomLevel && (
            <Chip
              label={`Bloom: ${data.moduleInfo.bloomLevel}`}
              size="small"
              color="default"
              variant="outlined"
            />
          )}
          {data.moduleInfo?.estimatedTime && (
            <Chip
              icon={<SchoolIcon />}
              label={data.moduleInfo.estimatedTime}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Box>
    );
  };
  
  /**
   * Render introduction section with objectives
   */
  const renderIntroduction = () => {
    if (!data?.content?.introduction) return null;
    
    const { introduction } = data.content;
    
    return (
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Introducción
        </Typography>
        
        {introduction.text && (
          <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
            {introduction.text}
          </Typography>
        )}
        
        {introduction.objectives && introduction.objectives.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Objetivos de Aprendizaje
            </Typography>
            <List>
              {introduction.objectives.map((objective, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${index + 1}. ${objective}`}
                    primaryTypographyProps={{
                      variant: 'body1',
                      sx: { lineHeight: 1.7 },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>
    );
  };
  
  /**
   * Render theory section with subsections, examples, and analogies
   */
  const renderTheory = () => {
    if (!data?.content?.theory) return null;
    
    const { theory } = data.content;
    
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Contenido Teórico
        </Typography>
        
        {theory.sections && theory.sections.map((section, index) => (
          <Box key={index} sx={{ mb: 4 }}>
            {section.title && (
              <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
                {section.title}
              </Typography>
            )}
            
            {section.content && (
              <Box sx={{ maxWidth: '800px', lineHeight: 1.8 }}>
                <MarkdownRenderer content={section.content} />
              </Box>
            )}
            
            {/* Examples associated with this section */}
            {theory.examples && theory.examples.length > 0 && index < theory.examples.length && (
              <Paper
                elevation={1}
                sx={{
                  p: { xs: 2, md: 3 },
                  mt: 3,
                  backgroundColor: 'primary.light',
                  backgroundColor: 'rgba(33, 150, 243, 0.08)',
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Ejemplo Clínico
                </Typography>
                <Typography variant="body1" paragraph>
                  {theory.examples[index].description}
                </Typography>
                {theory.examples[index].clinicalRelevance && (
                  <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Relevancia Clínica:
                    </Typography>
                    <Typography variant="body2">
                      {theory.examples[index].clinicalRelevance}
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        ))}
        
        {/* Analogies */}
        {theory.analogies && theory.analogies.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Analogías para Facilitar la Comprensión
            </Typography>
            {theory.analogies.map((analogy, index) => (
              <Paper
                key={index}
                elevation={1}
                sx={{
                  p: { xs: 2, md: 3 },
                  mb: 2,
                  backgroundColor: 'rgba(255, 193, 7, 0.08)',
                  borderLeft: '4px solid',
                  borderColor: 'warning.main',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                  <LightbulbIcon sx={{ color: 'warning.main', mr: 2, mt: 0.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      {analogy.concept}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                      "{analogy.analogy}"
                    </Typography>
                    <Typography variant="body1">
                      {analogy.explanation}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    );
  };
  
  /**
   * Render visual elements as placeholders
   */
  const renderVisualElements = () => {
    if (!data?.content?.visualElements || data.content.visualElements.length === 0) return null;
    
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Elementos Visuales
        </Typography>
        
        {data.content.visualElements.map((element, index) => {
          const getIcon = () => {
            switch (element.type?.toLowerCase()) {
              case 'imagen':
              case 'image':
                return <ImageIcon />;
              case 'animación':
              case 'animation':
              case 'video':
                return <PlayCircleIcon />;
              case 'gráfico':
              case 'graph':
              case 'diagram':
                return <TimelineIcon />;
              default:
                return <DescriptionIcon />;
            }
          };
          
          return (
            <Paper
              key={index}
              elevation={1}
              sx={{
                p: { xs: 2, md: 3 },
                mb: 2,
                border: '2px dashed',
                borderColor: 'divider',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getIcon()}
                <Typography variant="h6" sx={{ ml: 2, fontWeight: 600 }}>
                  {element.title || `Elemento Visual ${index + 1}`}
                </Typography>
                <Chip
                  label={element.type || 'Visual'}
                  size="small"
                  sx={{ ml: 'auto' }}
                />
              </Box>
              
              {element.description && (
                <Typography variant="body2" color="text.secondary" paragraph>
                  {element.description}
                </Typography>
              )}
              
              {element.objective && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Objetivo:</strong> {element.objective}
                  </Typography>
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>
    );
  };
  
  /**
   * Render practical cases with interactive questions
   */
  const renderPracticalCases = () => {
    if (!data?.content?.practicalCases || data.content.practicalCases.length === 0) return null;
    
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Casos Prácticos
        </Typography>
        
        {data.content.practicalCases.map((practicalCase, caseIndex) => {
          const caseId = practicalCase.caseId || `case-${caseIndex}`;
          const isExpanded = expandedCases[caseId];
          const showAnswers = showCaseAnswers[caseId];
          
          return (
            <Accordion
              key={caseIndex}
              expanded={isExpanded}
              onChange={() => handleToggleCaseExpansion(caseId)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {practicalCase.title || `Caso Clínico ${caseIndex + 1}`}
                </Typography>
              </AccordionSummary>
              
              <AccordionDetails>
                {practicalCase.patientData && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Datos del Paciente:
                    </Typography>
                    <Box component="dl" sx={{ pl: 2 }}>
                      {Object.entries(practicalCase.patientData).map(([key, value]) => (
                        <Box key={key} sx={{ display: 'flex', mb: 1 }}>
                          <Typography component="dt" variant="body2" sx={{ fontWeight: 600, mr: 2, minWidth: 120 }}>
                            {key}:
                          </Typography>
                          <Typography component="dd" variant="body2">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
                
                {(practicalCase.clinicalScenario || practicalCase.caso) && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Escenario Clínico:
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                      {practicalCase.clinicalScenario || practicalCase.caso || practicalCase.escenario}
                    </Typography>
                  </Box>
                )}
                
                {practicalCase.questions && practicalCase.questions.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      Preguntas:
                    </Typography>
                    {practicalCase.questions.map((question, qIndex) => {
                      const answerKey = `${caseId}-${qIndex}`;
                      const userAnswer = caseAnswers[answerKey] || '';
                      
                      // Handle both string questions and object questions
                      const questionText = typeof question === 'string' 
                        ? question 
                        : (question.questionText || question.texto || '');
                      
                      const expectedAnswer = typeof question === 'object' 
                        ? (question.expectedAnswer || question.respuestaEsperada || '')
                        : '';
                      
                      const explanation = typeof question === 'object' 
                        ? (question.explanation || question.explicacion || '')
                        : '';
                      
                      return (
                        <Box key={qIndex} sx={{ mb: 3 }}>
                          <Typography variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
                            {qIndex + 1}. {questionText}
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={userAnswer}
                            onChange={(e) => handleCaseAnswerChange(caseId, qIndex, e.target.value)}
                            placeholder="Escribe tu respuesta aquí..."
                            sx={{ mt: 1 }}
                          />
                          
                          {showAnswers && (expectedAnswer || explanation) && (
                            <Box sx={{ mt: 2, p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
                              {expectedAnswer && (
                                <>
                                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                                    Respuesta Esperada:
                                  </Typography>
                                  <Typography variant="body2" paragraph>
                                    {expectedAnswer}
                                  </Typography>
                                </>
                              )}
                              {explanation && (
                                <>
                                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: expectedAnswer ? 1 : 0 }}>
                                    Explicación:
                                  </Typography>
                                  <Typography variant="body2">
                                    {explanation}
                                  </Typography>
                                </>
                              )}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
                
                <Button
                  variant="outlined"
                  onClick={() => handleShowCaseAnswers(caseId)}
                  sx={{ mt: 2 }}
                >
                  {showAnswers ? 'Ocultar Respuestas' : 'Mostrar Respuestas Esperadas'}
                </Button>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    );
  };
  
  /**
   * Render key points section
   */
  const renderKeyPoints = () => {
    if (!data?.content?.keyPoints || data.content.keyPoints.length === 0) return null;
    
    return (
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 4,
          backgroundColor: 'warning.light',
          backgroundColor: 'rgba(255, 193, 7, 0.15)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <StarIcon sx={{ color: 'warning.main', mr: 1 }} />
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Puntos Clave
          </Typography>
        </Box>
        
        <List>
          {data.content.keyPoints.map((point, index) => (
            <ListItem key={index} sx={{ pl: 0, alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                <TrophyIcon sx={{ color: 'warning.main', fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary={point}
                primaryTypographyProps={{
                  variant: 'body1',
                  sx: { fontWeight: 500, lineHeight: 1.7 },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  };
  
  /**
   * Render assessment section with different question types
   */
  const renderAssessment = () => {
    if (!data?.content?.assessment?.questions || data.content.assessment.questions.length === 0) {
      return null;
    }
    
    const questions = data.content.assessment.questions;
    
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Autoevaluación
        </Typography>
        
        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
          {questions.map((question, index) => {
            const questionId = question.questionId || `q-${index}`;
            const userAnswer = assessmentAnswers[questionId];
            
            return (
              <Box key={index} sx={{ mb: 4, pb: 3, borderBottom: index < questions.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  {index + 1}. {question.questionText}
                </Typography>
                
                {question.type === 'multipleChoice' && question.options && (
                  <FormControl component="fieldset" sx={{ width: '100%' }}>
                    <RadioGroup
                      value={userAnswer || ''}
                      onChange={(e) => handleAssessmentAnswerChange(questionId, e.target.value)}
                    >
                      {question.options.map((option, optIndex) => (
                        <FormControlLabel
                          key={optIndex}
                          value={String(optIndex)}
                          control={<Radio />}
                          label={option}
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                )}
                
                {question.type === 'trueFalse' && (
                  <FormControl component="fieldset" sx={{ width: '100%' }}>
                    <RadioGroup
                      value={userAnswer || ''}
                      onChange={(e) => handleAssessmentAnswerChange(questionId, e.target.value)}
                    >
                      <FormControlLabel value="true" control={<Radio />} label="Verdadero" />
                      <FormControlLabel value="false" control={<Radio />} label="Falso" />
                    </RadioGroup>
                  </FormControl>
                )}
                
                {question.type === 'shortAnswer' && (
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={userAnswer || ''}
                    onChange={(e) => handleAssessmentAnswerChange(questionId, e.target.value)}
                    placeholder="Escribe tu respuesta aquí..."
                  />
                )}
                
                {showAssessmentResults && (
                  <Box sx={{ mt: 2 }}>
                    {String(userAnswer) === String(question.correctAnswer) ? (
                      <Alert severity="success" sx={{ mb: 1 }}>
                        ¡Correcto!
                      </Alert>
                    ) : (
                      <Alert severity="error" sx={{ mb: 1 }}>
                        Incorrecto. La respuesta correcta es: {question.options ? question.options[question.correctAnswer] : question.correctAnswer}
                      </Alert>
                    )}
                    {question.explanation && (
                      <Paper sx={{ p: 2, backgroundColor: 'info.light', mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Explicación:</strong> {question.explanation}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setShowAssessmentResults(false);
                setAssessmentAnswers({});
              }}
            >
              Reiniciar
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitAssessment}
              disabled={Object.keys(assessmentAnswers).length === 0}
            >
              Enviar Respuestas
            </Button>
          </Box>
          
          {assessmentScore && (
            <Dialog open={showAssessmentResults} onClose={() => setShowAssessmentResults(false)}>
              <DialogTitle>Resultados de la Autoevaluación</DialogTitle>
              <DialogContent>
                <Typography variant="h4" align="center" gutterBottom>
                  {assessmentScore.correct} / {assessmentScore.total}
                </Typography>
                <Typography variant="h6" align="center" color="text.secondary" gutterBottom>
                  {assessmentScore.percentage}% Correcto
                </Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  {assessmentScore.percentage >= 80
                    ? '¡Excelente trabajo! Has demostrado un buen entendimiento del contenido.'
                    : assessmentScore.percentage >= 60
                    ? 'Buen intento. Te recomendamos revisar los puntos en los que tuviste dificultades.'
                    : 'Te recomendamos revisar el contenido de la lección antes de continuar.'}
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowAssessmentResults(false)}>Cerrar</Button>
              </DialogActions>
            </Dialog>
          )}
        </Paper>
      </Box>
    );
  };
  
  /**
   * Render bibliographic references
   */
  const renderReferences = () => {
    if (!data?.content?.references || data.content.references.length === 0) return null;
    
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Referencias Bibliográficas
        </Typography>
        
        <Paper elevation={1} sx={{ p: { xs: 2, md: 3 } }}>
          <List>
            {data.content.references.map((ref, index) => (
              <ListItem key={index} sx={{ pl: 0, alignItems: 'flex-start' }}>
                <ListItemText
                  primary={
                    <Box>
                      <Typography variant="body2" component="span" sx={{ fontWeight: 600, mr: 1 }}>
                        {index + 1}.
                      </Typography>
                      <Typography variant="body2" component="span">
                        {ref.authors && `${ref.authors} `}
                        {ref.year && `(${ref.year}). `}
                        {ref.title && (
                          <Typography component="span" variant="body2" sx={{ fontStyle: 'italic' }}>
                            {ref.title}
                          </Typography>
                        )}
                        {ref.journal && `. ${ref.journal}`}
                        {ref.volume && `, ${ref.volume}`}
                        {ref.pages && `, ${ref.pages}`}
                        {ref.doi && (
                          <Link
                            href={`https://doi.org/${ref.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ ml: 1 }}
                          >
                            DOI: {ref.doi}
                            <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle' }} />
                          </Link>
                        )}
                        {ref.url && !ref.doi && (
                          <Link
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ ml: 1 }}
                          >
                            Ver enlace
                            <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle' }} />
                          </Link>
                        )}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    );
  };
  
  /**
   * Render lesson navigation buttons
   */
  const renderNavigation = () => {
    if (!data?.navigation) return null;
    
    const { previousLesson, nextLesson } = data.navigation;
    
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => previousLesson && handleNavigateToLesson(previousLesson.id, data.moduleId)}
              disabled={!previousLesson}
            >
              {previousLesson ? `Anterior: ${previousLesson.title}` : 'No hay lección anterior'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => nextLesson && handleNavigateToLesson(nextLesson.id, data.moduleId)}
              disabled={!nextLesson}
            >
              {nextLesson ? `Siguiente: ${nextLesson.title}` : 'No hay lección siguiente'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    );
  };
  
  // ============================================================================
  // Loading State
  // ============================================================================
  
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 1 }} />
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }
  
  // ============================================================================
  // Error State
  // ============================================================================
  
  if (error || !data) {
    return (
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
    );
  }
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Reading Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={readingProgress}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          zIndex: theme.zIndex.appBar + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
        }}
      />
      
      <Box ref={contentRef}>
        {/* Header */}
        {renderHeader()}
        
        {/* Introduction */}
        {renderIntroduction()}
        
        {/* Theory */}
        {renderTheory()}
        
        {/* Visual Elements */}
        {renderVisualElements()}
        
        {/* Practical Cases */}
        {renderPracticalCases()}
        
        {/* Key Points */}
        {renderKeyPoints()}
        
        {/* Assessment */}
        {renderAssessment()}
        
        {/* References */}
        {renderReferences()}
        
        {/* Navigation */}
        {renderNavigation()}
      </Box>
      
      {/* Floating Action Button for Completion */}
      {!isLessonCompleted() && (
        <Fab
          color="primary"
          aria-label="marcar como completada"
          onClick={handleMarkAsComplete}
          sx={{
            position: 'fixed',
            bottom: { xs: 16, md: 24 },
            right: { xs: 16, md: 24 },
            zIndex: theme.zIndex.speedDial,
          }}
        >
          <CheckCircleIcon />
        </Fab>
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
    </Container>
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
};

LessonViewer.defaultProps = {
  onComplete: null,
  onNavigate: null,
};

export default LessonViewer;

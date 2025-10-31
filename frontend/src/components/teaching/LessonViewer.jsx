import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Breadcrumbs,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Paper,
  Drawer,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogContent,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
  Collapse,
  Fab,
  Badge
} from '@mui/material';
import {
  Home,
  School,
  CheckCircle,
  RadioButtonUnchecked,
  ExpandMore,
  ExpandLess,
  Menu,
  Close,
  NavigateBefore,
  NavigateNext,
  AccessTime,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  ZoomIn,
  Notes,
  Lightbulb,
  Functions,
  Link as LinkIcon,
  Quiz,
  Image as ImageIcon,
  Lock,
  LockOpen,
  FiberManualRecord,
  PlayArrow,
  TrendingUp,
  Timer,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import { useLearningProgress } from '../../contexts/LearningProgressContext';
import { curriculumData, getModulesByLevel, getModuleById } from '../../data/curriculumData';

const LessonViewer = ({ 
  lessonData, 
  moduleId, 
  lessonId, 
  onClose, 
  onNavigateLesson, 
  onMarkComplete 
}) => {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  // Contexto de progreso de aprendizaje
  const { 
    completedLessons, 
    timeSpent, 
    markLessonComplete, 
    updateTimeSpent 
  } = useLearningProgress();
  
  // Estados del componente
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [tabValue, setTabValue] = useState(0);
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [timeStarted, setTimeStarted] = useState(Date.now());
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  // Obtener datos dinámicamente basados en moduleId y lessonId
  const currentModule = moduleId ? getModuleById(moduleId) : null;
  const currentLesson = currentModule && lessonId ? 
    currentModule.lessons?.find(l => l.id === lessonId) : null;
  
  // Datos de ejemplo si no se proporciona lessonData
  const defaultLessonData = {
    id: lessonId || 'respiratory-anatomy',
    moduleId: moduleId || 'respiratory-anatomy',
    moduleName: currentModule?.title || 'Fundamentos Fisiológicos',
    level: currentModule?.level || 'beginner',
    title: currentLesson?.title || 'Anatomía del Sistema Respiratorio',
    estimatedTime: currentLesson?.duration || 30,
    currentProgress: 25,
    sections: currentLesson?.content ? [currentLesson.content] : [
      {
        id: 'intro',
        title: 'Introducción',
        type: 'text',
        content: {
          text: 'El sistema respiratorio es esencial para mantener la vida, proporcionando oxígeno al organismo y eliminando dióxido de carbono. Su comprensión es fundamental para entender los principios de la ventilación mecánica.',
          highlights: [
            'Función principal: intercambio gaseoso',
            'Estructura dividida en vías aéreas superiores e inferiores',
            'Superficie alveolar total: aproximadamente 70 m²'
          ]
        }
      },
      {
        id: 'upper-airways',
        title: 'Vías Aéreas Superiores',
        type: 'mixed',
        content: {
          text: 'Las vías aéreas superiores comprenden las estructuras desde la nariz hasta la laringe, siendo responsables de filtrar, calentar y humidificar el aire inspirado.',
          image: '/images/upper-airways.png',
          imageCaption: 'Anatomía de vías aéreas superiores',
          list: [
            'Nariz y cavidad nasal: filtración inicial',
            'Faringe: vía común respiratoria y digestiva',
            'Laringe: contiene las cuerdas vocales',
            'Epiglotis: previene aspiración'
          ]
        }
      },
      {
        id: 'lung-anatomy',
        title: 'Anatomía Pulmonar',
        type: 'interactive',
        content: {
          description: 'Explora la estructura pulmonar detallada:',
          components: ['Lóbulos', 'Segmentos', 'Alvéolos', 'Pleura'],
          tableData: [
            { structure: 'Pulmón Derecho', lobules: '3', segments: '10' },
            { structure: 'Pulmón Izquierdo', lobules: '2', segments: '8' },
            { structure: 'Total Alvéolos', lobules: '-', segments: '~300 millones' }
          ],
          quiz: {
            question: '¿Cuántos lóbulos tiene el pulmón derecho?',
            options: ['2', '3', '4', '5'],
            correct: 1,
            explanation: 'El pulmón derecho tiene 3 lóbulos: superior, medio e inferior.'
          }
        }
      }
    ],
    keyPoints: currentLesson?.content?.keyPoints || [
      'El pulmón derecho tiene 3 lóbulos, el izquierdo 2',
      'La superficie alveolar total es de aproximadamente 70m²',
      'El intercambio gaseoso ocurre exclusivamente en los alvéolos',
      'Las vías aéreas se dividen hasta 23 generaciones'
    ],
    formulas: [
      { name: 'Compliance Pulmonar', formula: 'C = ΔV/ΔP', unit: 'mL/cmH₂O' },
      { name: 'Resistencia de Vías Aéreas', formula: 'R = ΔP/Flow', unit: 'cmH₂O/L/s' },
      { name: 'Capacidad Pulmonar Total', formula: 'CPT = CV + VR', unit: 'mL' }
    ],
    references: [
      { title: 'West Fisiología Respiratoria - 10ª Edición', url: '#', type: 'book' },
      { title: 'Guías ARDS Network', url: '#', type: 'guideline' },
      { title: 'Anatomía Respiratoria - Atlas Interactivo', url: '#', type: 'interactive' }
    ]
  };

  const lesson = lessonData || defaultLessonData;
  const currentSection = lesson.sections[currentSectionIndex];
  
  // Obtener información del nivel actual
  const currentLevel = curriculumData.levels.find(level => level.id === lesson.level);
  const levelTitle = currentLevel?.title || 'Nivel Principiante';

  // Efectos
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Efecto para expandir el módulo actual en el sidebar
  useEffect(() => {
    if (moduleId) {
      setExpandedModules(prev => new Set([...prev, moduleId]));
    }
  }, [moduleId]);

  // Efecto para calcular tiempo restante
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const timeElapsed = (Date.now() - timeStarted) / 1000 / 60; // en minutos
      const totalEstimatedTime = lesson.estimatedTime || 30;
      const remaining = Math.max(0, totalEstimatedTime - timeElapsed);
      setEstimatedTimeRemaining(remaining);
    };

    const interval = setInterval(calculateTimeRemaining, 60000); // actualizar cada minuto
    calculateTimeRemaining(); // calcular inmediatamente

    return () => clearInterval(interval);
  }, [timeStarted, lesson.estimatedTime]);

  // Efecto para manejar shortcuts de teclado
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevSection();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextSection();
          break;
        case 'Escape':
          event.preventDefault();
          onClose?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSectionIndex, lesson.sections.length]);

  // Funciones auxiliares
  const calculateModuleProgress = (moduleId) => {
    const module = getModuleById(moduleId);
    if (!module || !module.lessons) return 0;
    
    const moduleLessons = module.lessons || [];
    const completedModuleLessons = moduleLessons.filter(lesson => 
      completedLessons.has(`${moduleId}-${lesson.id}`)
    );
    
    return moduleLessons.length > 0 ? (completedModuleLessons.length / moduleLessons.length) * 100 : 0;
  };

  const getLessonStatus = (moduleId, lessonId) => {
    const lessonKey = `${moduleId}-${lessonId}`;
    return completedLessons.has(lessonKey) ? 'completed' : 'pending';
  };

  const isModuleAvailable = (moduleId) => {
    const module = getModuleById(moduleId);
    if (!module) return false;
    
    if (!module.prerequisites || module.prerequisites.length === 0) {
      return true;
    }
    
    return module.prerequisites.every(prereqId => {
      const prereqProgress = calculateModuleProgress(prereqId);
      return prereqProgress >= 75;
    });
  };

  const getModulesForCurrentLevel = () => {
    if (!lesson.level) return [];
    return getModulesByLevel(lesson.level);
  };

  const getNextLesson = () => {
    const modules = getModulesForCurrentLevel();
    const currentModuleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (currentModuleIndex >= 0) {
      const currentModule = modules[currentModuleIndex];
      const currentLessonIndex = currentModule.lessons?.findIndex(l => l.id === lessonId) || -1;
      
      // Buscar en el módulo actual
      if (currentLessonIndex >= 0 && currentLessonIndex < currentModule.lessons.length - 1) {
        return {
          moduleId: moduleId,
          lessonId: currentModule.lessons[currentLessonIndex + 1].id,
          module: currentModule,
          lesson: currentModule.lessons[currentLessonIndex + 1]
        };
      }
      
      // Buscar en el siguiente módulo
      if (currentModuleIndex < modules.length - 1) {
        const nextModule = modules[currentModuleIndex + 1];
        if (nextModule.lessons && nextModule.lessons.length > 0) {
          return {
            moduleId: nextModule.id,
            lessonId: nextModule.lessons[0].id,
            module: nextModule,
            lesson: nextModule.lessons[0]
          };
        }
      }
    }
    
    return null;
  };

  const getPrevLesson = () => {
    const modules = getModulesForCurrentLevel();
    const currentModuleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (currentModuleIndex >= 0) {
      const currentModule = modules[currentModuleIndex];
      const currentLessonIndex = currentModule.lessons?.findIndex(l => l.id === lessonId) || -1;
      
      // Buscar en el módulo actual
      if (currentLessonIndex > 0) {
        return {
          moduleId: moduleId,
          lessonId: currentModule.lessons[currentLessonIndex - 1].id,
          module: currentModule,
          lesson: currentModule.lessons[currentLessonIndex - 1]
        };
      }
      
      // Buscar en el módulo anterior
      if (currentModuleIndex > 0) {
        const prevModule = modules[currentModuleIndex - 1];
        if (prevModule.lessons && prevModule.lessons.length > 0) {
          const lastLesson = prevModule.lessons[prevModule.lessons.length - 1];
          return {
            moduleId: prevModule.id,
            lessonId: lastLesson.id,
            module: prevModule,
            lesson: lastLesson
          };
        }
      }
    }
    
    return null;
  };

  // Handlers
  const handleSectionClick = (index) => {
    setCurrentSectionIndex(index);
    if (isMobile) setSidebarOpen(false);
  };

  const handleMarkSectionComplete = (sectionIndex) => {
    const newCompleted = new Set(completedSections);
    if (newCompleted.has(sectionIndex)) {
      newCompleted.delete(sectionIndex);
    } else {
      newCompleted.add(sectionIndex);
    }
    setCompletedSections(newCompleted);
  };

  const handleLessonNavigation = (targetModuleId, targetLessonId) => {
    const lessonKey = `${targetModuleId}-${targetLessonId}`;
    markLessonComplete(lessonKey);
    updateTimeSpent(1);
    
    if (onNavigateLesson) {
      onNavigateLesson(targetModuleId, targetLessonId);
    } else {
      // Navegación usando router
      router.push(`/teaching/${targetModuleId}/${targetLessonId}`);
    }
  };

  const handleToggleModuleExpansion = (moduleId) => {
    setExpandedModules(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(moduleId)) {
        newExpanded.delete(moduleId);
      } else {
        newExpanded.add(moduleId);
      }
      return newExpanded;
    });
  };

  const handleImageClick = (imageSrc) => {
    setSelectedImage(imageSrc);
    setImageDialogOpen(true);
  };

  const handleQuizAnswer = (sectionId, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [sectionId]: answer
    }));
  };

  const handleNextSection = () => {
    if (currentSectionIndex < lesson.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const handlePrevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  // Renderizadores de contenido
  const renderTextContent = (content) => (
    <>
      <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, mb: 3 }}>
        {content.text}
      </Typography>
      
      {content.highlights && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
            Puntos Destacados:
          </Typography>
          <List dense>
            {content.highlights.map((highlight, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemIcon sx={{ minWidth: 20 }}>
                  <Typography variant="body2">•</Typography>
                </ListItemIcon>
                <ListItemText 
                  primary={highlight}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}
    </>
  );

  const renderMixedContent = (content) => (
    <>
      <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, mb: 3 }}>
        {content.text}
      </Typography>

      {content.image && (
        <Card sx={{ mb: 3, cursor: 'pointer' }} onClick={() => handleImageClick(content.image)}>
          <Box
            component="img"
            src={content.image}
            alt={content.imageCaption}
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: 400,
              objectFit: 'contain',
              '&:hover': { opacity: 0.9 }
            }}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
            }}
          />
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              <ZoomIn sx={{ mr: 1, fontSize: 16 }} />
              {content.imageCaption} (Click para ampliar)
            </Typography>
          </CardContent>
        </Card>
      )}

      {content.list && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <List>
              {content.list.map((item, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircle color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={item} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </>
  );

  const renderInteractiveContent = (content) => (
    <>
      <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, mb: 3 }}>
        {content.description}
      </Typography>

      {content.tableData && (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Estructura</strong></TableCell>
                <TableCell><strong>Lóbulos</strong></TableCell>
                <TableCell><strong>Segmentos</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {content.tableData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.structure}</TableCell>
                  <TableCell>{row.lobules}</TableCell>
                  <TableCell>{row.segments}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {content.quiz && (
        <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Quiz sx={{ mr: 1 }} />
            Quiz Rápido
          </Typography>
          <Typography variant="body1" gutterBottom>
            {content.quiz.question}
          </Typography>
          <RadioGroup
            value={quizAnswers[currentSection.id] || ''}
            onChange={(e) => handleQuizAnswer(currentSection.id, e.target.value)}
          >
            {content.quiz.options.map((option, index) => (
              <FormControlLabel
                key={index}
                value={index.toString()}
                control={<Radio />}
                label={option}
              />
            ))}
          </RadioGroup>
          {quizAnswers[currentSection.id] !== undefined && (
            <Alert 
              severity={quizAnswers[currentSection.id] == content.quiz.correct ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              {quizAnswers[currentSection.id] == content.quiz.correct 
                ? '¡Correcto! ' + content.quiz.explanation
                : 'Incorrecto. ' + content.quiz.explanation
              }
            </Alert>
          )}
        </Card>
      )}
    </>
  );

  const renderContent = () => {
    switch (currentSection.type) {
      case 'text':
        return renderTextContent(currentSection.content);
      case 'mixed':
        return renderMixedContent(currentSection.content);
      case 'interactive':
        return renderInteractiveContent(currentSection.content);
      default:
        // Intentar renderizar como texto si el tipo no es reconocido
        if (currentSection.content) {
          return renderTextContent(currentSection.content);
        }
        return null;
    }
  };

  // Sidebar de navegación jerárquico
  const renderLessonItem = (lessonItem, moduleId, index) => {
    const status = getLessonStatus(moduleId, lessonItem.id);
    const isCurrentLesson = moduleId === lesson.moduleId && lessonItem.id === lesson.id;
    
    return (
      <ListItemButton
        key={lessonItem.id}
        selected={isCurrentLesson}
        onClick={() => handleLessonNavigation(moduleId, lessonItem.id)}
        sx={{
          pl: 4,
          borderRadius: 1,
          mb: 0.5,
          '&.Mui-selected': {
            backgroundColor: theme.palette.primary.main + '15',
            borderLeft: `3px solid ${theme.palette.primary.main}`,
            '&:hover': {
              backgroundColor: theme.palette.primary.main + '25',
            }
          }
        }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          {status === 'completed' ? (
            <CheckCircle sx={{ color: '#4CAF50', fontSize: 20 }} />
          ) : isCurrentLesson ? (
            <FiberManualRecord sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
          ) : (
            <RadioButtonUnchecked sx={{ color: '#9E9E9E', fontSize: 20 }} />
          )}
        </ListItemIcon>
        <ListItemText 
          primary={lessonItem.title}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: isCurrentLesson ? 'bold' : 'normal',
            color: isCurrentLesson ? theme.palette.primary.main : 'inherit'
          }}
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <AccessTime sx={{ fontSize: 12, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {lessonItem.duration} min
              </Typography>
            </Box>
          }
        />
      </ListItemButton>
    );
  };

  const renderModuleItem = (module) => {
    const isExpanded = expandedModules.has(module.id);
    const isCurrentModule = module.id === lesson.moduleId;
    const moduleProgress = calculateModuleProgress(module.id);
    const isAvailable = isModuleAvailable(module.id);
    
    return (
      <Box key={module.id}>
        <ListItemButton
          onClick={() => handleToggleModuleExpansion(module.id)}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            backgroundColor: isCurrentModule ? theme.palette.primary.main + '10' : 'transparent',
            borderLeft: isCurrentModule ? `3px solid ${theme.palette.primary.main}` : 'none',
            '&:hover': {
              backgroundColor: isCurrentModule ? theme.palette.primary.main + '20' : theme.palette.action.hover,
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </ListItemIcon>
          <ListItemText 
            primary={module.title}
            primaryTypographyProps={{
              variant: 'body2',
              fontWeight: isCurrentModule ? 'bold' : 'normal',
              color: isCurrentModule ? theme.palette.primary.main : 
                     !isAvailable ? 'text.disabled' : 'inherit'
            }}
            secondary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={moduleProgress} 
                  sx={{ 
                    width: 60, 
                    height: 4, 
                    borderRadius: 2,
                    backgroundColor: theme.palette.grey[300],
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: 2,
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {moduleProgress.toFixed(0)}%
                </Typography>
                {!isAvailable && (
                  <Lock sx={{ fontSize: 14, color: 'text.disabled' }} />
                )}
              </Box>
            }
          />
        </ListItemButton>
        
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {module.lessons?.map((lessonItem, index) => 
              renderLessonItem(lessonItem, module.id, index)
            )}
          </List>
        </Collapse>
      </Box>
    );
  };

  const sidebarContent = (
    <Box sx={{ width: isMobile ? 320 : '100%', p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom sx={{ px: 1, color: theme.palette.primary.main, mb: 2 }}>
        Navegación del Curso
      </Typography>
      
      {/* Información del nivel actual */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: theme.palette.primary.main + '05' }}>
        <Typography variant="subtitle2" color="primary" gutterBottom>
          {levelTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {currentLevel?.description}
        </Typography>
      </Paper>

      {/* Lista de módulos */}
      <List>
        {getModulesForCurrentLevel().map(renderModuleItem)}
      </List>
      
      {/* Contenido de la lección actual */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" gutterBottom sx={{ px: 1, color: theme.palette.secondary.main }}>
        Contenido de la Lección Actual
      </Typography>
      <List dense>
        {lesson.sections.map((section, index) => (
          <ListItemButton
            key={section.id}
            selected={index === currentSectionIndex}
            onClick={() => handleSectionClick(index)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              pl: 2,
              '&.Mui-selected': {
                backgroundColor: theme.palette.secondary.main + '15',
                '&:hover': {
                  backgroundColor: theme.palette.secondary.main + '25',
                }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 24 }}>
              {completedSections.has(index) ? (
                <CheckCircle sx={{ color: '#4CAF50', fontSize: 16 }} />
              ) : index === currentSectionIndex ? (
                <FiberManualRecord sx={{ color: theme.palette.secondary.main, fontSize: 16 }} />
              ) : (
                <RadioButtonUnchecked sx={{ color: '#9E9E9E', fontSize: 16 }} />
              )}
            </ListItemIcon>
            <ListItemText 
              primary={section.title}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: index === currentSectionIndex ? 'bold' : 'normal'
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header de la Lección */}
      <Paper elevation={2} sx={{ p: 2, zIndex: 1200 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            {/* Breadcrumbs dinámicos */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ flex: 1 }}>
              <Link 
                underline="hover" 
                color="inherit" 
                href="/" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { color: theme.palette.primary.main }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/');
                }}
              >
                <Home sx={{ mr: 0.5 }} fontSize="inherit" />
                Inicio
              </Link>
              <Link 
                underline="hover" 
                color="inherit" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { color: theme.palette.primary.main }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/teaching');
                }}
              >
                <School sx={{ mr: 0.5 }} fontSize="inherit" />
                Aprender
              </Link>
              <Link 
                underline="hover" 
                color="inherit" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { color: theme.palette.primary.main }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/teaching?level=${lesson.level}`);
                }}
              >
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  {levelTitle}
                </Typography>
              </Link>
              <Link 
                underline="hover" 
                color="inherit" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { color: theme.palette.primary.main }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/teaching?module=${lesson.moduleId}`);
                }}
              >
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  {lesson.moduleName}
                </Typography>
              </Link>
              <Typography 
                color="text.primary" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontWeight: 600
                }}
              >
                {lesson.title}
              </Typography>
            </Breadcrumbs>

            {/* Botón cerrar */}
            <IconButton onClick={onClose} size="large">
              <Close />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            {/* Título y tiempo */}
            <div>
              <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
                {lesson.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<AccessTime />}
                  label={`${lesson.estimatedTime} min estimados`}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
                {estimatedTimeRemaining > 0 && (
                  <Chip
                    icon={<Timer />}
                    label={`${Math.round(estimatedTimeRemaining)} min restantes`}
                    size="small"
                    variant="filled"
                    color={estimatedTimeRemaining < 5 ? 'error' : estimatedTimeRemaining < 10 ? 'warning' : 'success'}
                  />
                )}
                <Typography variant="body2" color="text.secondary">
                  Sección {currentSectionIndex + 1} de {lesson.sections.length}
                </Typography>
              </Box>
            </div>

            {/* Botón sidebar mobile */}
            {isMobile && (
              <IconButton onClick={() => setSidebarOpen(true)}>
                <Menu />
              </IconButton>
            )}
          </Box>

          {/* Progreso de la lección */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progreso de la Lección
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round((completedSections.size / lesson.sections.length) * 100)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(completedSections.size / lesson.sections.length) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        </Container>
      </Paper>

      {/* Contenido Principal */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Desktop */}
        {!isMobile && (
          <Paper 
            elevation={1} 
            sx={{ 
              width: isTablet ? '25%' : '20%', 
              borderRadius: 0, 
              borderRight: `1px solid ${theme.palette.divider}`,
              overflow: 'auto'
            }}
          >
            {sidebarContent}
          </Paper>
        )}

        {/* Sidebar Mobile */}
        <Drawer
          anchor="left"
          open={sidebarOpen && isMobile}
          onClose={() => setSidebarOpen(false)}
        >
          {sidebarContent}
        </Drawer>

        {/* Área de Contenido Central */}
        <Box 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            display: 'flex'
          }}
        >
          <Container maxWidth="lg" sx={{ py: 3, flex: 1 }}>
            <Grid container spacing={3}>
              {/* Contenido Principal */}
              <Grid item xs={12} lg={8}>
                <Paper elevation={1} sx={{ p: 3, minHeight: 400 }}>
                  <Typography variant="h5" gutterBottom sx={{ color: theme.palette.primary.main }}>
                    {currentSection.title}
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  {renderContent()}
                </Paper>
              </Grid>

              {/* Panel de Recursos */}
              <Grid item xs={12} lg={4}>
                <Box sx={{ position: 'sticky', top: 16 }}>
                  {/* Puntos Clave */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Lightbulb sx={{ mr: 1, color: theme.palette.warning.main }} />
                      Puntos Clave
                    </Typography>
                    <List dense>
                      {lesson.keyPoints.map((point, index) => (
                        <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 20 }}>
                            <Typography variant="body2" color="primary">•</Typography>
                          </ListItemIcon>
                          <ListItemText
                            primary={point}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Fórmulas */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Functions sx={{ mr: 1, color: theme.palette.info.main }} />
                      Fórmulas
                    </Typography>
                    {lesson.formulas.map((formula, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          {formula.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            backgroundColor: theme.palette.grey[100],
                            color: theme.palette.text.primary,
                            p: 1,
                            borderRadius: 1,
                            display: 'inline-block'
                          }}
                        >
                          {formula.formula}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Unidad: {formula.unit}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Referencias */}
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <LinkIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                      Referencias
                    </Typography>
                    {lesson.references.map((ref, index) => (
                      <Box key={index} sx={{ mb: 1.5 }}>
                        <Link
                          href={ref.url}
                          target="_blank"
                          underline="hover"
                          sx={{ display: 'block', fontSize: '0.875rem', mb: 0.5 }}
                        >
                          {ref.title}
                        </Link>
                        <Chip
                          label={ref.type}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', height: 20 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>

      {/* Footer de Navegación */}
      <Paper elevation={3} sx={{ p: 2, mt: 'auto' }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            {/* Navegación anterior */}
            <Button
              startIcon={<NavigateBefore />}
              disabled={currentSectionIndex === 0}
              onClick={handlePrevSection}
              variant="outlined"
              sx={{ minWidth: 140 }}
            >
              Sección Anterior
            </Button>

            {/* Indicador central */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Sección {currentSectionIndex + 1} de {lesson.sections.length}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleMarkSectionComplete(currentSectionIndex)}
                sx={{ mt: 1 }}
              >
                {completedSections.has(currentSectionIndex) ? 'Marcar Incompleta' : 'Marcar Completada'}
              </Button>
            </Box>

            {/* Navegación siguiente */}
            <Button
              endIcon={<NavigateNext />}
              disabled={currentSectionIndex === lesson.sections.length - 1}
              onClick={handleNextSection}
              variant="contained"
              sx={{ minWidth: 140 }}
            >
              Siguiente Sección
            </Button>
          </Box>
        </Container>
      </Paper>

      {/* Botones flotantes de navegación entre lecciones */}
      {!isMobile && (
        <>
          {/* Botón Lección Anterior */}
          {getPrevLesson() && (
            <Fab
              color="primary"
              aria-label="lección anterior"
              sx={{
                position: 'fixed',
                bottom: 100,
                right: 100,
                zIndex: 1300,
                backgroundColor: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                }
              }}
              onClick={() => {
                const prevLesson = getPrevLesson();
                if (prevLesson) {
                  handleLessonNavigation(prevLesson.moduleId, prevLesson.lessonId);
                }
              }}
            >
              <ChevronLeft />
            </Fab>
          )}

          {/* Botón Siguiente Lección */}
          {getNextLesson() && (
            <Fab
              color="secondary"
              aria-label="siguiente lección"
              sx={{
                position: 'fixed',
                bottom: 100,
                right: 40,
                zIndex: 1300,
                backgroundColor: theme.palette.secondary.main,
                '&:hover': {
                  backgroundColor: theme.palette.secondary.dark,
                }
              }}
              onClick={() => {
                const nextLesson = getNextLesson();
                if (nextLesson) {
                  handleLessonNavigation(nextLesson.moduleId, nextLesson.lessonId);
                }
              }}
            >
              <ChevronRight />
            </Fab>
          )}

          {/* Indicador de shortcuts */}
          <Paper
            elevation={2}
            sx={{
              position: 'fixed',
              bottom: 20,
              left: 20,
              p: 1.5,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              borderRadius: 2,
              zIndex: 1300
            }}
          >
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
              <strong>Atajos:</strong>
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              ← → Navegar secciones
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              ESC Cerrar
            </Typography>
          </Paper>
        </>
      )}

      {/* Botones móviles para navegación entre lecciones */}
      {isMobile && (
        <Box sx={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          right: 20,
          display: 'flex',
          gap: 2,
          zIndex: 1300
        }}>
          {getPrevLesson() && (
            <Fab
              color="primary"
              aria-label="lección anterior"
              size="medium"
              onClick={() => {
                const prevLesson = getPrevLesson();
                if (prevLesson) {
                  handleLessonNavigation(prevLesson.moduleId, prevLesson.lessonId);
                }
              }}
              sx={{ flex: 1, maxWidth: 80 }}
            >
              <ChevronLeft />
            </Fab>
          )}
          
          {getNextLesson() && (
            <Fab
              color="secondary"
              aria-label="siguiente lección"
              size="medium"
              onClick={() => {
                const nextLesson = getNextLesson();
                if (nextLesson) {
                  handleLessonNavigation(nextLesson.moduleId, nextLesson.lessonId);
                }
              }}
              sx={{ flex: 1, maxWidth: 80 }}
            >
              <ChevronRight />
            </Fab>
          )}
        </Box>
      )}

      {/* Dialog para imágenes */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage}
              alt="Imagen ampliada"
              sx={{ width: '100%', height: 'auto' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LessonViewer;

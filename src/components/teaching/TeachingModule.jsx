"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  LinearProgress,
  Breadcrumbs,
  Link,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  useTheme,
  useMediaQuery,
  Tooltip,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CardMedia,
  IconButton,
  Divider,
  Stack,
  Badge
} from '@mui/material';
import {
  Biotech,
  Settings,
  MonitorHeart,
  Home,
  School,
  CheckCircle,
  RadioButtonUnchecked,
  PlayArrow,
  Refresh,
  Lock,
  LockOpen,
  NavigateNext,
  Star,
  AccessTime,
  Person,
  TrendingUp,
  PlayCircleOutline,
  BookmarkBorder,
  Bookmark,
  LocalFireDepartment,
  EmojiEvents,
  Timeline,
  Psychology,
  Lightbulb,
  School as SchoolIcon,
  Assessment,
  CalendarToday,
  Schedule,
  TrendingDown,
  AutoAwesome,
  Style as FlashcardIcon
} from '@mui/icons-material';
import { useLearningProgress } from '../../contexts/LearningProgressContext';
import ClientOnly from '../common/ClientOnly';
import { curriculumData, getModulesByLevel, getLevelProgress } from '../../data/curriculumData';
import FlashcardDashboard from './components/FlashcardDashboard';
import FlashcardSystem from './FlashcardSystem';

const TeachingModule = () => {
  const theme = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  
  // Usar el contexto de progreso de aprendizaje
  const { 
    completedLessons, 
    timeSpent, 
    currentModule, 
    markLessonComplete, 
    updateTimeSpent, 
    setCurrentModule
  } = useLearningProgress();
  
  // Establecer el módulo actual al cargar y manejar responsive
  useEffect(() => {
    setCurrentModule('teaching');
    
    // Manejar responsive de manera segura para SSR
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 960); // md breakpoint
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []); // Removed setCurrentModule dependency to prevent infinite loop
  
  // Estado para el módulo actual del usuario
  const [currentUserModule, setCurrentUserModule] = useState(null);
  const [favoriteModules, setFavoriteModules] = useState(new Set());
  const [flashcardSystemOpen, setFlashcardSystemOpen] = useState(false);

  // Calcular progreso basado en lecciones completadas y curriculum data - memoizado
  const calculateModuleProgress = useCallback((moduleId) => {
    const module = curriculumData.modules[moduleId];
    if (!module) return 0;
    
    // Contar lecciones completadas para este módulo
    const moduleLessons = module.lessons || [];
    const completedModuleLessons = moduleLessons.filter(lesson => 
      completedLessons.has(`${moduleId}-${lesson.id}`)
    );
    
    return moduleLessons.length > 0 ? (completedModuleLessons.length / moduleLessons.length) * 100 : 0;
  }, [completedLessons]);

  // Verificar si un módulo está disponible basándose en prerequisites - memoizado
  const isModuleAvailable = useCallback((moduleId) => {
    const module = curriculumData.modules[moduleId];
    if (!module) return false;
    
    // Si no tiene prerequisites, está disponible
    if (!module.prerequisites || module.prerequisites.length === 0) {
      return true;
    }
    
    // Verificar que todos los prerequisites estén completados al 75%
    return module.prerequisites.every(prereqId => {
      const prereqProgress = calculateModuleProgress(prereqId);
      return prereqProgress >= 75;
    });
  }, [calculateModuleProgress]);

  // Obtener el próximo módulo disponible - memoizado
  const getNextAvailableModule = useMemo(() => {
    const allModules = Object.values(curriculumData.modules).sort((a, b) => {
      const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      if (levelOrder[a.level] !== levelOrder[b.level]) {
        return levelOrder[a.level] - levelOrder[b.level];
      }
      return a.order - b.order;
    });

    return allModules.find(module => {
      const progress = calculateModuleProgress(module.id);
      return progress > 0 && progress < 100 && isModuleAvailable(module.id);
    });
  }, [calculateModuleProgress, isModuleAvailable]);

  // Obtener progreso por nivel
  const levelProgress = getLevelProgress(Array.from(completedLessons));

  // Estado para datos del dashboard
  const [dashboardData, setDashboardData] = useState({
    streak: 7, // días consecutivos
    badges: ['first-lesson', 'week-streak', 'module-complete'],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // hace 30 días
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // hace 2 horas
    weeklyProgress: [
      { week: 'Sem 1', lessons: 3 },
      { week: 'Sem 2', lessons: 7 },
      { week: 'Sem 3', lessons: 5 },
      { week: 'Sem 4', lessons: 12 }
    ]
  });

  // Calcular estadísticas globales - memoizado
  const calculateGlobalStats = useMemo(() => {
    const totalModules = Object.keys(curriculumData.modules).length;
    const completedModules = Object.keys(curriculumData.modules).filter(moduleId => 
      calculateModuleProgress(moduleId) === 100
    ).length;
    const totalLessons = Object.values(curriculumData.modules).reduce((acc, module) => 
      acc + (module.lessons?.length || 0), 0
    );
    const completedLessonsCount = completedLessons.size;
    
    return {
      totalCompletion: totalModules > 0 ? (completedModules / totalModules) * 100 : 0,
      totalTimeSpent: timeSpent, // en minutos
      totalLessons: totalLessons,
      completedLessons: completedLessonsCount,
      lessonsCompletion: totalLessons > 0 ? (completedLessonsCount / totalLessons) * 100 : 0
    };
  }, [calculateModuleProgress, completedLessons, timeSpent]);

  // Obtener módulo actual del usuario
  const nextModule = getNextAvailableModule;

  // Handlers memoizados
  const handleSectionClick = useCallback((sectionId) => {
    // Marcar la primera lección como completada cuando se accede
    const module = curriculumData.modules[sectionId];
    if (module && module.lessons && module.lessons.length > 0) {
      markLessonComplete(`${sectionId}-${module.lessons[0].id}`);
    }
    // Actualizar tiempo gastado
    updateTimeSpent(1);
    // Aquí iría la navegación a la lección específica
    console.log(`Navegando a la sección: ${sectionId}`);
  }, [markLessonComplete, updateTimeSpent]);

  const handleContinueLearning = useCallback(() => {
    if (nextModule) {
      handleSectionClick(nextModule.id);
    }
  }, [nextModule, handleSectionClick]);

  const handleOpenFlashcards = useCallback(() => {
    setFlashcardSystemOpen(true);
  }, []);

  // Generar recomendaciones inteligentes - memoizado
  const generateRecommendations = useMemo(() => {
    const recommendations = [];
    
    // Próxima lección óptima
    if (nextModule) {
      recommendations.push({
        type: 'next-optimal',
        title: 'Próxima Lección Óptima',
        description: `Continúa con ${nextModule.title}`,
        icon: <NavigateNext />,
        action: handleContinueLearning,
        priority: 'high'
      });
    }

    // Módulos débiles (simulado - en realidad vendría de quiz scores del módulo evaluation)
    const weakModules = Object.values(curriculumData.modules)
      .filter(module => {
        const progress = calculateModuleProgress(module.id);
        return progress > 0 && progress < 50; // módulos iniciados pero no completados
      })
      .slice(0, 2);

    weakModules.forEach(module => {
      recommendations.push({
        type: 'weak-module',
        title: 'Módulo para Reforzar',
        description: `${module.title} - ${calculateModuleProgress(module.id).toFixed(0)}% completado`,
        icon: <TrendingDown />,
        action: () => handleSectionClick(module.id),
        priority: 'medium'
      });
    });

    // Contenido para repasar (basado en tiempo transcurrido)
    const modulesToReview = Object.values(curriculumData.modules)
      .filter(module => calculateModuleProgress(module.id) === 100)
      .slice(0, 1);

    modulesToReview.forEach(module => {
      recommendations.push({
        type: 'review',
        title: 'Contenido para Repasar',
        description: `Repasa conceptos de ${module.title}`,
        icon: <Refresh />,
        action: () => handleSectionClick(module.id),
        priority: 'low'
      });
    });

    return recommendations.slice(0, 3); // Máximo 3 recomendaciones
  }, [nextModule, calculateModuleProgress, handleContinueLearning, handleSectionClick]);

  const globalStats = calculateGlobalStats;
  const recommendations = generateRecommendations;

  // Generar secciones dinámicamente desde curriculum data - memoizado
  const learningSections = useMemo(() => {
    // Iconos por nivel
    const getLevelIcon = (level) => {
      switch (level) {
        case 'beginner': return <Biotech sx={{ fontSize: 40, color: theme.palette.primary.main }} />;
        case 'intermediate': return <Settings sx={{ fontSize: 40, color: theme.palette.secondary.main }} />;
        case 'advanced': return <MonitorHeart sx={{ fontSize: 40, color: theme.palette.success.main }} />;
        default: return <School sx={{ fontSize: 40, color: theme.palette.info.main }} />;
      }
    };

    // Colores por nivel
    const getLevelColor = (level) => {
      switch (level) {
        case 'beginner': return theme.palette.primary.main;
        case 'intermediate': return theme.palette.secondary.main;
        case 'advanced': return theme.palette.success.main;
        default: return theme.palette.info.main;
      }
    };

    return Object.values(curriculumData.modules)
      .sort((a, b) => {
        const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        if (levelOrder[a.level] !== levelOrder[b.level]) {
          return levelOrder[a.level] - levelOrder[b.level];
        }
        return a.order - b.order;
      })
      .map(module => {
        const progress = calculateModuleProgress(module.id);
        const available = isModuleAvailable(module.id);
        
        return {
          id: module.id,
          title: module.title,
          description: module.description || `${module.learningObjectives?.[0] || 'Módulo de aprendizaje'}`,
          icon: getLevelIcon(module.level),
          progress: progress,
          level: module.level,
          duration: module.duration,
          estimatedTime: module.estimatedTime,
          difficulty: module.difficulty,
          topics: module.learningObjectives || [],
          available: available,
          color: getLevelColor(module.level),
          prerequisites: module.prerequisites || [],
          bloomLevel: module.bloomLevel
        };
      });
  }, [calculateModuleProgress, isModuleAvailable, theme.palette]);


  const toggleFavorite = useCallback((moduleId) => {
    setFavoriteModules(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(moduleId)) {
        newFavorites.delete(moduleId);
      } else {
        newFavorites.add(moduleId);
      }
      return newFavorites;
    });
  }, []);

  // Funciones auxiliares memoizadas
  const getModuleStatus = useCallback((section) => {
    if (section.progress === 100) return 'completed';
    if (section.progress > 0) return 'in-progress';
    if (section.available) return 'available';
    return 'locked';
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'completed': return <CheckCircle sx={{ color: '#4CAF50' }} />;
      case 'in-progress': return <TrendingUp sx={{ color: '#FF9800' }} />;
      case 'available': return <LockOpen sx={{ color: '#2196F3' }} />;
      case 'locked': return <Lock sx={{ color: '#9E9E9E' }} />;
      default: return <RadioButtonUnchecked />;
    }
  }, []);

  const getTooltipMessage = useCallback((section) => {
    if (section.available) {
      return `Disponible - ${section.progress.toFixed(0)}% completado`;
    }
    
    const incompletePrereqs = section.prerequisites.filter(prereqId => {
      const prereqProgress = calculateModuleProgress(prereqId);
      return prereqProgress < 75;
    });
    
    if (incompletePrereqs.length > 0) {
      const prereqTitles = incompletePrereqs.map(id => 
        curriculumData.modules[id]?.title || id
      );
      return `Completa al 75%: ${prereqTitles.join(', ')}`;
    }
    
    return 'Módulo bloqueado';
  }, [calculateModuleProgress]);

  const getButtonText = useCallback((section) => {
    if (!section.available) return 'Próximamente';
    return section.progress > 0 ? 'Continuar' : 'Comenzar';
  }, []);

  const getButtonIcon = useCallback((section) => {
    if (!section.available) return null;
    return section.progress > 0 ? <Refresh /> : <PlayArrow />;
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
          <Link 
            underline="hover" 
            color="text.secondary"
            href="/"
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: '#6c757d',
              '&:hover': { color: '#495057' }
            }}
          >
            <Home sx={{ mr: 0.5 }} fontSize="inherit" />
            Inicio
          </Link>
          <Typography 
            color="text.primary"
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: '#343a40',
              fontWeight: 500
            }}
          >
            <School sx={{ mr: 0.5 }} fontSize="inherit" />
            Módulo de Enseñanza
          </Typography>
        </Breadcrumbs>

        <Typography 
          variant={isMobile ? "h4" : "h3"} 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 700,
            color: '#2c3e50',
            mb: 2,
            fontSize: isMobile ? '1.8rem' : '2.2rem'
          }}
        >
          Módulo de Enseñanza - Mecánica Ventilatoria
        </Typography>

        <Typography 
          variant="body1" 
          sx={{ 
            mb: 4, 
            maxWidth: '800px',
            color: '#495057',
            fontSize: '1.1rem',
            lineHeight: 1.6
          }}
        >
          Aprende los fundamentos de la ventilación mecánica a través de un programa estructurado 
          que combina teoría, práctica y simulaciones interactivas.
        </Typography>

        {/* Sección Continuar Aprendiendo - Destacada */}
        <ClientOnly fallback={
          <Paper elevation={2} sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Continuar Aprendiendo
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
              Comienza tu viaje de aprendizaje
            </Typography>
            <Button variant="contained" size="large" disabled>
              Comenzar
            </Button>
          </Paper>
        }>
          {nextModule && (
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                mb: 4, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Patrón de fondo */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '200px',
                height: '100%',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                transform: 'translateX(50%)'
              }} />
              
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
                    Continuar Aprendiendo
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
                    {nextModule.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
                    {nextModule.description || nextModule.learningObjectives?.[0]}
                  </Typography>
                  
                  {/* Progreso específico del módulo */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Progreso del módulo
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {calculateModuleProgress(nextModule.id).toFixed(0)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={calculateModuleProgress(nextModule.id)}
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#fff',
                          borderRadius: 4,
                        }
                      }}
                    />
                  </Box>

                  {/* Metadatos del módulo */}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      icon={<AccessTime />}
                      label={`${nextModule.estimatedTime || Math.round(nextModule.duration / 60)}h`}
                      size="small"
                      sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                    <Chip 
                      icon={<Star />}
                      label={nextModule.difficulty}
                      size="small"
                      sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                    <Chip 
                      icon={<Person />}
                      label={curriculumData.levels.find(l => l.id === nextModule.level)?.title}
                      size="small"
                      sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleContinueLearning}
                    startIcon={<PlayCircleOutline />}
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '2px solid rgba(255,255,255,0.3)',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        transform: 'translateY(-2px)',
                      }
                    }}
                  >
                    Continuar desde {nextModule.lessons?.[0]?.title || 'Lección 1'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}
        </ClientOnly>

        {/* Dashboard de Estadísticas - Cuatro Cuadrantes */}
        <ClientOnly fallback={
          <Paper elevation={2} sx={{ p: 3, mb: 4, backgroundColor: '#f8f9fa' }}>
            <Typography variant="h5" sx={{ mb: 3, color: '#2c3e50', fontWeight: 600 }}>
              📊 Estadísticas de Aprendizaje
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d' }}>
              Cargando estadísticas...
            </Typography>
          </Paper>
        }>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              mb: 4, 
              backgroundColor: '#ffffff',
              border: '1px solid #e3f2fd',
              borderRadius: 3
            }}
          >
            <Typography variant="h5" sx={{ 
              mb: 3, 
              color: '#1976d2', 
              fontWeight: 700,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1
            }}>
              <Assessment sx={{ fontSize: 28 }} />
              Dashboard de Aprendizaje
            </Typography>

            <Grid container spacing={3}>
              {/* Cuadrante Superior Izquierdo - Sistema de Repetición Espaciada */}
              <Grid item xs={12} md={6}>
                <FlashcardDashboard onOpenFlashcards={handleOpenFlashcards} />
              </Grid>

              {/* Cuadrante Superior Derecho - Sistema de Racha */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  height: '100%', 
                  backgroundColor: '#fff3e0',
                  border: '2px solid #ffcc02',
                  borderRadius: 2
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ 
                      color: '#f57c00', 
                      fontWeight: 600, 
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <LocalFireDepartment sx={{ fontSize: 20 }} />
                      Sistema de Racha
                    </Typography>
                    
                    <Stack spacing={2}>
                      {/* Racha Actual */}
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="h2" sx={{ 
                          color: '#f57c00', 
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1
                        }}>
                          <LocalFireDepartment sx={{ fontSize: 48 }} />
                          {dashboardData.streak}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#f57c00', fontWeight: 600 }}>
                          Días Consecutivos
                        </Typography>
                      </Box>

                      {/* Próximo Milestone */}
                      <Box sx={{ 
                        p: 2,
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        borderRadius: 2,
                        textAlign: 'center'
                      }}>
                        <Typography variant="body2" sx={{ color: '#f57c00', fontWeight: 600, mb: 1 }}>
                          Próximo Milestone
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#f57c00', fontWeight: 700 }}>
                          30 días
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(dashboardData.streak / 30) * 100}
                          sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            backgroundColor: '#ffcc02',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: '#f57c00',
                              borderRadius: 3,
                            }
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#f57c00', mt: 1, display: 'block' }}>
                          {30 - dashboardData.streak} días restantes
                        </Typography>
                      </Box>

                      {/* Badges Ganados */}
                      <Box>
                        <Typography variant="body2" sx={{ color: '#f57c00', fontWeight: 600, mb: 1 }}>
                          Badges Ganados
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {dashboardData.badges.map((badge, index) => (
                            <Tooltip key={index} title={
                              badge === 'first-lesson' ? 'Primera Lección Completada' :
                              badge === 'week-streak' ? 'Racha de 7 Días' :
                              'Módulo Completado'
                            } arrow>
                              <Avatar sx={{ 
                                width: 32, 
                                height: 32, 
                                backgroundColor: '#f57c00',
                                border: '2px solid #ffcc02'
                              }}>
                                <EmojiEvents sx={{ fontSize: 18, color: 'white' }} />
                              </Avatar>
                            </Tooltip>
                          ))}
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Cuadrante Superior Derecho - Sistema de Racha */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  height: '100%', 
                  backgroundColor: '#fff3e0',
                  border: '2px solid #ffcc02',
                  borderRadius: 2
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ 
                      color: '#f57c00', 
                      fontWeight: 600, 
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <LocalFireDepartment sx={{ fontSize: 20 }} />
                      Sistema de Racha
                    </Typography>
                    
                    <Stack spacing={2}>
                      {/* Racha Actual */}
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="h2" sx={{ 
                          color: '#f57c00', 
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1
                        }}>
                          <LocalFireDepartment sx={{ fontSize: 48 }} />
                          {dashboardData.streak}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#f57c00', fontWeight: 600 }}>
                          Días Consecutivos
                        </Typography>
                      </Box>

                      {/* Próximo Milestone */}
                      <Box sx={{ 
                        p: 2,
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        borderRadius: 2,
                        textAlign: 'center'
                      }}>
                        <Typography variant="body2" sx={{ color: '#f57c00', fontWeight: 600, mb: 1 }}>
                          Próximo Milestone
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#f57c00', fontWeight: 700 }}>
                          30 días
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(dashboardData.streak / 30) * 100}
                          sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            backgroundColor: '#ffcc02',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: '#f57c00',
                              borderRadius: 3,
                            }
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#f57c00', mt: 1, display: 'block' }}>
                          {30 - dashboardData.streak} días restantes
                        </Typography>
                      </Box>

                      {/* Badges Ganados */}
                      <Box>
                        <Typography variant="body2" sx={{ color: '#f57c00', fontWeight: 600, mb: 1 }}>
                          Badges Ganados
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {dashboardData.badges.map((badge, index) => (
                            <Tooltip key={index} title={
                              badge === 'first-lesson' ? 'Primera Lección Completada' :
                              badge === 'week-streak' ? 'Racha de 7 Días' :
                              'Módulo Completado'
                            } arrow>
                              <Avatar sx={{ 
                                width: 32, 
                                height: 32, 
                                backgroundColor: '#f57c00',
                                border: '2px solid #ffcc02'
                              }}>
                                <EmojiEvents sx={{ fontSize: 18, color: 'white' }} />
                              </Avatar>
                            </Tooltip>
                          ))}
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Cuadrante Inferior Izquierdo - Gráfica de Progreso Temporal */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  height: '100%', 
                  backgroundColor: '#e8f5e8',
                  border: '2px solid #c8e6c9',
                  borderRadius: 2
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ 
                      color: '#388e3c', 
                      fontWeight: 600, 
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <TrendingUp sx={{ fontSize: 20 }} />
                      Progreso Temporal
                    </Typography>
                    
                    {/* Gráfica Simple (sin librería externa) */}
                    <Box sx={{ height: 200, position: 'relative', mb: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'end', 
                        justifyContent: 'space-between',
                        height: '100%',
                        p: 2
                      }}>
                        {dashboardData.weeklyProgress.map((week, index) => (
                          <Box key={index} sx={{ textAlign: 'center', flex: 1 }}>
                            <Box sx={{
                              height: `${(week.lessons / 12) * 150}px`,
                              backgroundColor: '#4caf50',
                              borderRadius: '4px 4px 0 0',
                              margin: '0 4px',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'end',
                              justifyContent: 'center'
                            }}>
                              <Typography variant="caption" sx={{ 
                                color: 'white', 
                                fontWeight: 600,
                                mb: 1
                              }}>
                                {week.lessons}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ 
                              color: '#388e3c', 
                              fontWeight: 600,
                              mt: 1,
                              display: 'block'
                            }}>
                              {week.week}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" sx={{ 
                      color: '#388e3c', 
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}>
                      Lecciones completadas por semana (último mes)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Cuadrante Inferior Derecho - Recomendaciones Inteligentes */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  height: '100%', 
                  backgroundColor: '#f3e5f5',
                  border: '2px solid #e1bee7',
                  borderRadius: 2
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ 
                      color: '#7b1fa2', 
                      fontWeight: 600, 
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Psychology sx={{ fontSize: 20 }} />
                      Recomendaciones Inteligentes
                    </Typography>
                    
                    <Stack spacing={2}>
                      {recommendations.map((rec, index) => (
                        <Box 
                          key={index}
                          sx={{ 
                            p: 2,
                            backgroundColor: 'rgba(255,255,255,0.7)',
                            borderRadius: 2,
                            border: '1px solid #e1bee7',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                            }
                          }}
                          onClick={rec.action}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ 
                              width: 32, 
                              height: 32, 
                              backgroundColor: rec.priority === 'high' ? '#e53935' :
                                             rec.priority === 'medium' ? '#ff9800' : '#2196f3'
                            }}>
                              {rec.icon}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ 
                                color: '#7b1fa2', 
                                fontWeight: 600,
                                mb: 0.5
                              }}>
                                {rec.title}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                color: '#7b1fa2',
                                display: 'block'
                              }}>
                                {rec.description}
                              </Typography>
                            </Box>
                            <Lightbulb sx={{ color: '#7b1fa2', fontSize: 20 }} />
                          </Box>
                        </Box>
                      ))}
                      
                      {recommendations.length === 0 && (
                        <Box sx={{ 
                          p: 3,
                          textAlign: 'center',
                          backgroundColor: 'rgba(255,255,255,0.7)',
                          borderRadius: 2
                        }}>
                          <AutoAwesome sx={{ fontSize: 32, color: '#7b1fa2', mb: 1 }} />
                          <Typography variant="body2" sx={{ color: '#7b1fa2' }}>
                            ¡Excelente progreso! Continúa aprendiendo para obtener recomendaciones personalizadas.
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </ClientOnly>

        {/* Información de progreso de la sesión - solo en cliente */}
        <ClientOnly fallback={
          <Box sx={{ 
            display: 'flex', 
            gap: 3, 
            mb: 3,
            flexWrap: 'wrap'
          }}>
            <Box sx={{ 
              backgroundColor: '#e3f2fd', 
              padding: 2, 
              borderRadius: 2,
              border: '1px solid #bbdefb'
            }}>
              <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 600 }}>
                Tiempo en sesión: 0 min
              </Typography>
            </Box>
            <Box sx={{ 
              backgroundColor: '#e8f5e8', 
              padding: 2, 
              borderRadius: 2,
              border: '1px solid #c8e6c9'
            }}>
              <Typography variant="body2" sx={{ color: '#388e3c', fontWeight: 600 }}>
                Lecciones completadas: 0
              </Typography>
            </Box>
          </Box>
        }>
          <Box sx={{ 
            display: 'flex', 
            gap: 3, 
            mb: 3,
            flexWrap: 'wrap'
          }}>
            <Box sx={{ 
              backgroundColor: '#e3f2fd', 
              padding: 2, 
              borderRadius: 2,
              border: '1px solid #bbdefb'
            }}>
              <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 600 }}>
                Tiempo en sesión: {timeSpent} min
              </Typography>
            </Box>
            <Box sx={{ 
              backgroundColor: '#e8f5e8', 
              padding: 2, 
              borderRadius: 2,
              border: '1px solid #c8e6c9'
            }}>
              <Typography variant="body2" sx={{ color: '#388e3c', fontWeight: 600 }}>
                Lecciones completadas: {completedLessons.size}
              </Typography>
            </Box>
          </Box>
        </ClientOnly>

        {/* Mapa de Progreso Visual - Camino de Aprendizaje */}
        <Paper 
          elevation={2}
          sx={{ 
            p: 4, 
            mb: 4,
            backgroundColor: '#ffffff',
            border: '1px solid #e9ecef',
            borderRadius: 3
          }}
        >
          <Typography variant="h5" sx={{ color: '#2c3e50', fontWeight: 700, mb: 3, textAlign: 'center' }}>
            🗺️ Tu Camino de Aprendizaje
          </Typography>
          
          {/* Stepper visual por niveles */}
          <Stepper orientation="vertical" sx={{ mb: 3 }}>
            {curriculumData.levels.map((level, levelIndex) => {
              const levelModules = getModulesByLevel(level.id);
              const levelProg = levelProgress[level.id] || { total: 0, completed: 0, percentage: 0 };
              
              return (
                <Step key={level.id} active={levelProg.percentage > 0} completed={levelProg.percentage === 100}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          backgroundColor: level.color,
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {levelProg.percentage === 100 ? '✓' : levelProg.completed}
                      </Avatar>
                    )}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                        {level.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6c757d', mb: 1 }}>
                        {level.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" sx={{ color: level.color, fontWeight: 600 }}>
                          {levelProg.completed}/{levelProg.total} módulos completados
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={levelProg.percentage} 
                          sx={{ 
                            flex: 1,
                            height: 6, 
                            borderRadius: 3,
                            backgroundColor: '#e9ecef',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: level.color,
                              borderRadius: 3,
                            }
                          }}
                        />
                        <Typography variant="body2" sx={{ color: level.color, fontWeight: 600, minWidth: '40px' }}>
                          {levelProg.percentage.toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                  </StepLabel>
                  
                  <StepContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      {levelModules.map((module, moduleIndex) => {
                        const moduleProgress = calculateModuleProgress(module.id);
                        const available = isModuleAvailable(module.id);
                        const status = getModuleStatus({
                          progress: moduleProgress,
                          available: available
                        });
                        
                        return (
                          <Grid item xs={12} sm={6} md={4} key={module.id}>
                            <Tooltip title={getTooltipMessage({
                              available: available,
                              prerequisites: module.prerequisites || [],
                              progress: moduleProgress
                            })} arrow placement="top">
                              <Card
                                sx={{
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  cursor: available ? 'pointer' : 'default',
                                  opacity: available ? 1 : 0.6,
                                  border: status === 'available' ? '2px solid #2196F3' : 
                                         status === 'in-progress' ? '2px solid #FF9800' :
                                         status === 'completed' ? '2px solid #4CAF50' : '1px solid #e0e0e0',
                                  borderRadius: 2,
                                  position: 'relative',
                                  transition: 'all 0.3s ease',
                                  '&:hover': available ? {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                                  } : {}
                                }}
                                onClick={() => available && handleSectionClick(module.id)}
                              >
                                {/* Estado del módulo */}
                                <Box sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  zIndex: 1
                                }}>
                                  {getStatusIcon(status)}
                                </Box>

                                {/* Botón de favorito */}
                                <Box sx={{
                                  position: 'absolute',
                                  top: 8,
                                  left: 8,
                                  zIndex: 1
                                }}>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(module.id);
                                    }}
                                    sx={{
                                      backgroundColor: 'rgba(255,255,255,0.9)',
                                      '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                                    }}
                                  >
                                    {favoriteModules.has(module.id) ? 
                                      <Bookmark sx={{ color: '#FF9800', fontSize: 16 }} /> : 
                                      <BookmarkBorder sx={{ color: '#666', fontSize: 16 }} />
                                    }
                                  </IconButton>
                                </Box>

                                <CardContent sx={{ flexGrow: 1, pt: 4 }}>
                                  <Typography variant="h6" sx={{ 
                                    fontWeight: 600, 
                                    mb: 1,
                                    color: available ? '#2c3e50' : '#9e9e9e'
                                  }}>
                                    {module.title}
                                  </Typography>
                                  
                                  <Typography variant="body2" sx={{ 
                                    color: '#6c757d', 
                                    mb: 2,
                                    fontSize: '0.85rem',
                                    lineHeight: 1.4
                                  }}>
                                    {module.learningObjectives?.[0] || module.description}
                                  </Typography>

                                  {/* Progreso del módulo */}
                                  <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                      <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                                        Progreso
                                      </Typography>
                                      <Typography variant="caption" sx={{ 
                                        color: status === 'completed' ? '#4CAF50' : 
                                               status === 'in-progress' ? '#FF9800' : '#9e9e9e',
                                        fontWeight: 600,
                                        fontSize: '0.75rem'
                                      }}>
                                        {moduleProgress.toFixed(0)}%
                                      </Typography>
                                    </Box>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={moduleProgress}
                                      sx={{ 
                                        height: 4, 
                                        borderRadius: 2,
                                        backgroundColor: '#e0e0e0',
                                        '& .MuiLinearProgress-bar': {
                                          backgroundColor: status === 'completed' ? '#4CAF50' : 
                                                         status === 'in-progress' ? '#FF9800' : '#9e9e9e',
                                          borderRadius: 2,
                                        }
                                      }}
                                    />
                                  </Box>

                                  {/* Metadatos */}
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip 
                                      label={module.difficulty}
                                      size="small"
                                      sx={{ 
                                        fontSize: '0.7rem',
                                        height: 20,
                                        backgroundColor: available ? '#e3f2fd' : '#f5f5f5',
                                        color: available ? '#1976d2' : '#9e9e9e'
                                      }}
                                    />
                                    <Chip 
                                      icon={<AccessTime sx={{ fontSize: 12 }} />}
                                      label={`${Math.round(module.duration / 60)}h`}
                                      size="small"
                                      sx={{ 
                                        fontSize: '0.7rem',
                                        height: 20,
                                        backgroundColor: available ? '#e8f5e8' : '#f5f5f5',
                                        color: available ? '#388e3c' : '#9e9e9e'
                                      }}
                                    />
                                  </Box>
                                </CardContent>

                                <CardActions sx={{ p: 2, pt: 0 }}>
                                  <Button
                                    variant={status === 'completed' ? 'outlined' : 'contained'}
                                    fullWidth
                                    disabled={!available}
                                    startIcon={status === 'completed' ? <CheckCircle /> : 
                                             status === 'in-progress' ? <Refresh /> : <PlayArrow />}
                                    sx={{
                                      fontSize: '0.85rem',
                                      fontWeight: 600,
                                      backgroundColor: available ? level.color : 'transparent',
                                      borderColor: available ? level.color : '#e0e0e0',
                                      color: available ? '#fff' : '#9e9e9e',
                                      '&:hover': available ? {
                                        backgroundColor: level.color,
                                        filter: 'brightness(0.9)'
                                      } : {}
                                    }}
                                  >
                                    {status === 'completed' ? 'Completado' :
                                     status === 'in-progress' ? 'Continuar' :
                                     available ? 'Comenzar' : 'Bloqueado'}
                                  </Button>
                                </CardActions>
                              </Card>
                            </Tooltip>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>
        </Paper>
      </Box>


      {/* Información Adicional */}
      <Paper 
        elevation={0} 
        sx={{ 
          mt: 4, 
          p: 4, 
          backgroundColor: '#ffffff',
          border: '1px solid #e9ecef',
          borderRadius: 3,
          borderLeft: '4px solid #17a2b8'
        }}
      >
        <Typography 
          variant="h5" 
          gutterBottom 
          sx={{ 
            color: '#17a2b8',
            fontWeight: 700,
            mb: 2
          }}
        >
          💡 Sobre este módulo
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#495057',
            fontSize: '1rem',
            lineHeight: 1.6
          }}
        >
          Este módulo está diseñado para proporcionar una comprensión integral de la ventilación mecánica, 
          desde los fundamentos fisiológicos hasta la aplicación clínica práctica. Cada sección incluye 
          contenido teórico, casos clínicos y simulaciones interactivas para reforzar el aprendizaje.
        </Typography>
      </Paper>

      {/* Sistema de Flashcards */}
      <FlashcardSystem
        isOpen={flashcardSystemOpen}
        onClose={() => setFlashcardSystemOpen(false)}
        autoGenerateFromLesson={false}
      />
    </Container>
  );
};

export default TeachingModule;

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
} from '@mui/material';
import {
  Lock,
  LockOpen,
  PlayCircle,
  CheckCircle,
  ExpandMore,
  RadioButtonUnchecked,
  CheckCircleOutline,
  Schedule,
  MenuBook,
  EmojiEvents,
  TrendingUp,
  Rocket,
} from '@mui/icons-material';

/**
 * ProgressTree Component
 *
 * Componente principal para visualizar el árbol de progreso del usuario en VentyLab.
 * Muestra todos los módulos y lecciones del curriculum con indicadores de estado,
 * progreso y accesibilidad basados en prerequisitos.
 *
 * @component
 * @param {Object} props - Props del componente
 * @param {Object} props.modules - Objeto con los módulos del curriculum desde curriculumData
 * @param {Object} props.userProgress - Objeto con el progreso del usuario desde LearningProgressContext
 * @param {Function} props.onModuleClick - Callback para manejar click en módulo
 * @param {Function} props.onLessonClick - Callback para manejar click en lección
 * @returns {JSX.Element} Árbol visual interactivo de progreso
 */
const ProgressTree = ({ modules, userProgress, onModuleClick, onLessonClick }) => {
  // Estado para controlar qué módulos están expandidos en el accordion
  const [expandedModules, setExpandedModules] = useState({});

  /**
   * Verifica si todos los prerequisitos de un módulo han sido completados
   *
   * @param {Object} module - Módulo a verificar
   * @param {Object} progress - Objeto de progreso del usuario
   * @returns {boolean} true si todos los prerequisitos están completados al 100%
   */
  const arePrerequisitesMet = (module, progress) => {
    if (!module.prerequisites || module.prerequisites.length === 0) {
      return true;
    }

    return module.prerequisites.every(prereqId => {
      const prereqProgress = progress[prereqId];
      return prereqProgress && prereqProgress.progress === 100;
    });
  };

  /**
   * Calcula el progreso de un módulo basado en lecciones completadas
   *
   * @param {Object} module - Módulo a calcular
   * @param {Object} progress - Objeto de progreso del usuario
   * @returns {number} Porcentaje de progreso (0-100)
   */
  const calculateModuleProgress = (module, progress) => {
    if (!module.lessons || module.lessons.length === 0) {
      return 0;
    }

    const completedLessons = module.lessons.filter(lesson => {
      const lessonProgress = progress?.lessons?.[lesson.id];
      return lessonProgress?.completed === true;
    }).length;

    return Math.round((completedLessons / module.lessons.length) * 100);
  };

  /**
   * Calcula el tiempo total estimado de un módulo
   *
   * @param {Object} module - Módulo a calcular
   * @returns {number} Tiempo total en minutos
   */
  const calculateModuleDuration = (module) => {
    if (!module.lessons || module.lessons.length === 0) {
      return 0;
    }

    return module.lessons.reduce((total, lesson) => {
      return total + (lesson.estimatedTime || 0);
    }, 0);
  };

  /**
   * Determina el estado de un módulo
   *
   * @param {Object} module - Módulo a evaluar
   * @param {number} progress - Porcentaje de progreso del módulo
   * @param {Object} userProgress - Objeto de progreso del usuario
   * @returns {string} Estado: 'locked', 'available', 'in_progress', 'completed'
   */
  const getModuleStatus = (module, progress, userProgress) => {
    if (!arePrerequisitesMet(module, userProgress)) {
      return 'locked';
    }
    if (progress === 100) {
      return 'completed';
    }
    if (progress > 0) {
      return 'in_progress';
    }
    return 'available';
  };

  /**
   * Obtiene el icono apropiado según el estado del módulo
   *
   * @param {string} status - Estado del módulo
   * @returns {JSX.Element} Icono de Material UI
   */
  const getStatusIcon = (status) => {
    const iconProps = { fontSize: 'large' };

    switch (status) {
      case 'locked':
        return <Lock {...iconProps} sx={{ color: 'grey.500' }} />;
      case 'available':
        return <LockOpen {...iconProps} sx={{ color: 'info.main' }} />;
      case 'in_progress':
        return <PlayCircle {...iconProps} sx={{ color: 'warning.main' }} />;
      case 'completed':
        return <CheckCircle {...iconProps} sx={{ color: 'success.main' }} />;
      default:
        return <Lock {...iconProps} sx={{ color: 'grey.500' }} />;
    }
  };

  /**
   * Obtiene el color del chip de dificultad
   *
   * @param {string} difficulty - Nivel de dificultad
   * @returns {string} Color del chip: 'success', 'warning', 'error'
   */
  const getDifficultyColor = (difficulty) => {
    const difficultyLower = difficulty?.toLowerCase() || '';

    if (difficultyLower === 'beginner') return 'success';
    if (difficultyLower === 'intermediate') return 'warning';
    if (difficultyLower === 'advanced') return 'error';

    return 'default';
  };

  /**
   * Maneja la expansión/colapso de un accordion de módulo
   *
   * @param {string} moduleId - ID del módulo
   * @returns {Function} Handler del evento
   */
  const handleAccordionChange = (moduleId) => (event, isExpanded) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: isExpanded
    }));
  };

  // Calcular estadísticas globales
  const globalStats = useMemo(() => {
    const modulesArray = Object.values(modules);
    // Use data-driven count - modulesArray.length is already correct
    const totalModules = modulesArray.length;

    let completedModules = 0;
    let totalLessons = 0;
    let completedLessons = 0;
    let totalTime = 0;

    modulesArray.forEach(module => {
      const moduleProgress = calculateModuleProgress(module, userProgress);

      if (moduleProgress === 100) {
        completedModules++;
      }

      totalLessons += module.lessons?.length || 0;
      totalTime += calculateModuleDuration(module);

      module.lessons?.forEach(lesson => {
        const lessonProgress = userProgress?.lessons?.[lesson.id];
        if (lessonProgress?.completed) {
          completedLessons++;
        }
      });
    });

    const globalProgress = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

    return {
      totalModules,
      completedModules,
      globalProgress,
      totalTime,
      totalLessons,
      completedLessons,
    };
  }, [modules, userProgress]);

  // Verificar si el usuario tiene algún progreso
  const hasProgress = globalStats.completedLessons > 0;

  /**
   * Maneja el click en una lección
   *
   * @param {Object} module - Módulo padre
   * @param {Object} lesson - Lección clickeada
   */
  const handleLessonClick = (module, lesson) => {
    const moduleProgress = calculateModuleProgress(module, userProgress);
    const status = getModuleStatus(module, moduleProgress, userProgress);

    // Solo permitir click si el módulo está disponible
    if (status !== 'locked') {
      onLessonClick(module, lesson);
    }
  };

  /**
   * Renderiza el estado inicial cuando no hay progreso
   */
  const renderEmptyState = () => {
    const firstModule = Object.values(modules)[0];

    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 3,
        }}
      >
        <Rocket sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          ¡Comienza tu Aventura de Aprendizaje!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
          Estás a punto de embarcarte en un emocionante viaje de descubrimiento.
          Cada módulo te acercará más a dominar nuevas habilidades y conocimientos.
        </Typography>
        {firstModule && (
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayCircle />}
            onClick={() => onModuleClick(firstModule)}
            sx={{ px: 4, py: 1.5 }}
          >
            Comenzar Primer Módulo
          </Button>
        )}
      </Box>
    );
  };

  // Si no hay progreso y no hay módulos, mostrar estado vacío
  if (!hasProgress && Object.keys(modules).length === 0) {
    return renderEmptyState();
  }

  return (
    <Box sx={{ width: '100%', p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Encabezado con título y estadísticas globales */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 700,
            mb: 1,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Tu Camino de Aprendizaje
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Explora los módulos, completa las lecciones y alcanza tus objetivos educativos
        </Typography>

        {/* Tarjetas de estadísticas globales */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <MenuBook sx={{ mr: 1 }} />
                  <Typography variant="h6">Módulos</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {globalStats.completedModules}/{globalStats.totalModules}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Completados
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ mr: 1 }} />
                  <Typography variant="h6">Progreso Global</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {globalStats.globalProgress}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {globalStats.completedLessons} de {globalStats.totalLessons} lecciones
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Schedule sx={{ mr: 1 }} />
                  <Typography variant="h6">Tiempo Total</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {Math.round(globalStats.totalTime / 60)}h
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {globalStats.totalTime} minutos
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EmojiEvents sx={{ mr: 1 }} />
                  <Typography variant="h6">Logros</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {globalStats.completedModules}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Módulos dominados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Grid de módulos */}
      <Grid container spacing={3}>
        {Object.values(modules).map((module) => {
          const moduleProgress = calculateModuleProgress(module, userProgress);
          const status = getModuleStatus(module, moduleProgress, userProgress);
          const duration = calculateModuleDuration(module);
          const isExpanded = expandedModules[module.id] || false;

          return (
            <Grid item xs={12} md={6} lg={4} key={module.id}>
              <Accordion
                expanded={isExpanded}
                onChange={handleAccordionChange(module.id)}
                disabled={status === 'locked'}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  '&:before': { display: 'none' },
                  boxShadow: 2,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: status !== 'locked' ? 'translateY(-4px)' : 'none',
                    boxShadow: status !== 'locked' ? 6 : 2,
                  },
                  opacity: status === 'locked' ? 0.6 : 1,
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      my: 2,
                    },
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    {/* Icono de estado y título */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ mr: 2, mt: 0.5 }}>
                        {getStatusIcon(status)}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {module.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {module.description}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Chips de información */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip
                        label={module.difficulty || 'Beginner'}
                        color={getDifficultyColor(module.difficulty)}
                        size="small"
                      />
                      <Chip
                        icon={<Schedule />}
                        label={`${duration} min`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${module.lessons?.length || 0} lecciones`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {/* Barra de progreso */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Progreso
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {moduleProgress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={moduleProgress}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            background: moduleProgress === 100
                              ? 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)'
                              : moduleProgress > 0
                              ? 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%)'
                              : 'linear-gradient(90deg, #2196f3 0%, #03a9f4 100%)',
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </AccordionSummary>

                {/* Lista de lecciones */}
                <AccordionDetails sx={{ pt: 0 }}>
                  <Divider sx={{ mb: 2 }} />
                  <List sx={{ pt: 0 }}>
                    {(() => {
                      // Ordenar lecciones por 'order' si existe
                      const sortedLessons = [...(module.lessons || [])].sort((a, b) => {
                        if (a.order !== undefined && b.order !== undefined) {
                          return a.order - b.order;
                        }
                        return 0;
                      });

                      // Función para verificar si una lección está desbloqueada (desbloqueo lineal)
                      const isLessonUnlocked = (lessonIndex) => {
                        // La primera lección siempre está desbloqueada
                        if (lessonIndex === 0) {
                          return true;
                        }
                        
                        // Verificar que todas las lecciones anteriores estén completadas
                        for (let i = 0; i < lessonIndex; i++) {
                          const previousLesson = sortedLessons[i];
                          const previousProgress = userProgress?.lessons?.[previousLesson.id];
                          if (!previousProgress?.completed) {
                            return false;
                          }
                        }
                        
                        return true;
                      };

                      return sortedLessons.map((lesson, index) => {
                        const lessonProgress = userProgress?.lessons?.[lesson.id];
                        const isCompleted = lessonProgress?.completed || false;
                        const isUnlocked = isLessonUnlocked(index);
                        // La lección está bloqueada si el módulo está bloqueado O si la lección no está desbloqueada linealmente
                        const isLessonBlocked = status === 'locked' || !isUnlocked;
                        const isClickable = !isLessonBlocked;

                        return (
                          <ListItem key={lesson.id} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                              onClick={() => {
                                if (isClickable) {
                                  handleLessonClick(module, lesson);
                                }
                              }}
                              disabled={!isClickable}
                              sx={{
                                borderRadius: 1,
                                // Opacidad reducida cuando está bloqueada
                                opacity: !isUnlocked ? 0.5 : 1,
                                cursor: isClickable ? 'pointer' : 'not-allowed',
                                '&:hover': {
                                  backgroundColor: isClickable ? 'action.hover' : 'transparent',
                                },
                                '&.Mui-disabled': {
                                  opacity: !isUnlocked ? 0.5 : 0.38,
                                },
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                {!isUnlocked ? (
                                  <Lock sx={{ color: 'action.disabled', fontSize: 18 }} />
                                ) : isCompleted ? (
                                  <CheckCircleOutline sx={{ color: 'success.main' }} />
                                ) : (
                                  <RadioButtonUnchecked sx={{ color: 'action.disabled' }} />
                                )}
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: isCompleted ? 500 : 400,
                                      textDecoration: isCompleted ? 'line-through' : 'none',
                                      color: !isUnlocked ? 'text.disabled' : 'inherit',
                                      opacity: !isUnlocked ? 0.6 : 1,
                                    }}
                                  >
                                    {lesson.title}
                                  </Typography>
                                }
                                secondary={`${lesson.estimatedTime} min`}
                                secondaryTypographyProps={{
                                  variant: 'caption',
                                  color: !isUnlocked ? 'text.disabled' : 'text.secondary',
                                  sx: { opacity: !isUnlocked ? 0.6 : 1 }
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      });
                    })()}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Grid>
          );
        })}
      </Grid>

      {/* Estado inicial si no hay progreso */}
      {!hasProgress && Object.keys(modules).length > 0 && (
        <Box sx={{ mt: 4 }}>
          {renderEmptyState()}
        </Box>
      )}
    </Box>
  );
};

// PropTypes para validación de props
ProgressTree.propTypes = {
  modules: PropTypes.object.isRequired,
  userProgress: PropTypes.object.isRequired,
  onModuleClick: PropTypes.func.isRequired,
  onLessonClick: PropTypes.func.isRequired,
};

export default ProgressTree;

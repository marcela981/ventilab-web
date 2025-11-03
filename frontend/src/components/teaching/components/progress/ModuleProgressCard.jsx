import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Grid,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  Tooltip,
  Checkbox,
} from '@mui/material';
import {
  Lock,
  LockOpen,
  PlayCircle,
  CheckCircle,
  ExpandMore,
  AccessTime,
  PlayArrow,
  NavigateNext,
  Refresh,
  MenuBook,
  CheckCircleOutline,
  RadioButtonUnchecked,
} from '@mui/icons-material';

/**
 * Subcomponente para renderizar un item de lección individual
 *
 * @component
 * @param {Object} props - Props del componente
 * @param {Object} props.lesson - Datos de la lección
 * @param {string} props.moduleId - ID del módulo padre
 * @param {boolean} props.isCompleted - Si la lección está completada
 * @param {boolean} props.isDisabled - Si el item está deshabilitado
 * @param {Function} props.onLessonClick - Callback para manejar click en la lección
 * @returns {JSX.Element} Item de lección
 */
const LessonProgressItem = ({
  lesson,
  moduleId,
  isCompleted,
  isDisabled,
  onLessonClick,
}) => {
  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        onClick={() => onLessonClick && onLessonClick(moduleId, lesson.id)}
        disabled={isDisabled}
        sx={{
          borderRadius: 2,
          py: 1.5,
          px: 2,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: isDisabled ? 'transparent' : 'action.hover',
            transform: isDisabled ? 'none' : 'translateX(4px)',
          },
        }}
        aria-label={`${lesson.title} - ${isCompleted ? 'Completada' : 'Pendiente'}`}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          <Checkbox
            checked={isCompleted}
            disabled={isDisabled}
            icon={<RadioButtonUnchecked />}
            checkedIcon={<CheckCircleOutline />}
            sx={{
              color: isCompleted ? 'success.main' : 'action.disabled',
              '&.Mui-checked': {
                color: 'success.main',
              },
            }}
          />
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                fontWeight: isCompleted ? 500 : 400,
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? 'text.secondary' : 'text.primary',
              }}
            >
              {lesson.title}
            </Typography>
          }
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <AccessTime sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {lesson.estimatedTime || 0} minutos
              </Typography>
            </Box>
          }
        />
        <Chip
          label={lesson.estimatedTime || 0}
          icon={<AccessTime />}
          size="small"
          variant="outlined"
          sx={{
            ml: 1,
            fontSize: '0.75rem',
            display: { xs: 'none', sm: 'flex' },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

LessonProgressItem.propTypes = {
  lesson: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    estimatedTime: PropTypes.number,
  }).isRequired,
  moduleId: PropTypes.string.isRequired,
  isCompleted: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onLessonClick: PropTypes.func,
};

LessonProgressItem.defaultProps = {
  isCompleted: false,
  isDisabled: false,
  onLessonClick: null,
};

/**
 * ModuleProgressCard Component
 *
 * Componente reutilizable que representa visualmente un módulo individual
 * dentro del árbol de progreso con toda su información y lecciones.
 *
 * @component
 * @param {Object} props - Props del componente
 * @param {Object} props.module - Objeto con información del módulo
 * @param {number} props.progressPercentage - Porcentaje de progreso (0-100)
 * @param {string} props.status - Estado del módulo
 * @param {boolean} props.isExpanded - Si el accordion está expandido
 * @param {Function} props.onToggleExpansion - Handler para expandir/colapsar
 * @param {Function} props.onModuleClick - Handler para click en módulo
 * @param {Function} props.onLessonClick - Handler para click en lección
 * @param {Array} props.lessons - Array de lecciones del módulo
 * @param {Set} props.completedLessons - Set de lecciones completadas
 * @param {Array} props.missingPrerequisites - Prerequisites faltantes
 * @returns {JSX.Element} Card del módulo
 */
const ModuleProgressCard = ({
  module,
  progressPercentage,
  status,
  isExpanded,
  onToggleExpansion,
  onModuleClick,
  onLessonClick,
  lessons,
  completedLessons,
  missingPrerequisites,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Obtiene el color del avatar según el estado
   */
  const getAvatarColor = () => {
    switch (status) {
      case 'locked':
        return 'grey.500';
      case 'available':
        return 'info.main';
      case 'in-progress':
        return 'warning.main';
      case 'completed':
        return 'success.main';
      default:
        return 'grey.500';
    }
  };

  /**
   * Obtiene el icono según el estado
   */
  const getStatusIcon = () => {
    const iconProps = { sx: { color: 'white' } };

    switch (status) {
      case 'locked':
        return <Lock {...iconProps} />;
      case 'available':
        return <LockOpen {...iconProps} />;
      case 'in-progress':
        return <PlayCircle {...iconProps} />;
      case 'completed':
        return <CheckCircle {...iconProps} />;
      default:
        return <Lock {...iconProps} />;
    }
  };

  /**
   * Obtiene el color del chip de dificultad
   */
  const getDifficultyColor = () => {
    const difficulty = module.difficulty?.toLowerCase() || '';

    if (difficulty === 'beginner' || difficulty === 'principiante') {
      return 'success';
    }
    if (difficulty === 'intermediate' || difficulty === 'intermedio') {
      return 'warning';
    }
    if (difficulty === 'advanced' || difficulty === 'avanzado') {
      return 'error';
    }

    return 'default';
  };

  /**
   * Obtiene la configuración del botón de acción según el estado
   */
  const getActionButtonConfig = () => {
    switch (status) {
      case 'locked':
        return {
          text: 'Desbloquear completando',
          icon: <Lock />,
          disabled: true,
          tooltip:
            missingPrerequisites && missingPrerequisites.length > 0
              ? `Completa primero: ${missingPrerequisites.map((p) => p.title).join(', ')}`
              : 'Módulo bloqueado',
        };
      case 'available':
        return {
          text: 'Comenzar Módulo',
          icon: <PlayArrow />,
          disabled: false,
          tooltip: 'Iniciar el aprendizaje de este módulo',
        };
      case 'in-progress':
        return {
          text: 'Continuar Aprendiendo',
          icon: <NavigateNext />,
          disabled: false,
          tooltip: 'Continuar con las lecciones pendientes',
        };
      case 'completed':
        return {
          text: 'Revisar Módulo',
          icon: <Refresh />,
          disabled: false,
          tooltip: 'Revisar el contenido completado',
        };
      default:
        return {
          text: 'Ver Módulo',
          icon: <PlayArrow />,
          disabled: true,
          tooltip: '',
        };
    }
  };

  /**
   * Maneja el click en el botón de acción
   */
  const handleActionClick = async () => {
    if (status === 'locked' || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      if (onModuleClick) {
        await onModuleClick(module.id);
      }
    } catch (error) {
      console.error('Error handling module click:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verifica si una lección está completada
   */
  const isLessonCompleted = (lessonId) => {
    const lessonKey = `${module.id}-${lessonId}`;
    return completedLessons.has(lessonKey);
  };

  const buttonConfig = getActionButtonConfig();
  const totalLessons = lessons.length;
  const hasLessons = totalLessons > 0;

  return (
    <Accordion
      expanded={isExpanded}
      onChange={(event, expanded) => onToggleExpansion && onToggleExpansion(expanded)}
      disabled={status === 'locked'}
      TransitionProps={{
        timeout: 300,
        unmountOnExit: true,
      }}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px !important',
        overflow: 'hidden',
        '&:before': { display: 'none' },
        boxShadow: 2,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: status !== 'locked' ? 4 : 2,
          transform: status !== 'locked' ? 'translateY(-2px)' : 'none',
        },
        opacity: status === 'locked' ? 0.7 : 1,
        backgroundColor: 'background.paper',
      }}
      aria-label={`Módulo ${module.title} - ${status}`}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          minHeight: 100,
          '& .MuiAccordionSummary-content': {
            my: 2,
          },
          '& .MuiAccordionSummary-expandIconWrapper': {
            transition: 'transform 0.3s',
          },
        }}
        aria-controls={`module-${module.id}-content`}
        id={`module-${module.id}-header`}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Sección Izquierda - Avatar con Icono de Estado */}
          <Grid item xs={12} sm={1} md={1}>
            <Avatar
              sx={{
                bgcolor: getAvatarColor(),
                width: { xs: 48, sm: 56 },
                height: { xs: 48, sm: 56 },
                mx: 'auto',
              }}
            >
              {getStatusIcon()}
            </Avatar>
          </Grid>

          {/* Sección Central - Información del Módulo */}
          <Grid item xs={12} sm={8} md={8}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                color: 'text.primary',
              }}
            >
              {module.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {module.description}
            </Typography>

            {/* Chips de información */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={module.difficulty || 'Beginner'}
                color={getDifficultyColor()}
                size="small"
                sx={{ fontWeight: 500 }}
              />
              <Chip
                icon={<AccessTime />}
                label={`${module.estimatedTime || 0} min`}
                size="small"
                variant="outlined"
              />
              <Chip
                icon={<MenuBook />}
                label={`${totalLessons} ${totalLessons === 1 ? 'lección' : 'lecciones'}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </Grid>

          {/* Sección Derecha - Progreso Circular */}
          <Grid item xs={12} sm={3} md={3}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <CircularProgress
                variant="determinate"
                value={progressPercentage}
                size={80}
                thickness={4}
                sx={{
                  color: getAvatarColor(),
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  },
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {progressPercentage}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Progreso
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        <Divider sx={{ mb: 2 }} />

        {/* Lista de Lecciones */}
        {hasLessons ? (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Lecciones del Módulo
            </Typography>
            <List sx={{ pt: 0, pb: 2 }}>
              {lessons.map((lesson) => (
                <LessonProgressItem
                  key={lesson.id}
                  lesson={lesson}
                  moduleId={module.id}
                  isCompleted={isLessonCompleted(lesson.id)}
                  isDisabled={status === 'locked'}
                  onLessonClick={onLessonClick}
                />
              ))}
            </List>
          </>
        ) : (
          <Box
            sx={{
              py: 4,
              textAlign: 'center',
              backgroundColor: 'action.hover',
              borderRadius: 2,
              mb: 2,
            }}
          >
            <MenuBook sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Este módulo no tiene lecciones disponibles aún
            </Typography>
          </Box>
        )}

        {/* Botón de Acción */}
        <Tooltip title={buttonConfig.tooltip} arrow placement="top">
          <span>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              startIcon={isLoading ? null : buttonConfig.icon}
              onClick={handleActionClick}
              disabled={buttonConfig.disabled || isLoading}
              sx={{
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                boxShadow: buttonConfig.disabled ? 0 : 2,
                '&:hover': {
                  boxShadow: buttonConfig.disabled ? 0 : 4,
                  transform: buttonConfig.disabled ? 'none' : 'translateY(-2px)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
              aria-label={buttonConfig.text}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                buttonConfig.text
              )}
            </Button>
          </span>
        </Tooltip>

        {/* Información de Prerequisites si está bloqueado */}
        {status === 'locked' && missingPrerequisites && missingPrerequisites.length > 0 && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: 'warning.lighter',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'warning.main',
            }}
          >
            <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 600 }}>
              Prerequisitos faltantes:
            </Typography>
            <Box sx={{ mt: 1 }}>
              {missingPrerequisites.map((prereq) => (
                <Chip
                  key={prereq.id}
                  label={`${prereq.title} (${prereq.progress}%)`}
                  size="small"
                  color="warning"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

// PropTypes para validación
ModuleProgressCard.propTypes = {
  module: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    difficulty: PropTypes.string,
    estimatedTime: PropTypes.number,
    prerequisites: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  progressPercentage: PropTypes.number,
  status: PropTypes.oneOf(['locked', 'available', 'in-progress', 'completed']),
  isExpanded: PropTypes.bool,
  onToggleExpansion: PropTypes.func,
  onModuleClick: PropTypes.func,
  onLessonClick: PropTypes.func,
  lessons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      estimatedTime: PropTypes.number,
    })
  ),
  completedLessons: PropTypes.instanceOf(Set),
  missingPrerequisites: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      progress: PropTypes.number,
    })
  ),
};

// Valores por defecto
ModuleProgressCard.defaultProps = {
  progressPercentage: 0,
  status: 'available',
  isExpanded: false,
  onToggleExpansion: null,
  onModuleClick: null,
  onLessonClick: null,
  lessons: [],
  completedLessons: new Set(),
  missingPrerequisites: [],
};

export default ModuleProgressCard;

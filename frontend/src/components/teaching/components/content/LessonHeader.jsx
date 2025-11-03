import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  styled,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Home as HomeIcon,
  MenuBook as MenuBookIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

/**
 * HeaderContainer - Contenedor principal del header
 */
const HeaderContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

/**
 * StyledBreadcrumbs - Breadcrumbs personalizado
 */
const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiBreadcrumbs-separator': {
    margin: theme.spacing(0, 1),
  },
}));

/**
 * BreadcrumbLink - Link de breadcrumb con hover effect
 */
const BreadcrumbLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  textDecoration: 'none',
  fontSize: '0.875rem',
  cursor: 'pointer',
  transition: 'color 0.2s ease',
  '&:hover': {
    color: theme.palette.primary.main,
    textDecoration: 'underline',
  },
}));

/**
 * ObjectivesList - Lista estilizada para objetivos
 */
const ObjectivesList = styled(List)(({ theme }) => ({
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  '& .MuiListItem-root': {
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
  },
}));

/**
 * Formatea el tiempo estimado en minutos a formato legible
 * @param {number} minutes - Tiempo en minutos
 * @returns {string} - Tiempo formateado
 */
const formatEstimatedTime = (minutes) => {
  if (!minutes || minutes < 1) return 'Menos de 1 min';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  
  return `${hours}h ${mins}min`;
};

/**
 * Obtiene las propiedades del chip según el nivel de dificultad
 * @param {string} difficulty - Nivel de dificultad
 * @returns {Object} - Propiedades del chip (color, label)
 */
const getDifficultyConfig = (difficulty) => {
  const configs = {
    beginner: {
      color: 'success',
      label: 'Principiante',
      icon: '🟢',
    },
    intermediate: {
      color: 'warning',
      label: 'Intermedio',
      icon: '🟡',
    },
    advanced: {
      color: 'error',
      label: 'Avanzado',
      icon: '🔴',
    },
  };

  return configs[difficulty] || configs.beginner;
};

/**
 * LessonHeader - Componente de encabezado para visualización de lecciones.
 * 
 * Muestra información completa de la lección incluyendo breadcrumbs de navegación,
 * título, descripción, metadatos (tiempo, dificultad, nivel) y objetivos de aprendizaje.
 * Proporciona una interfaz profesional y responsive para el inicio de cada lección.
 * 
 * @component
 * @example
 * ```jsx
 * const lesson = {
 *   title: "Fundamentos de Ventilación Mecánica",
 *   description: "Aprende los conceptos básicos...",
 *   estimatedTime: 45,
 *   difficulty: "beginner",
 *   level: "Nivel 1",
 *   moduleTitle: "Introducción a Ventilación",
 *   learningObjectives: [
 *     "Comprender los principios básicos",
 *     "Identificar los componentes clave",
 *     "Aplicar conocimientos en práctica"
 *   ]
 * };
 * 
 * <LessonHeader lesson={lesson} />
 * ```
 * 
 * @example
 * ```jsx
 * // Con callbacks de navegación
 * <LessonHeader
 *   lesson={lesson}
 *   onHomeClick={() => router.push('/')}
 *   onModuleClick={() => router.push('/modules/123')}
 * />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.lesson - Objeto con información de la lección
 * @param {Function} [props.onHomeClick] - Callback al hacer click en Home
 * @param {Function} [props.onModuleClick] - Callback al hacer click en el módulo
 */
const LessonHeader = ({ lesson, onHomeClick, onModuleClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [objectivesExpanded, setObjectivesExpanded] = useState(false);

  // Validación básica
  if (!lesson) {
    return (
      <HeaderContainer elevation={2}>
        <Typography color="error">
          No se proporcionó información de la lección
        </Typography>
      </HeaderContainer>
    );
  }

  const {
    title,
    description,
    estimatedTime,
    difficulty,
    level,
    learningObjectives,
    moduleTitle,
  } = lesson;

  const difficultyConfig = getDifficultyConfig(difficulty);

  /**
   * Maneja el click en Home
   */
  const handleHomeClick = (event) => {
    event.preventDefault();
    if (onHomeClick && typeof onHomeClick === 'function') {
      onHomeClick();
    }
  };

  /**
   * Maneja el click en el módulo
   */
  const handleModuleClick = (event) => {
    event.preventDefault();
    if (onModuleClick && typeof onModuleClick === 'function') {
      onModuleClick();
    }
  };

  return (
    <HeaderContainer elevation={2} role="banner" aria-label="Encabezado de la lección">
      {/* Breadcrumbs de navegación */}
      <StyledBreadcrumbs
        aria-label="breadcrumb"
        separator="›"
      >
        <BreadcrumbLink
          onClick={handleHomeClick}
          aria-label="Ir a inicio"
        >
          <HomeIcon sx={{ fontSize: 18 }} />
          <span>Inicio</span>
        </BreadcrumbLink>

        {moduleTitle && (
          <BreadcrumbLink
            onClick={handleModuleClick}
            aria-label={`Ir al módulo ${moduleTitle}`}
          >
            <MenuBookIcon sx={{ fontSize: 18 }} />
            <span>{moduleTitle}</span>
          </BreadcrumbLink>
        )}

        <Typography
          variant="body2"
          color="text.primary"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontWeight: 500,
          }}
        >
          {title}
        </Typography>
      </StyledBreadcrumbs>

      <Divider sx={{ mb: 2 }} />

      {/* Título de la lección */}
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        component="h1"
        fontWeight="bold"
        gutterBottom
        sx={{
          color: 'text.primary',
          mb: 2,
          lineHeight: 1.3,
        }}
      >
        {title}
      </Typography>

      {/* Descripción */}
      {description && (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            mb: 3,
            lineHeight: 1.7,
          }}
        >
          {description}
        </Typography>
      )}

      {/* Chips informativos */}
      <Stack
        direction={isMobile ? 'column' : 'row'}
        spacing={1}
        flexWrap="wrap"
        sx={{
          mb: learningObjectives && learningObjectives.length > 0 ? 3 : 0,
          gap: 1,
        }}
      >
        {/* Tiempo estimado */}
        {estimatedTime && (
          <Chip
            icon={<ScheduleIcon />}
            label={formatEstimatedTime(estimatedTime)}
            variant="outlined"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            sx={{ fontWeight: 500 }}
          />
        )}

        {/* Nivel de dificultad */}
        {difficulty && (
          <Chip
            label={`${difficultyConfig.icon} ${difficultyConfig.label}`}
            color={difficultyConfig.color}
            size={isMobile ? 'small' : 'medium'}
            sx={{ fontWeight: 500 }}
          />
        )}

        {/* Nivel del curriculum */}
        {level && (
          <Chip
            icon={<TrendingUpIcon />}
            label={level}
            variant="outlined"
            color="default"
            size={isMobile ? 'small' : 'medium'}
            sx={{ fontWeight: 500 }}
          />
        )}
      </Stack>

      {/* Objetivos de aprendizaje */}
      {learningObjectives && learningObjectives.length > 0 && (
        <Accordion
          expanded={objectivesExpanded}
          onChange={(e, isExpanded) => setObjectivesExpanded(isExpanded)}
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            '&:before': {
              display: 'none',
            },
            '&.Mui-expanded': {
              margin: 0,
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="learning-objectives-content"
            id="learning-objectives-header"
            sx={{
              backgroundColor: theme.palette.action.hover,
              borderRadius: objectivesExpanded ? '4px 4px 0 0' : 1,
              '&:hover': {
                backgroundColor: theme.palette.action.selected,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Objetivos de Aprendizaje
              </Typography>
              <Chip
                label={learningObjectives.length}
                size="small"
                color="primary"
                sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
              />
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 2 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              Al finalizar esta lección serás capaz de:
            </Typography>

            <ObjectivesList>
              {learningObjectives.map((objective, index) => (
                <ListItem
                  key={index}
                  sx={{
                    alignItems: 'flex-start',
                    py: 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <CheckCircleIcon
                      color="success"
                      sx={{ fontSize: 20 }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={objective}
                    primaryTypographyProps={{
                      variant: 'body2',
                      color: 'text.primary',
                      sx: { lineHeight: 1.6 },
                    }}
                  />
                </ListItem>
              ))}
            </ObjectivesList>
          </AccordionDetails>
        </Accordion>
      )}
    </HeaderContainer>
  );
};

LessonHeader.propTypes = {
  /**
   * Objeto con la información completa de la lección
   */
  lesson: PropTypes.shape({
    /**
     * Título de la lección
     */
    title: PropTypes.string.isRequired,

    /**
     * Descripción breve de la lección
     */
    description: PropTypes.string,

    /**
     * Tiempo estimado de completación en minutos
     */
    estimatedTime: PropTypes.number,

    /**
     * Nivel de dificultad de la lección
     */
    difficulty: PropTypes.oneOf(['beginner', 'intermediate', 'advanced']),

    /**
     * Nivel dentro del curriculum (ej: "Nivel 1", "Nivel 2")
     */
    level: PropTypes.string,

    /**
     * Array de objetivos de aprendizaje
     */
    learningObjectives: PropTypes.arrayOf(PropTypes.string),

    /**
     * Título del módulo al que pertenece la lección
     */
    moduleTitle: PropTypes.string,
  }).isRequired,

  /**
   * Callback opcional ejecutado al hacer click en "Inicio" en los breadcrumbs
   */
  onHomeClick: PropTypes.func,

  /**
   * Callback opcional ejecutado al hacer click en el título del módulo en los breadcrumbs
   */
  onModuleClick: PropTypes.func,
};

LessonHeader.defaultProps = {
  onHomeClick: null,
  onModuleClick: null,
};

export default LessonHeader;


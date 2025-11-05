import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CheckCircle,
  TrendingUp,
  LockOpen,
  Lock,
  BookmarkBorder,
  Bookmark,
  PlayArrow,
  Refresh
} from '@mui/icons-material';

/**
 * ModuleCard - Card minimalista y optimizada para módulos de aprendizaje
 *
 * Componente de card individual que muestra información de un módulo con un diseño
 * flat moderno, microinteracciones suaves y clara jerarquía visual.
 *
 * Características principales:
 * - Diseño flat con border sutil de 1px
 * - Hover effect elegante con elevación de 2px y sombra suave
 * - Transiciones suaves de 0.25s ease-in-out
 * - Estados visuales claros (completado, en progreso, disponible, bloqueado)
 * - Título y descripción con truncado automático (ellipsis)
 * - Barra de progreso delgada y minimalista (5px)
 * - Chips minimalistas con colores pasteles
 * - Botón de favorito con fondo semi-transparente
 * - Totalmente responsive con aspect ratio consistente
 * - Opacidad reducida para módulos bloqueados (0.5)
 *
 * @component
 * @param {Object} module - Datos completos del módulo
 * @param {string} module.id - ID único del módulo
 * @param {string} module.title - Título del módulo
 * @param {string} module.description - Descripción del módulo
 * @param {Array<string>} module.learningObjectives - Objetivos de aprendizaje
 * @param {string} module.difficulty - Nivel de dificultad
 * @param {number} module.duration - Duración en minutos
 * @param {number} moduleProgress - Porcentaje de progreso (0-100)
 * @param {boolean} isAvailable - Si el módulo está disponible para el usuario
 * @param {boolean} isFavorite - Si el módulo está marcado como favorito
 * @param {Function} onModuleClick - Callback al hacer click en la card
 * @param {Function} onToggleFavorite - Callback para toggle de favorito
 * @param {Function} getStatusIcon - Función para obtener icono según estado
 * @param {Function} getButtonText - Función para obtener texto del botón
 * @param {Function} getButtonIcon - Función para obtener icono del botón
 * @param {string} levelColor - Color hex del nivel (para personalización)
 * @returns {JSX.Element} Card de módulo optimizada
 */
const ModuleCard = ({
  module,
  moduleProgress,
  isAvailable,
  isFavorite,
  onModuleClick,
  onToggleFavorite,
  getStatusIcon,
  getButtonText,
  getButtonIcon,
  levelColor
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  /**
   * Determina el estado visual del módulo basado en progreso y disponibilidad
   * @returns {string} Estado: 'completed', 'in-progress', 'available', 'locked'
   */
  const getModuleStatus = () => {
    if (moduleProgress === 100) return 'completed';
    if (moduleProgress > 0) return 'in-progress';
    if (isAvailable) return 'available';
    return 'locked';
  };

  const status = getModuleStatus();

  /**
   * Obtiene el color del borde según el estado en hover
   * @returns {string} Color hex o theme color
   */
  const getHoverBorderColor = () => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'in-progress':
        return '#FF9800';
      case 'available':
        return levelColor;
      default:
        return theme.palette.grey[300];
    }
  };

  /**
   * Obtiene el color de la barra de progreso según el estado
   * @returns {string} Color hex
   */
  const getProgressBarColor = () => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'in-progress':
        return '#FF9800';
      default:
        return theme.palette.grey[400];
    }
  };

  /**
   * Convierte duración de minutos a formato compacto (ej: "2h", "1.5h")
   * @param {number} minutes - Duración en minutos
   * @returns {string} Duración formateada
   */
  const formatDuration = (minutes) => {
    const hours = minutes / 60;
    return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
  };

  return (
    <Tooltip
      title={isAvailable ? `${moduleProgress.toFixed(0)}% completado` : 'Módulo bloqueado - Completa los requisitos previos'}
      arrow
      placement="top"
    >
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: isAvailable ? 'pointer' : 'default',
          // Opacidad reducida para módulos bloqueados
          opacity: isAvailable ? 1 : 0.5,
          // Border neutral sutil de 1px con fondo transparente
          border: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          position: 'relative',
          // Sin sombra por defecto (flat design)
          boxShadow: 'none',
          backgroundColor: '#A0DBE9',
          // Transición suave y rápida
          transition: 'all 0.25s ease-in-out',
          // Hover effect elegante y sutil
          '&:hover': isAvailable ? {
            // Elevación mínima de 2px
            transform: 'translateY(-2px)',
            // Fondo más claro en hover
            backgroundColor: '#B5E3F0',
            // Border cambia al color del estado
            borderColor: getHoverBorderColor(),
          } : {},
          // Reducir padding en móvil para mejor uso del espacio
          [theme.breakpoints.down('sm')]: {
            width: '100%'
          }
        }}
        onClick={() => isAvailable && onModuleClick(module.id)}
      >
        {/* Icono de estado - reducido a 20px */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            transition: 'transform 0.25s ease-in-out',
            // Pequeña animación en hover de la card
            '.MuiCard-root:hover &': isAvailable ? {
              transform: 'scale(1.1)'
            } : {}
          }}
        >
          {/* Renderizar icono según estado con tamaño reducido */}
          {status === 'completed' && (
            <CheckCircle sx={{ color: '#4CAF50', fontSize: 20 }} />
          )}
          {status === 'in-progress' && (
            <TrendingUp sx={{ color: '#FF9800', fontSize: 20 }} />
          )}
          {status === 'available' && (
            <LockOpen sx={{ color: levelColor, fontSize: 20 }} />
          )}
          {status === 'locked' && (
            <Lock sx={{ color: theme.palette.grey[400], fontSize: 20 }} />
          )}
        </Box>

        {/* Botón de favorito con fondo semi-transparente */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 2
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(module.id);
            }}
            sx={{
              width: 32,
              height: 32,
              // Fondo semi-transparente por defecto
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(4px)',
              transition: 'all 0.25s ease-in-out',
              // Fondo más visible en hover
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                transform: 'scale(1.1)'
              }
            }}
          >
            {isFavorite ? (
              <Bookmark sx={{ color: '#FF9800', fontSize: 18 }} />
            ) : (
              <BookmarkBorder sx={{ color: '#e8f4fd', fontSize: 18 }} />
            )}
          </IconButton>
        </Box>

        {/* Contenido principal de la card */}
        <CardContent
          sx={{
            flexGrow: 1,
            pt: 5,
            pb: 2,
            px: isMobile ? 2 : 2.5
          }}
        >
          {/* Título del módulo - truncado a 2 líneas */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 1,
              fontSize: '1rem',
              lineHeight: 1.3,
              color: isAvailable ? '#ffffff' : '#9e9e9e',
              textShadow: isAvailable ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
              // Truncado con ellipsis después de 2 líneas
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {module.title}
          </Typography>

          {/* Descripción/Learning Objective - truncado a 3 líneas */}
          <Typography
            variant="body2"
            sx={{
              color: isAvailable ? '#ffffff' : '#9e9e9e',
              opacity: isAvailable ? 0.95 : 0.7,
              mb: 2,
              fontSize: '0.875rem',
              lineHeight: 1.5,
              // Truncado con ellipsis después de 3 líneas
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {module.learningObjectives?.[0] || module.description}
          </Typography>

          {/* Barra de progreso minimalista */}
          <Box sx={{ mb: 2 }}>
            {/* Header de la barra de progreso */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                mb: 0.5
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: isAvailable ? '#ffffff' : '#9e9e9e',
                  opacity: isAvailable ? 0.9 : 0.7,
                  fontSize: '0.7rem',
                  fontWeight: 500
                }}
              >
                Progreso
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isAvailable ? '#ffffff' : '#9e9e9e',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textShadow: isAvailable ? '0 1px 1px rgba(0, 0, 0, 0.1)' : 'none'
                }}
              >
                {moduleProgress.toFixed(0)}%
              </Typography>
            </Box>

            {/* Barra de progreso delgada (5px) */}
            <LinearProgress
              variant="determinate"
              value={moduleProgress}
              sx={{
                height: 5,
                borderRadius: 3,
                // Background gris muy claro con opacidad 0.1
                backgroundColor: `${theme.palette.grey[400]}10`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getProgressBarColor(),
                  borderRadius: 3,
                  transition: 'transform 0.25s ease-in-out'
                }
              }}
            />
          </Box>

          {/* Chips minimalistas de metadatos - estilo unificado */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {/* Chip de dificultad */}
            <Chip
              label={module.difficulty}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                fontWeight: 500,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: isAvailable ? '#ffffff' : '#9e9e9e',
                transition: 'all 0.25s ease-in-out',
                '&:hover': {
                  backgroundColor: isAvailable ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)'
                }
              }}
            />

            {/* Chip de duración */}
            <Chip
              label={formatDuration(module.duration)}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                fontWeight: 500,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: isAvailable ? '#ffffff' : '#9e9e9e',
                transition: 'all 0.25s ease-in-out',
                '&:hover': {
                  backgroundColor: isAvailable ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)'
                }
              }}
            />
          </Box>
        </CardContent>

        {/* Acciones de la card */}
        <CardActions
          sx={{
            p: 2,
            pt: 0,
            px: isMobile ? 2 : 2.5
          }}
        >
          <Button
            // Outlined cuando completado, contained cuando disponible/en progreso
            variant={status === 'completed' ? 'outlined' : 'contained'}
            fullWidth
            disabled={!isAvailable}
            startIcon={
              status === 'completed' ? <CheckCircle /> :
              status === 'in-progress' ? <Refresh /> :
              <PlayArrow />
            }
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'none',
              py: 1,
              borderRadius: 1.5,
              // Colores suaves no saturados
              backgroundColor: status !== 'completed' && isAvailable ? levelColor : 'transparent',
              borderColor: isAvailable ? levelColor : theme.palette.grey[300],
              color: status !== 'completed' && isAvailable ? '#fff' : levelColor,
              boxShadow: 'none',
              transition: 'all 0.25s ease-in-out',
              '&:hover': isAvailable ? {
                backgroundColor: status !== 'completed' ? levelColor : 'transparent',
                // Oscurecer ligeramente en hover
                filter: 'brightness(0.92)',
                boxShadow: 'none',
                transform: 'scale(1.02)'
              } : {},
              '&.Mui-disabled': {
                backgroundColor: 'transparent',
                borderColor: theme.palette.grey[300],
                color: theme.palette.grey[400]
              }
            }}
          >
            {status === 'completed' ? 'Completado' :
              status === 'in-progress' ? 'Continuar' :
                isAvailable ? 'Comenzar' : 'Bloqueado'}
          </Button>
        </CardActions>
      </Card>
    </Tooltip>
  );
};

// PropTypes con documentación completa
ModuleCard.propTypes = {
  /** Objeto con todos los datos del módulo */
  module: PropTypes.shape({
    /** ID único del módulo */
    id: PropTypes.string.isRequired,
    /** Título del módulo */
    title: PropTypes.string.isRequired,
    /** Descripción del módulo */
    description: PropTypes.string,
    /** Array de objetivos de aprendizaje */
    learningObjectives: PropTypes.arrayOf(PropTypes.string),
    /** Nivel de dificultad (ej: "básico", "intermedio", "avanzado") */
    difficulty: PropTypes.string.isRequired,
    /** Duración estimada en minutos */
    duration: PropTypes.number.isRequired
  }).isRequired,
  /** Porcentaje de progreso del módulo (0-100) */
  moduleProgress: PropTypes.number.isRequired,
  /** Indica si el módulo está disponible para el usuario */
  isAvailable: PropTypes.bool.isRequired,
  /** Indica si el módulo está marcado como favorito */
  isFavorite: PropTypes.bool.isRequired,
  /** Callback ejecutado al hacer click en la card */
  onModuleClick: PropTypes.func.isRequired,
  /** Callback para toggle del estado de favorito */
  onToggleFavorite: PropTypes.func.isRequired,
  /** Función para obtener el icono de estado apropiado */
  getStatusIcon: PropTypes.func.isRequired,
  /** Función para obtener el texto del botón según estado */
  getButtonText: PropTypes.func.isRequired,
  /** Función para obtener el icono del botón según estado */
  getButtonIcon: PropTypes.func.isRequired,
  /** Color hex del nivel para personalización visual */
  levelColor: PropTypes.string.isRequired
};

export default ModuleCard;

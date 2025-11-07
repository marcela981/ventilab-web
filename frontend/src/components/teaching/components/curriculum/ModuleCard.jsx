import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle,
  TrendingUp,
  LockOpen,
  Lock,
  BookmarkBorder,
  Bookmark,
  PlayArrow,
  Refresh,
  MenuBook,
  Info,
  School,
  List as ListIcon
} from '@mui/icons-material';
import ModuleLessonsList from './ModuleLessonsList';
import { useLearningProgress } from '../../../../contexts/LearningProgressContext';
// Importar estilos CSS Module para estandarización visual de la card
import styles from '@/styles/curriculum.module.css';

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
  onLessonClick, // Nueva prop para manejar clicks en lecciones
  getStatusIcon,
  getButtonText,
  getButtonIcon,
  levelColor
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Obtener lecciones completadas del contexto
  const { completedLessons } = useLearningProgress();
  
  // Estado para tabs internos de la card
  const [activeTab, setActiveTab] = useState(0);

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

  // Handler para prevenir que el click de la card se active cuando se hace scroll en el body
  const handleCardClick = (e) => {
    // Si el click viene del cardBody, footer, o botones/interactivos, no activar el onClick de la card
    const target = e.target;
    const isClickableElement = target.closest('button') || 
                               target.closest('a') || 
                               target.closest('[role="tab"]') ||
                               target.closest(`.${styles.cardBody}`) ||
                               target.closest(`.${styles.cardFooter}`);
    
    if (isClickableElement) {
      return;
    }
    
    if (isAvailable && onModuleClick) {
      onModuleClick(module.id);
    }
  };

  // Handler para el cardBody para prevenir propagación de eventos
  const handleCardBodyInteraction = (e) => {
    e.stopPropagation();
  };

  // Estado para manejar hover de la card
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Tooltip
      title={isAvailable ? `${moduleProgress.toFixed(0)}% completado` : 'Módulo bloqueado - Completa los requisitos previos'}
      arrow
      placement="top"
    >
      <article
        className={`${styles.card} ${status === 'locked' ? styles.locked : ''} ${status === 'completed' ? styles.completed : ''} ${status === 'in-progress' ? styles.inProgress : ''} ${status === 'available' ? styles.available : ''}`}
        role="article"
        aria-label={`Módulo: ${module.title}`}
        onClick={handleCardClick}
        style={{
          // Estilos específicos que no están en el CSS Module (colores y comportamiento)
          // NOTA: No definir height, minHeight, maxHeight aquí - se controlan en CSS Module
          // La opacidad para locked se maneja en el CSS Module via .card.locked
          // El backgroundColor se maneja en el CSS Module (.card y .card:hover)
          cursor: isAvailable ? 'pointer' : 'default',
          position: 'relative',
        }}
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        {/* Icono de estado - reducido a 20px */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            transition: 'transform 0.25s ease-in-out',
            transform: isHovered && isAvailable ? 'scale(1.1)' : 'scale(1)'
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
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            aria-pressed={isFavorite}
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

        {/* Header - Título del módulo */}
        <header className={styles.cardHeader} style={{ paddingTop: '48px' }}>
          <Typography
            variant="h6"
            component="h3"
            style={{
              fontWeight: 700,
              fontSize: '1.05rem',
              lineHeight: 1.35,
              color: isAvailable ? '#ffffff' : '#9e9e9e',
              textShadow: isAvailable ? '0 2px 4px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              margin: 0,
            }}
          >
            {module.title}
          </Typography>
        </header>

        {/* Meta - Progreso y metadatos */}
        <div className={styles.cardMeta}>
          {/* Barra de progreso */}
          <Box sx={{ mb: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 0.75
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: isAvailable ? '#ffffff' : '#9e9e9e',
                  opacity: isAvailable ? 0.95 : 0.7,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textShadow: isAvailable ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
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
                  textShadow: isAvailable ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                }}
              >
                {moduleProgress.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={moduleProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getProgressBarColor(),
                  borderRadius: 4,
                  transition: 'transform 0.3s ease-in-out',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }
              }}
            />
          </Box>

          {/* Chips de metadatos (dificultad, duración, lecciones) */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                color: isAvailable ? '#ffffff !important' : '#9e9e9e',
                '& .MuiChip-label': {
                  color: isAvailable ? '#ffffff !important' : '#9e9e9e',
                }
              }}
            />
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
                color: isAvailable ? '#ffffff !important' : '#9e9e9e',
                '& .MuiChip-label': {
                  color: isAvailable ? '#ffffff !important' : '#9e9e9e',
                }
              }}
            />
            {module.lessons && module.lessons.length > 0 && (
              <Chip
                icon={<MenuBook sx={{ fontSize: 14, color: isAvailable ? '#ffffff' : '#9e9e9e' }} />}
                label={`${module.lessons.length} lecciones`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  height: 24,
                  fontWeight: 500,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: isAvailable ? '#ffffff !important' : '#9e9e9e',
                  '& .MuiChip-label': {
                    color: isAvailable ? '#ffffff !important' : '#9e9e9e',
                  },
                  '& .MuiChip-icon': {
                    color: isAvailable ? '#ffffff !important' : '#9e9e9e'
                  }
                }}
              />
            )}
          </Box>
        </div>

        {/* Body - Contenido scrollable con tabs */}
        <div
          className={styles.cardBody}
          role="region"
          aria-label="Contenido del módulo"
          tabIndex={0}
          onClick={handleCardBodyInteraction}
          onWheel={handleCardBodyInteraction}
          onTouchMove={handleCardBodyInteraction}
          onMouseDown={handleCardBodyInteraction}
        >
          {/* Tabs para organizar el contenido */}
          <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.2)', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => {
                e.stopPropagation(); // Evitar que se active el click de la card
                setActiveTab(newValue);
              }}
              sx={{
                minHeight: 36,
                '& .MuiTab-root': {
                  minHeight: 36,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'none',
                  py: 0.5,
                  px: 1,
                  minWidth: 'auto',
                  '&.Mui-selected': {
                    color: '#ffffff',
                    fontWeight: 600,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#ffffff',
                  height: 2,
                }
              }}
            >
              <Tab icon={<Info sx={{ fontSize: 14 }} />} iconPosition="start" label="Resumen" />
              {module.lessons && module.lessons.length > 0 && (
                <Tab icon={<School sx={{ fontSize: 14 }} />} iconPosition="start" label={`Lecciones (${module.lessons.length})`} />
              )}
              <Tab icon={<ListIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Detalles" />
            </Tabs>
          </Box>

          {/* Contenido de los tabs */}
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Tab 0: Resumen */}
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {/* Descripción */}
                <Typography
                  variant="body2"
                  sx={{
                    color: isAvailable ? '#ffffff' : '#9e9e9e',
                    opacity: isAvailable ? 0.95 : 0.7,
                    mb: 2,
                    fontSize: '0.8rem',
                    lineHeight: 1.6,
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {module.learningObjectives?.[0] || module.description || 'Sin descripción disponible'}
                </Typography>
              </Box>
            )}

            {/* Tab 1: Lecciones */}
            {activeTab === 1 && module.lessons && module.lessons.length > 0 && (
              <ModuleLessonsList
                lessons={module.lessons}
                moduleId={module.id}
                completedLessons={completedLessons}
                onLessonClick={onLessonClick ? (lessonId) => onLessonClick(module.id, lessonId) : undefined}
                isModuleAvailable={isAvailable}
                maxLessonsToShow={999} // Mostrar todas las lecciones en este tab
                showTitle={false} // No mostrar título porque ya está en el tab
              />
            )}

            {/* Tab 2: Detalles */}
            {activeTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {/* Objetivos de Aprendizaje */}
                {module.learningObjectives && module.learningObjectives.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        color: '#ffffff',
                        mb: 1,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      Objetivos de Aprendizaje
                    </Typography>
                    <List dense sx={{ py: 0 }}>
                      {module.learningObjectives.map((objective, index) => (
                        <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <CheckCircle sx={{ fontSize: 16, color: '#4CAF50' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: '0.75rem',
                                  color: 'rgba(255, 255, 255, 0.9)',
                                  lineHeight: 1.5,
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                }}
                              >
                                {objective}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Prerequisitos */}
                {module.prerequisites && module.prerequisites.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        color: '#ffffff',
                        mb: 1,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      Prerequisitos
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {module.prerequisites.map((prereqId, index) => (
                        <Chip
                          key={index}
                          label={prereqId}
                          size="small"
                          sx={{
                            fontSize: '0.65rem',
                            height: 20,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: '#ffffff !important',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            '& .MuiChip-label': {
                              color: '#ffffff !important',
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Información adicional */}
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      display: 'block',
                      mb: 0.5,
                    }}
                  >
                    Nivel: {module.level || 'N/A'}
                  </Typography>
                  {module.bloomLevel && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.7rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        display: 'block',
                        mb: 0.5,
                      }}
                    >
                      Nivel de Bloom: {module.bloomLevel}
                    </Typography>
                  )}
                  {module.estimatedTime && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.7rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        display: 'block',
                      }}
                    >
                      Tiempo estimado: {module.estimatedTime}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </div>

        {/* Footer - Acciones de la card */}
        <footer className={styles.cardFooter}>
          <Button
            // Outlined cuando completado, contained cuando disponible/en progreso
            variant={status === 'completed' ? 'outlined' : 'contained'}
            fullWidth
            disabled={!isAvailable}
            onClick={(e) => {
              e.stopPropagation(); // Prevenir que active el onClick de la card
              if (isAvailable && onModuleClick) {
                onModuleClick(module.id);
              }
            }}
            aria-label={
              status === 'completed' ? 'Módulo completado' :
              status === 'in-progress' ? 'Continuar módulo' :
              isAvailable ? 'Comenzar módulo' : 'Módulo bloqueado'
            }
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
        </footer>
      </article>
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
  /** Callback para cuando se hace click en una lección (opcional) */
  onLessonClick: PropTypes.func,
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

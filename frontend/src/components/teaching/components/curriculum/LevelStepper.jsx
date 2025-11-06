"use client";

import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle,
  Refresh,
  PlayArrow,
  Lock,
  LockOpen,
  TrendingUp,
  AccessTime,
  BookmarkBorder,
  Bookmark,
  ExpandMore
} from '@mui/icons-material';

/**
 * LevelStepper - Componente minimalista de niveles de aprendizaje
 *
 * Muestra el camino de aprendizaje organizado por niveles con un diseño limpio y moderno.
 * Cada nivel se presenta como una card horizontal con información de progreso y módulos.
 * Los módulos se organizan en un grid responsive que se adapta a diferentes pantallas.
 *
 * @component
 * @param {Array} levels - Array de niveles con id, title, description, color, emoji
 * @param {Object} levelProgress - Objeto con progreso por nivel (total, completed, percentage)
 * @param {Function} getModulesByLevel - Función para obtener módulos filtrados por nivel
 * @param {Function} calculateModuleProgress - Función para calcular progreso de cada módulo
 * @param {Function} isModuleAvailable - Función para verificar disponibilidad de módulos
 * @param {Function} getModuleStatus - Función para obtener estado del módulo (locked, available, in-progress, completed)
 * @param {Function} getTooltipMessage - Función para obtener mensaje de tooltip para módulos
 * @param {Function} onModuleClick - Callback ejecutado al hacer clic en un módulo (alias de onSectionClick)
 * @param {Function} onSectionClick - Callback ejecutado al hacer clic en un módulo
 * @param {Set} favoriteModules - Set de IDs de módulos marcados como favoritos
 * @param {Function} onToggleFavorite - Callback para toggle de favorito en un módulo
 * @param {JSX.Element} moduleGrid - Componente renderizado del grid de módulos (opcional, si no se proporciona se renderiza directamente)
 * @returns {JSX.Element} Componente de niveles de aprendizaje
 */
const LevelStepper = ({
  levels = [],
  levelProgress = {},
  getModulesByLevel,
  calculateModuleProgress,
  isModuleAvailable,
  getModuleStatus,
  getTooltipMessage,
  onModuleClick,
  onSectionClick,
  favoriteModules = new Set(),
  onToggleFavorite,
  moduleGrid
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Usar onSectionClick si está disponible, sino onModuleClick
  const handleModuleClick = onSectionClick || onModuleClick;

  /**
   * Determina el nivel actual (el que el usuario está trabajando)
   * El nivel actual es el primer nivel que tiene progreso > 0 y < 100,
   * o el primer nivel sin iniciar si todos los anteriores están completos
   */
  const currentLevelId = useMemo(() => {
    for (const level of levels) {
      const levelProg = levelProgress[level.id] || { percentage: 0 };
      if (levelProg.percentage > 0 && levelProg.percentage < 100) {
        return level.id;
      }
    }
    // Si todos los niveles están completos o no iniciados, devolver el primero sin iniciar
    for (const level of levels) {
      const levelProg = levelProgress[level.id] || { percentage: 0 };
      if (levelProg.percentage === 0) {
        return level.id;
      }
    }
    // Si todo está completo, devolver el último nivel
    return levels[levels.length - 1]?.id;
  }, [levels, levelProgress]);

  // Estado para controlar qué niveles están expandidos
  const [expandedLevels, setExpandedLevels] = useState(new Set());

  // Inicializar con el nivel actual expandido cuando cambie
  useEffect(() => {
    if (currentLevelId) {
      setExpandedLevels((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentLevelId);
        return newSet;
      });
    }
  }, [currentLevelId]);

  // Manejar cambio de expansión de niveles
  const handleAccordionChange = (levelId) => (event, isExpanded) => {
    setExpandedLevels((prev) => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(levelId);
      } else {
        newSet.delete(levelId);
      }
      return newSet;
    });
  };

  /**
   * Determina el estado visual del nivel basado en su progreso
   * @param {number} percentage - Porcentaje de completitud del nivel
   * @returns {Object} Objeto con label y color del estado
   */
  const getLevelStatus = (percentage) => {
    if (percentage === 100) return { label: 'Completado', color: 'success' };
    if (percentage > 0) return { label: 'En progreso', color: 'primary' };
    return { label: 'Sin iniciar', color: 'default' };
  };

  /**
   * Obtiene el color de la barra de progreso según el estado del módulo
   * @param {string} status - Estado del módulo
   * @returns {string} Color hexadecimal
   */
  const getProgressBarColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'in-progress':
        return '#FF9800';
      default:
        return '#9e9e9e';
    }
  };

  // Renderizar módulos directamente si no se proporciona moduleGrid
  const renderModuleGrid = (levelModules, level) => {
    if (moduleGrid) {
      return moduleGrid;
    }

    // Filtrar módulos bloqueados (no mostrar los que están bloqueados)
    const visibleModules = levelModules.filter((module) => {
      if (!calculateModuleProgress || !getModuleStatus) return true;
      const moduleProgress = calculateModuleProgress(module.id);
      const moduleStatus = getModuleStatus(module, moduleProgress);
      // No mostrar módulos bloqueados
      return moduleStatus !== 'locked';
    });

    if (!visibleModules || visibleModules.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" sx={{ color: '#e8f4fd' }}>
            No hay módulos disponibles en este nivel aún
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {visibleModules.map((module) => {
          const moduleProgress = calculateModuleProgress ? calculateModuleProgress(module.id) : 0;
          const available = isModuleAvailable ? isModuleAvailable(module.id) : true;
          const moduleStatus = getModuleStatus ? getModuleStatus(module, moduleProgress) : 'available';

          return (
            <Grid item xs={12} sm={6} md={4} key={module.id}>
              <Tooltip
                title={getTooltipMessage ? getTooltipMessage(module, moduleProgress) : module.title}
                arrow
                placement="top"
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: available ? 'pointer' : 'default',
                    opacity: available ? 1 : 0.6,
                    // Bordes sutiles según estado con fondo del hover del box anterior
                    border: '1px solid',
                    borderColor:
                      moduleStatus === 'available' ? 'rgba(33, 150, 243, 0.3)' :
                      moduleStatus === 'in-progress' ? 'rgba(255, 152, 0, 0.3)' :
                      moduleStatus === 'completed' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    position: 'relative',
                    boxShadow: 'none',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s ease',
                    '&:hover': available ? {
                      transform: 'translateY(-4px)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: moduleStatus === 'available' ? 'rgba(33, 150, 243, 0.5)' :
                        moduleStatus === 'in-progress' ? 'rgba(255, 152, 0, 0.5)' :
                        moduleStatus === 'completed' ? 'rgba(76, 175, 80, 0.5)' : level.color,
                      boxShadow: `0 8px 20px ${level.color}20`
                    } : {}
                  }}
                  onClick={() => available && handleModuleClick && handleModuleClick(module.id)}
                >
                  {/* Icono de estado del módulo */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      zIndex: 1
                    }}
                  >
                    {moduleStatus === 'completed' && (
                      <CheckCircle sx={{ color: '#4CAF50', fontSize: 20 }} />
                    )}
                    {moduleStatus === 'in-progress' && (
                      <TrendingUp sx={{ color: '#FF9800', fontSize: 20 }} />
                    )}
                    {moduleStatus === 'available' && (
                      <LockOpen sx={{ color: '#2196F3', fontSize: 20 }} />
                    )}
                    {moduleStatus === 'locked' && (
                      <Lock sx={{ color: '#9E9E9E', fontSize: 20 }} />
                    )}
                  </Box>

                  {/* Botón de favorito minimalista */}
                  {onToggleFavorite && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        zIndex: 1
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(module.id);
                        }}
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          width: 28,
                          height: 28,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        {favoriteModules.has(module.id) ? (
                          <Bookmark sx={{ color: '#FF9800', fontSize: 16 }} />
                        ) : (
                          <BookmarkBorder sx={{ color: '#e8f4fd', fontSize: 16 }} />
                        )}
                      </IconButton>
                    </Box>
                  )}

                  <CardContent sx={{ flexGrow: 1, pt: 5, pb: 2 }}>
                    {/* Título del módulo */}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        fontSize: '1rem',
                        color: available ? '#ffffff' : '#9e9e9e',
                        lineHeight: 1.3
                      }}
                    >
                      {module.title}
                    </Typography>

                    {/* Descripción del módulo */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#e8f4fd',
                        mb: 2,
                        fontSize: '0.85rem',
                        lineHeight: 1.6
                      }}
                    >
                      {module.learningObjectives?.[0] || module.description}
                    </Typography>

                    {/* Barra de progreso del módulo */}
                    {calculateModuleProgress && (
                      <Box sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 0.5
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#e8f4fd',
                              fontSize: '0.7rem',
                              fontWeight: 500
                            }}
                          >
                            Progreso
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: getProgressBarColor(moduleStatus),
                              fontWeight: 700,
                              fontSize: '0.75rem'
                            }}
                          >
                            {moduleProgress.toFixed(0)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={moduleProgress}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: `${theme.palette.grey[400]}10`,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getProgressBarColor(moduleStatus),
                              borderRadius: 3,
                              transition: 'transform 0.3s ease'
                            }
                          }}
                        />
                      </Box>
                    )}

                    {/* Chips de metadatos minimalistas */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {module.difficulty && (
                        <Chip
                          label={module.difficulty}
                          size="small"
                          sx={{
                            fontSize: '0.65rem',
                            height: 22,
                            fontWeight: 500,
                            backgroundColor: available ? `${level.color}15` : '#f5f5f5',
                            color: available ? level.color : '#9e9e9e',
                            border: 'none',
                            transition: 'all 0.3s ease'
                          }}
                        />
                      )}
                      {module.duration && (
                        <Chip
                          icon={<AccessTime sx={{ fontSize: 11 }} />}
                          label={`${Math.round(module.duration / 60)}h`}
                          size="small"
                          sx={{
                            fontSize: '0.65rem',
                            height: 22,
                            fontWeight: 500,
                            backgroundColor: available ? '#e8f5e9' : '#f5f5f5',
                            color: available ? '#2e7d32' : '#9e9e9e',
                            border: 'none',
                            transition: 'all 0.3s ease'
                          }}
                        />
                      )}
                    </Box>
                  </CardContent>

                  {/* Botón de acción minimalista */}
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      variant={moduleStatus === 'completed' ? 'outlined' : 'contained'}
                      fullWidth
                      disabled={!available || moduleStatus === 'locked'}
                      startIcon={
                        !available || moduleStatus === 'locked' ? <Lock /> :
                        moduleStatus === 'completed' ? <CheckCircle /> :
                        moduleStatus === 'in-progress' ? <Refresh /> :
                        <PlayArrow />
                      }
                      sx={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        py: 1,
                        borderRadius: 1.5,
                        backgroundColor: available && moduleStatus !== 'completed' && moduleStatus !== 'locked' ? level.color : 'transparent',
                        borderColor: available && moduleStatus !== 'locked' ? level.color : 'rgba(158, 158, 158, 0.3)',
                        color: available && moduleStatus !== 'completed' && moduleStatus !== 'locked' ? '#fff' : level.color,
                        boxShadow: 'none',
                        transition: 'all 0.3s ease',
                        cursor: available && moduleStatus !== 'locked' ? 'pointer' : 'not-allowed',
                        opacity: !available || moduleStatus === 'locked' ? 0.5 : 1,
                        '&:hover': available && moduleStatus !== 'locked' ? {
                          backgroundColor: moduleStatus !== 'completed' ? level.color : 'transparent',
                          filter: 'brightness(0.9)',
                          boxShadow: 'none'
                        } : {},
                        '&.Mui-disabled': {
                          backgroundColor: 'rgba(158, 158, 158, 0.1)',
                          borderColor: 'rgba(158, 158, 158, 0.3)',
                          color: 'rgba(158, 158, 158, 0.6)',
                          opacity: 0.5,
                          cursor: 'not-allowed'
                        }
                      }}
                    >
                      {!available || moduleStatus === 'locked' ? 'Bloqueado' :
                        moduleStatus === 'completed' ? 'Completado' :
                        moduleStatus === 'in-progress' ? 'Continuar' :
                        'Comenzar'}
                    </Button>
                  </CardActions>
                </Card>
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  return (
    <Box sx={{ pb: 3, mb: 4 }}>
      {/* Header principal - diseño minimalista */}
      <Typography
        variant="h4"
        sx={{
          color: '#ffffff',
          fontWeight: 600,
          mb: 4,
          letterSpacing: '-0.5px'
        }}
      >
        Niveles de Aprendizaje
      </Typography>

      {/* Container de niveles */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {levels.map((level, levelIndex) => {
          const levelModules = getModulesByLevel ? getModulesByLevel(level.id) : [];
          const levelProg = levelProgress[level.id] || {
            total: 0,
            completed: 0,
            percentage: 0
          };
          const status = getLevelStatus(levelProg.percentage);
          const isCurrentLevel = level.id === currentLevelId;
          const isExpanded = expandedLevels.has(level.id);

          return (
            <Accordion
              key={level.id}
              expanded={isExpanded}
              onChange={handleAccordionChange(level.id)}
              sx={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                mb: 2,
                boxShadow: 'none',
                '&:before': {
                  display: 'none'
                },
                '&.Mui-expanded': {
                  margin: 0,
                  marginBottom: 2
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: '#ffffff' }} />}
                sx={{
                  px: 3,
                  py: 2,
                  '&.Mui-expanded': {
                    minHeight: 64,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  },
                  '& .MuiAccordionSummary-content': {
                    margin: '12px 0',
                    '&.Mui-expanded': {
                      margin: '12px 0'
                    }
                  }
                }}
              >
                {/* Header del nivel */}
                <Box sx={{ width: '100%', mr: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                      mb: 2
                    }}
                  >
                    {/* Emoji y título */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Emoji prominente del nivel */}
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '2.5rem',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {level.emoji || '📚'}
                      </Typography>

                      {/* Título y descripción */}
                      <Box>
                        <Typography
                          variant="h5"
                          sx={{
                            color: level.color,
                            fontWeight: 600,
                            mb: 0.5,
                            lineHeight: 1.2
                          }}
                        >
                          {level.title}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            color: '#e8f4fd',
                            lineHeight: 1.6,
                            maxWidth: '600px'
                          }}
                        >
                          {level.description}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Chip de estado minimalista */}
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        height: '24px',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </Box>

                  {/* Barra de progreso minimalista */}
                  <Box sx={{ mt: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 0.5
                      }}
                    >
                      {/* Barra de progreso delgada */}
                      <LinearProgress
                        variant="determinate"
                        value={levelProg.percentage}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: `${theme.palette.grey[400]}10`,
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: level.color,
                            borderRadius: 3,
                            transition: 'transform 0.3s ease'
                          }
                        }}
                      />

                      {/* Texto de progreso compacto */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 0.5,
                          minWidth: isMobile ? '80px' : '100px'
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: level.color,
                            fontWeight: 700,
                            fontSize: '0.95rem'
                          }}
                        >
                          {levelProg.percentage.toFixed(0)}%
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#e8f4fd',
                            fontSize: '0.7rem'
                          }}
                        >
                          ({levelProg.completed}/{levelProg.total})
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                {/* Grid de módulos responsive */}
                {renderModuleGrid(levelModules, level)}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
};

// PropTypes
LevelStepper.propTypes = {
  levels: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    emoji: PropTypes.string // Emoji opcional para cada nivel
  })),
  levelProgress: PropTypes.objectOf(PropTypes.shape({
    total: PropTypes.number,
    completed: PropTypes.number,
    percentage: PropTypes.number
  })),
  getModulesByLevel: PropTypes.func,
  calculateModuleProgress: PropTypes.func,
  isModuleAvailable: PropTypes.func,
  getModuleStatus: PropTypes.func,
  getTooltipMessage: PropTypes.func,
  onModuleClick: PropTypes.func,
  onSectionClick: PropTypes.func,
  favoriteModules: PropTypes.instanceOf(Set),
  onToggleFavorite: PropTypes.func,
  moduleGrid: PropTypes.element
};

export default LevelStepper;
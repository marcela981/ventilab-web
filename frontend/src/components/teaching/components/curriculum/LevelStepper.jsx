import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';

/**
 * LevelStepper - Componente minimalista de niveles de aprendizaje
 *
 * Muestra los niveles del curriculum con un diseño limpio y moderno.
 * Cada nivel se presenta como una card horizontal con información de progreso
 * y módulos asociados organizados en un grid responsive.
 *
 * @component
 * @param {Array} levels - Array de niveles del curriculum con id, title, description, color y emoji
 * @param {Object} levelProgress - Objeto con progreso por nivel (total, completed, percentage)
 * @param {Function} getModulesByLevel - Función para obtener módulos filtrados por nivel
 * @param {Function} calculateModuleProgress - Función para calcular progreso de cada módulo
 * @param {Function} isModuleAvailable - Función para verificar disponibilidad de módulos
 * @param {Function} onModuleClick - Callback ejecutado al hacer click en un módulo
 * @param {JSX.Element} moduleGrid - Componente renderizado del grid de módulos
 */
const LevelStepper = ({
  levels = [],
  levelProgress = {},
  getModulesByLevel,
  calculateModuleProgress,
  isModuleAvailable,
  onModuleClick,
  moduleGrid
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  /**
   * Determina el estado del nivel basado en su progreso
   * @param {number} percentage - Porcentaje de completitud del nivel
   * @returns {Object} Objeto con label y color del estado
   */
  const getLevelStatus = (percentage) => {
    if (percentage === 100) return { label: 'Completado', color: 'success' };
    if (percentage > 0) return { label: 'En progreso', color: 'primary' };
    return { label: 'Sin iniciar', color: 'default' };
  };

  return (
    <Box sx={{ pb: 3, mb: 4 }}>
      {/* Header principal - diseño minimalista */}
      <Typography
        variant="h4"
        sx={{
          color: 'text.primary',
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
          const levelModules = getModulesByLevel(level.id);
          const levelProg = levelProgress[level.id] || {
            total: 0,
            completed: 0,
            percentage: 0
          };
          const status = getLevelStatus(levelProg.percentage);

          return (
            <Box
              key={level.id}
              sx={{
                // Card minimalista con borde sutil
                border: '1px solid',
                borderColor: 'grey.200',
                borderRadius: 2,
                p: 3,
                backgroundColor: '#ffffff',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: level.color,
                  boxShadow: `0 2px 8px ${level.color}15`
                }
              }}
            >
              {/* Header del nivel */}
              <Box sx={{ mb: 3 }}>
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
                          color: 'text.secondary',
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
                          color: 'text.secondary',
                          fontSize: '0.7rem'
                        }}
                      >
                        ({levelProg.completed}/{levelProg.total})
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Grid de módulos responsive */}
              {levelModules && levelModules.length > 0 && (
                <Grid
                  container
                  spacing={3}
                  sx={{ mt: 1 }}
                >
                  {/* Los módulos se pasan como children a través de moduleGrid */}
                  {moduleGrid}
                </Grid>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// PropTypes actualizados para incluir emoji
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
  getModulesByLevel: PropTypes.func.isRequired,
  calculateModuleProgress: PropTypes.func.isRequired,
  isModuleAvailable: PropTypes.func.isRequired,
  onModuleClick: PropTypes.func.isRequired,
  moduleGrid: PropTypes.element.isRequired
};

export default LevelStepper;

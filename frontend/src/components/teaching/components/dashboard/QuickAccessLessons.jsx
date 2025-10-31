import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Box,
  Divider
} from '@mui/material';
import {
  PlayCircleOutline,
  MenuBook,
  AccessTime
} from '@mui/icons-material';

/**
 * QuickAccessLessons - Sección de acceso rápido a lecciones organizadas por nivel
 *
 * Muestra todos los módulos disponibles organizados en tres columnas por nivel de dificultad
 * (principiante, intermedio, avanzado). Permite navegación directa a la primera lección
 * de cada módulo.
 *
 * @param {Array} allModules - Array de todos los módulos disponibles
 * @param {Function} handleSectionClick - Función para navegar a un módulo
 * @param {Boolean} isMobile - Indica si está en vista móvil
 */
const QuickAccessLessons = ({ allModules, handleSectionClick, isMobile }) => {
  // Niveles de dificultad con sus configuraciones
  const levels = [
    {
      id: 'beginner',
      title: 'Principiante',
      color: '#4CAF50',
      bgColor: '#e8f5e9',
      description: 'Fundamentos básicos'
    },
    {
      id: 'intermediate',
      title: 'Intermedio',
      color: '#FF9800',
      bgColor: '#fff3e0',
      description: 'Modalidades y parámetros'
    },
    {
      id: 'advanced',
      title: 'Avanzado',
      color: '#F44336',
      bgColor: '#ffebee',
      description: 'Estrategias especializadas'
    }
  ];

  // Agrupar módulos por nivel
  const modulesByLevel = levels.map(level => ({
    ...level,
    modules: allModules
      .filter(module => module.level === level.id)
      .sort((a, b) => a.order - b.order)
      .slice(0, 5) // Limitar a 5 módulos por columna
  }));

  return (
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
      {/* Título de la sección */}
      <Typography
        variant="h5"
        sx={{
          mb: 3,
          color: '#1976d2',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <PlayCircleOutline sx={{ fontSize: 28 }} />
        Acceso Rápido a Lecciones
      </Typography>

      <Typography
        variant="body2"
        sx={{
          mb: 3,
          color: '#6c757d'
        }}
      >
        Explora y accede directamente a las lecciones organizadas por nivel de dificultad
      </Typography>

      {/* Grid de columnas por nivel */}
      <Grid container spacing={3}>
        {modulesByLevel.map((levelData) => (
          <Grid item xs={12} md={4} key={levelData.id}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                backgroundColor: levelData.bgColor,
                border: `2px solid ${levelData.color}`,
                borderRadius: 2
              }}
            >
              <CardContent>
                {/* Encabezado del nivel */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: levelData.color,
                      fontWeight: 700
                    }}
                  >
                    {levelData.title}
                  </Typography>
                  <Chip
                    label={`${levelData.modules.length} módulos`}
                    size="small"
                    sx={{
                      backgroundColor: levelData.color,
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 2,
                    color: '#666',
                    fontStyle: 'italic'
                  }}
                >
                  {levelData.description}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {/* Lista de módulos */}
                <List sx={{ p: 0 }}>
                  {levelData.modules.length > 0 ? (
                    levelData.modules.map((module, index) => (
                      <ListItemButton
                        key={module.id}
                        onClick={() => handleSectionClick(module.id)}
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          backgroundColor: 'rgba(255,255,255,0.7)',
                          border: '1px solid rgba(0,0,0,0.08)',
                          transition: 'all 0.2s',
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            transform: 'translateX(4px)',
                            boxShadow: 2
                          }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: '#2c3e50',
                                mb: 0.5
                              }}
                            >
                              {index + 1}. {module.title}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                              {/* Número de lecciones */}
                              <Chip
                                icon={<MenuBook sx={{ fontSize: 14 }} />}
                                label={`${module.lessons?.length || 0} lecciones`}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  borderColor: levelData.color,
                                  color: levelData.color
                                }}
                              />

                              {/* Duración estimada */}
                              <Chip
                                icon={<AccessTime sx={{ fontSize: 14 }} />}
                                label={module.estimatedTime || `${Math.round(module.duration / 60)}h`}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  borderColor: levelData.color,
                                  color: levelData.color
                                }}
                              />

                              {/* Dificultad */}
                              {module.difficulty && (
                                <Chip
                                  label={module.difficulty}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    backgroundColor: levelData.color,
                                    color: 'white'
                                  }}
                                />
                              )}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    ))
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#999',
                        textAlign: 'center',
                        py: 2,
                        fontStyle: 'italic'
                      }}
                    >
                      No hay módulos disponibles en este nivel
                    </Typography>
                  )}
                </List>

                {/* Indicador de más módulos */}
                {allModules.filter(m => m.level === levelData.id).length > 5 && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 2,
                      textAlign: 'center',
                      color: levelData.color,
                      fontWeight: 600,
                      fontStyle: 'italic'
                    }}
                  >
                    +{allModules.filter(m => m.level === levelData.id).length - 5} módulos más disponibles
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

QuickAccessLessons.propTypes = {
  allModules: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      level: PropTypes.string.isRequired,
      order: PropTypes.number.isRequired,
      duration: PropTypes.number,
      estimatedTime: PropTypes.string,
      difficulty: PropTypes.string,
      lessons: PropTypes.array
    })
  ).isRequired,
  handleSectionClick: PropTypes.func.isRequired,
  isMobile: PropTypes.bool
};

QuickAccessLessons.defaultProps = {
  isMobile: false
};

export default QuickAccessLessons;

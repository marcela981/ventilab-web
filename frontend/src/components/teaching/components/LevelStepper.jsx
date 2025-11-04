"use client";

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Tooltip,
  IconButton
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
  Bookmark
} from '@mui/icons-material';
import { curriculumData, getModulesByLevel } from '../../../data/curriculumData';

/**
 * LevelStepper - Componente de stepper por niveles
 *
 * Muestra el camino de aprendizaje organizado por niveles con sus módulos.
 *
 * @param {Object} levelProgress - Progreso por nivel
 * @param {Function} calculateProgress - Función para calcular progreso
 * @param {Function} isModuleAvailable - Función para verificar disponibilidad
 * @param {Function} getModuleStatus - Función para obtener estado del módulo
 * @param {Function} getTooltipMessage - Función para obtener mensaje de tooltip
 * @param {Function} onSectionClick - Callback al hacer clic en un módulo
 * @param {Set} favoriteModules - Set de módulos favoritos
 * @param {Function} onToggleFavorite - Callback para toggle de favorito
 * @returns {JSX.Element} Componente de stepper por niveles
 */
const LevelStepper = ({
  levelProgress = {},
  calculateProgress,
  isModuleAvailable,
  getModuleStatus,
  getTooltipMessage,
  onSectionClick,
  favoriteModules = new Set(),
  onToggleFavorite
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 4,
        mb: 4,
        backgroundColor: 'background.paper',
        borderRadius: 3
      }}
    >
      <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700, mb: 3, textAlign: 'center' }}>
        🗺️ Tu Camino de Aprendizaje
      </Typography>

      {/* Stepper visual por niveles */}
      <Stepper orientation="vertical" sx={{ mb: 3 }}>
        {curriculumData.levels.map((level) => {
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
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {level.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
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
                  {levelModules.map((module) => {
                    const moduleProgress = calculateProgress(module.id);
                    const available = isModuleAvailable(module.id);
                    const status = getModuleStatus(module, moduleProgress);

                    return (
                      <Grid item xs={12} sm={6} md={4} key={module.id}>
                        <Tooltip title={getTooltipMessage(module, moduleProgress)} arrow placement="top">
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
                            onClick={() => available && onSectionClick(module.id)}
                          >
                            {/* Estado del módulo */}
                            <Box sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 1
                            }}>
                              {status === 'completed' && <CheckCircle sx={{ color: '#4CAF50' }} />}
                              {status === 'in-progress' && <TrendingUp sx={{ color: '#FF9800' }} />}
                              {status === 'available' && <LockOpen sx={{ color: '#2196F3' }} />}
                              {status === 'locked' && <Lock sx={{ color: '#9E9E9E' }} />}
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
                                  onToggleFavorite(module.id);
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
                                color: available ? 'text.primary' : 'text.disabled'
                              }}>
                                {module.title}
                              </Typography>

                              <Typography variant="body2" sx={{
                                color: 'text.secondary',
                                mb: 2,
                                fontSize: '0.85rem',
                                lineHeight: 1.4
                              }}>
                                {module.learningObjectives?.[0] || module.description}
                              </Typography>

                              {/* Progreso del módulo */}
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
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
  );
};

export default LevelStepper;

"use client";

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Stack,
  Tooltip,
  Avatar,
  Grid
} from '@mui/material';
import {
  LocalFireDepartment,
  EmojiEvents,
  TrendingUp
} from '@mui/icons-material';

/**
 * ProgressOverview - Componente de resumen de progreso
 *
 * Muestra estadísticas de racha, badges ganados y progreso temporal.
 *
 * @param {Object} dashboardData - Datos del dashboard (streak, badges, weeklyProgress)
 * @returns {JSX.Element} Componente de resumen de progreso
 */
const ProgressOverview = ({ dashboardData }) => {
  const { streak = 0, badges = [], weeklyProgress = [] } = dashboardData || {};

  return (
    <Grid container spacing={3}>
      {/* Sistema de Racha */}
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
                  {streak}
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
                  value={(streak / 30) * 100}
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
                  {30 - streak} días restantes
                </Typography>
              </Box>

              {/* Badges Ganados */}
              <Box>
                <Typography variant="body2" sx={{ color: '#f57c00', fontWeight: 600, mb: 1 }}>
                  Badges Ganados
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {badges.map((badge, index) => (
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

      {/* Gráfica de Progreso Temporal */}
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

            {/* Gráfica Simple */}
            <Box sx={{ height: 200, position: 'relative', mb: 2 }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'end',
                justifyContent: 'space-between',
                height: '100%',
                p: 2
              }}>
                {weeklyProgress.map((week, index) => (
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
    </Grid>
  );
};

export default ProgressOverview;

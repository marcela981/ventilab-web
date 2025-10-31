import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Avatar,
  Stack
} from '@mui/material';
import {
  LocalFireDepartment,
  EmojiEvents,
  TrendingUp,
  Assessment
} from '@mui/icons-material';
import ClientOnly from '../../../common/ClientOnly';

/**
 * ProgressOverview - Panel de estadísticas globales del usuario
 * 
 * Muestra métricas clave del progreso del usuario incluyendo:
 * - Tiempo total gastado
 * - Lecciones completadas
 * - Sistema de racha
 * - Badges ganados
 * 
 * @param {Object} globalStats - Estadísticas globales calculadas
 * @param {Object} dashboardData - Datos del dashboard (streak, badges, etc.)
 */
const ProgressOverview = ({ 
  globalStats, 
  dashboardData 
}) => {
  return (
    <ClientOnly fallback={
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        mb: 3,
        flexWrap: 'wrap'
      }}>
        <Box sx={{ 
          backgroundColor: '#e3f2fd', 
          padding: 2, 
          borderRadius: 2,
          border: '1px solid #bbdefb'
        }}>
          <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 600 }}>
            Tiempo en sesión: 0 min
          </Typography>
        </Box>
        <Box sx={{ 
          backgroundColor: '#e8f5e8', 
          padding: 2, 
          borderRadius: 2,
          border: '1px solid #c8e6c9'
        }}>
          <Typography variant="body2" sx={{ color: '#388e3c', fontWeight: 600 }}>
            Lecciones completadas: 0
          </Typography>
        </Box>
      </Box>
    }>
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        mb: 3,
        flexWrap: 'wrap'
      }}>
        <Box sx={{ 
          backgroundColor: '#e3f2fd', 
          padding: 2, 
          borderRadius: 2,
          border: '1px solid #bbdefb'
        }}>
          <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 600 }}>
            Tiempo en sesión: {globalStats.totalTimeSpent} min
          </Typography>
        </Box>
        <Box sx={{ 
          backgroundColor: '#e8f5e8', 
          padding: 2, 
          borderRadius: 2,
          border: '1px solid #c8e6c9'
        }}>
          <Typography variant="body2" sx={{ color: '#388e3c', fontWeight: 600 }}>
            Lecciones completadas: {globalStats.completedLessons}
          </Typography>
        </Box>
      </Box>

      <Card 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          backgroundColor: '#ffffff',
          border: '1px solid #e3f2fd',
          borderRadius: 3
        }}
      >
        <Typography variant="h5" sx={{ 
          mb: 3, 
          color: '#1976d2', 
          fontWeight: 700,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1
        }}>
          <Assessment sx={{ fontSize: 28 }} />
          Dashboard de Aprendizaje
        </Typography>

        <Grid container spacing={3}>
          {/* Cuadrante Superior Derecho - Sistema de Racha */}
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
                      {dashboardData.streak}
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
                      value={(dashboardData.streak / 30) * 100}
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
                      {30 - dashboardData.streak} días restantes
                    </Typography>
                  </Box>

                  {/* Badges Ganados */}
                  <Box>
                    <Typography variant="body2" sx={{ color: '#f57c00', fontWeight: 600, mb: 1 }}>
                      Badges Ganados
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {dashboardData.badges.map((badge, index) => (
                        <Avatar key={index} sx={{ 
                          width: 32, 
                          height: 32, 
                          backgroundColor: '#f57c00',
                          border: '2px solid #ffcc02'
                        }}>
                          <EmojiEvents sx={{ fontSize: 18, color: 'white' }} />
                        </Avatar>
                      ))}
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Cuadrante Inferior Izquierdo - Gráfica de Progreso Temporal */}
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
                
                {/* Placeholder para gráfica - se implementará en la fase 2 */}
                <Box sx={{ 
                  height: 200, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  borderRadius: 2
                }}>
                  <Typography variant="body2" sx={{ color: '#388e3c' }}>
                    Gráfica de progreso semanal
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Card>
    </ClientOnly>
  );
};

ProgressOverview.propTypes = {
  globalStats: PropTypes.shape({
    totalTimeSpent: PropTypes.number.isRequired,
    completedLessons: PropTypes.number.isRequired
  }).isRequired,
  dashboardData: PropTypes.shape({
    streak: PropTypes.number.isRequired,
    badges: PropTypes.array.isRequired
  }).isRequired
};

export default ProgressOverview;

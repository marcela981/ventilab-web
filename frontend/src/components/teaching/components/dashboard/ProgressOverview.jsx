import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Grid,
  LinearProgress,
  Paper,
  useTheme
} from '@mui/material';
import {
  TrendingUp,
  CheckCircle,
  AccessTime,
  PlayArrow
} from '@mui/icons-material';

/**
 * ProgressOverview - Panel de métricas esenciales del progreso del usuario
 *
 * Muestra las 4 métricas más importantes:
 * - Progreso general
 * - Lecciones completadas
 * - Tiempo total invertido
 * - Próxima lección recomendada
 *
 * @param {Object} globalStats - Estadísticas globales calculadas
 * @param {Object} dashboardData - Datos del dashboard
 */
const ProgressOverview = ({
  globalStats,
  dashboardData
}) => {
  const theme = useTheme();

  // Calcular progreso general
  const overallProgress = globalStats.totalLessons > 0
    ? Math.round((globalStats.completedLessons / globalStats.totalLessons) * 100)
    : 0;

  // Formatear tiempo invertido
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}min`;
  };

  // Obtener título de la próxima lección
  const nextLessonTitle = dashboardData.nextLesson?.title || 'No disponible';

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {/* Progreso General */}
      <Grid item xs={12} sm={6}>
        <Paper
          elevation={2}
          sx={{
            p: theme.spacing(2),
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TrendingUp sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Progreso General
              </Typography>
              <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                {overallProgress}%
              </Typography>
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={overallProgress}
            color="primary"
            sx={{
              height: 8,
              borderRadius: theme.shape.borderRadius
            }}
          />
        </Paper>
      </Grid>

      {/* Lecciones Completadas */}
      <Grid item xs={12} sm={6}>
        <Paper
          elevation={2}
          sx={{
            p: theme.spacing(2),
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Lecciones Completadas
              </Typography>
              <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                {globalStats.completedLessons}/{globalStats.totalLessons || 0}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* Tiempo Total Invertido */}
      <Grid item xs={12} sm={6}>
        <Paper
          elevation={2}
          sx={{
            p: theme.spacing(2),
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AccessTime sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Tiempo Total Invertido
              </Typography>
              <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                {formatTime(globalStats.totalTimeSpent || 0)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* Próxima Lección Recomendada */}
      <Grid item xs={12} sm={6}>
        <Paper
          elevation={2}
          sx={{
            p: theme.spacing(2),
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PlayArrow sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Próxima Lección
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {nextLessonTitle}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

ProgressOverview.propTypes = {
  globalStats: PropTypes.shape({
    totalTimeSpent: PropTypes.number.isRequired,
    completedLessons: PropTypes.number.isRequired,
    totalLessons: PropTypes.number
  }).isRequired,
  dashboardData: PropTypes.shape({
    nextLesson: PropTypes.shape({
      title: PropTypes.string
    })
  }).isRequired
};

export default ProgressOverview;

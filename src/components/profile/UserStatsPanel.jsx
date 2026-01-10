/**
 * =============================================================================
 * UserStatsPanel Component for VentyLab
 * =============================================================================
 * Displays comprehensive user learning statistics with real-time data from API.
 *
 * Features:
 * - Learning progress statistics with visual cards
 * - Module and lesson completion tracking
 * - Study time and streak tracking
 * - Global animated progress bar
 * - Recent activity timeline (last 5 lessons)
 * - Achievement badges
 * - Responsive grid layout
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  LinearProgress,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Alert,
  Paper,
} from '@mui/material';
import {
  School as SchoolIcon,
  MenuBook as MenuBookIcon,
  Timer as TimerIcon,
  Whatshot as FireIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { getProfileStats } from '@/services/authService';
import { useNotification } from '@/contexts/NotificationContext';

/**
 * Format minutes to human readable time
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time string
 */
const formatTime = (minutes) => {
  if (!minutes || minutes === 0) return '0 minutos';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'} ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  } else {
    return `${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
  }
};

/**
 * Format relative time (e.g., "Hace 2 días")
 * @param {string} date - ISO date string
 * @returns {string} Relative time string
 */
const formatRelativeTime = (date) => {
  if (!date) return 'Nunca';

  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Justo ahora';
  if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays < 30) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;

  const diffMonths = Math.floor(diffDays / 30);
  return `Hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
};

/**
 * StatCard Component - Displays a single statistic with icon and value
 */
function StatCard({ icon, title, value, subtitle, color, animate }) {
  return (
    <Card
      elevation={3}
      sx={{
        height: '100%',
        borderRadius: 3,
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: 6,
        },
        background: animate
          ? `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`
          : 'background.paper',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              bgcolor: `${color}.lighter`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              boxShadow: 2,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ textTransform: 'uppercase', letterSpacing: 1 }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              fontWeight={800}
              color={`${color}.main`}
              sx={{ lineHeight: 1.2 }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

StatCard.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  color: PropTypes.string.isRequired,
  animate: PropTypes.bool,
};

/**
 * UserStatsPanel Component
 *
 * @param {Object} props - Component props
 * @param {string} props.userId - User ID to fetch stats for
 *
 * @example
 * <UserStatsPanel userId="user-id-123" />
 */
export function UserStatsPanel({ userId }) {
  const router = useRouter();
  const { showError } = useNotification();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Call API using authService
        const response = await getProfileStats();

        if (response.success && response.data) {
          setStats(response.data);
        } else {
          const errorMsg = response.error?.message || 'Error al cargar las estadísticas';
          setError(errorMsg);
          showError(errorMsg);
        }
      } catch (err) {
        console.error('Error fetching user stats:', err);
        const errorMsg = 'Error inesperado al cargar las estadísticas. Por favor, intenta nuevamente.';
        setError(errorMsg);
        showError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchStats();
    }
  }, [userId, showError]);

  /**
   * Navigate to lesson
   */
  const handleLessonClick = (lessonId, moduleId) => {
    if (moduleId && lessonId) {
      router.push(`/teaching/${moduleId}/${lessonId}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
            }}
          >
            <CircularProgress size={48} />
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              Cargando estadísticas...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  // No stats
  if (!stats) {
    return null;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          📊 Estadísticas Personales
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Tu progreso de aprendizaje y logros
        </Typography>
      </Box>

      {/* Main Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Lessons Completed */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<MenuBookIcon sx={{ fontSize: 36, color: 'primary.main' }} />}
            title="Lecciones Completadas"
            value={`${stats.lessonsCompleted} / ${stats.totalLessons}`}
            subtitle={`${stats.totalLessons - stats.lessonsCompleted} restantes`}
            color="primary"
          />
        </Grid>

        {/* Modules Completed */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<SchoolIcon sx={{ fontSize: 36, color: 'secondary.main' }} />}
            title="Módulos Completados"
            value={`${stats.modulesCompleted} / ${stats.totalModules}`}
            subtitle={`${stats.totalModules - stats.modulesCompleted} restantes`}
            color="secondary"
          />
        </Grid>

        {/* Total Study Time */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<TimerIcon sx={{ fontSize: 36, color: 'info.main' }} />}
            title="Tiempo de Estudio"
            value={formatTime(stats.totalTime)}
            subtitle="Total acumulado"
            color="info"
          />
        </Grid>

        {/* Streak Days */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<FireIcon sx={{ fontSize: 36, color: 'error.main' }} />}
            title="Racha Actual"
            value={`🔥 ${stats.streakDays}`}
            subtitle={`${stats.streakDays === 1 ? 'día consecutivo' : 'días consecutivos'}`}
            color="error"
            animate={stats.streakDays > 0}
          />
        </Grid>
      </Grid>

      {/* Last Activity Card */}
      <Card elevation={3} sx={{ borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'success.lighter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScheduleIcon sx={{ fontSize: 32, color: 'success.main' }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                ÚLTIMA ACTIVIDAD
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatRelativeTime(stats.lastActivity)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Global Progress Bar */}
      <Card elevation={3} sx={{ borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TrendingUpIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={700}>
              Progreso Global
            </Typography>
          </Box>
          
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Contenido completado
              </Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {stats.progressPercent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stats.progressPercent}
              sx={{
                height: 12,
                borderRadius: 6,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                  animation: stats.progressPercent > 0 ? 'progress-animation 2s ease-in-out' : 'none',
                },
                '@keyframes progress-animation': {
                  '0%': {
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                  },
                  '100%': {
                    transform: 'scaleX(1)',
                    transformOrigin: 'left',
                  },
                },
              }}
            />
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            Has completado {stats.lessonsCompleted} de {stats.totalLessons} lecciones en total
          </Typography>
        </CardContent>
      </Card>

      {/* Recent Activity Timeline */}
      {stats.recentLessons && stats.recentLessons.length > 0 && (
        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main' }} />
              <Typography variant="h6" fontWeight={700}>
                Actividad Reciente
              </Typography>
            </Box>

            <List disablePadding>
              {stats.recentLessons.map((lesson, index) => (
                <React.Fragment key={lesson.id}>
                  <ListItemButton
                    onClick={() => handleLessonClick(lesson.id, lesson.moduleId)}
                    sx={{
                      borderRadius: 2,
                      mb: index < stats.recentLessons.length - 1 ? 1 : 0,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: 'success.lighter',
                          color: 'success.main',
                        }}
                      >
                        <CheckCircleIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight={600}>
                          {lesson.title}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                          <Chip
                            label={formatRelativeTime(lesson.completedAt)}
                            size="small"
                            sx={{ fontSize: '0.7rem' }}
                          />
                          <Chip
                            label={formatTime(lesson.timeSpent)}
                            size="small"
                            icon={<TimerIcon />}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                    />
                  </ListItemButton>
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* No Recent Activity */}
      {(!stats.recentLessons || stats.recentLessons.length === 0) && (
        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
              }}
            >
              <MenuBookIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aún no has completado ninguna lección
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ¡Comienza a aprender para ver tu progreso aquí!
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

UserStatsPanel.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default UserStatsPanel;

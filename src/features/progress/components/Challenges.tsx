import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  useTheme
} from '@mui/material';
import {
  Today,
  CalendarMonth,
  PlayArrow,
  CheckCircle,
  AccessTime
} from '@mui/icons-material';
import { Challenge } from '../types';
import { trackEvent } from '../utils/analytics';

interface ChallengesProps {
  daily?: Challenge;
  weekly?: Challenge;
  onStart: (id: string) => void;
}

/**
 * Challenges - Componente con dos tarjetas: reto del día y misión semanal
 * 
 * Muestra:
 * - Reto del día (5-10 min) con rewardXP y ctaLabel
 * - Misión semanal con estado iniciado/completado
 */
const Challenges: React.FC<ChallengesProps> = ({
  daily,
  weekly,
  onStart
}) => {
  const theme = useTheme();

  // Formatear duración de minutos a texto legible
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}min`;
  };

  // Determinar si el reto semanal está iniciado (tiene progreso pero no completado)
  const isWeeklyStarted = weekly && weekly.progress !== undefined && weekly.progress > 0 && !weekly.completed;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Reto del Día */}
      {daily && (
        <Card
          sx={{
            border: '1px solid rgba(33, 150, 243, 0.3)',
            borderRadius: 2,
            background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(25, 118, 210, 0.1) 100%)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              borderColor: 'rgba(33, 150, 243, 0.5)',
              boxShadow: '0 4px 12px rgba(33, 150, 243, 0.2)'
            }
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Today sx={{ fontSize: 20, color: '#2196F3' }} />
              <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '0.95rem' }}>
                Reto del Día
              </Typography>
            </Box>

            {/* Título y descripción */}
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, mb: 0.75, fontSize: '1.1rem' }}>
              {daily.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f4fd', opacity: 0.9, mb: 1.5, fontSize: '0.875rem' }}>
              {daily.description}
            </Typography>

            {/* Información del reto */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<AccessTime sx={{ fontSize: 14 }} />}
                label={formatDuration(daily.duration)}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#e8f4fd',
                  fontSize: '0.75rem',
                  height: 24,
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              />
              <Chip
                label={`+${daily.xpReward} XP`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 215, 0, 0.2)',
                  color: '#FFD700',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  height: 24,
                  border: '1px solid rgba(255, 215, 0, 0.3)'
                }}
              />
            </Box>

            {/* Barra de progreso si está en progreso */}
            {daily.progress !== undefined && daily.progress > 0 && !daily.completed && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color: '#e8f4fd', fontWeight: 600, fontSize: '0.7rem' }}>
                    Progreso
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#2196F3', fontWeight: 700, fontSize: '0.7rem' }}>
                    {daily.progress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={daily.progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #2196F3, #42a5f5)',
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            )}

            {/* Botón CTA */}
            <Button
              variant={daily.completed ? 'outlined' : 'contained'}
              fullWidth
              size="medium"
              startIcon={daily.completed ? <CheckCircle sx={{ fontSize: 18 }} /> : <PlayArrow sx={{ fontSize: 18 }} />}
              onClick={() => {
                trackEvent('challenge_start_click', {
                  challengeId: daily.id,
                  challengeType: 'daily',
                  title: daily.title,
                  xpReward: daily.xpReward,
                  duration: daily.duration,
                  progress: daily.progress
                });
                onStart(daily.id);
              }}
              disabled={daily.completed}
              data-analytics-id={`challenge-start-daily-${daily.id}`}
              aria-label={daily.completed ? `Reto del día "${daily.title}" completado` : `Comenzar reto del día: ${daily.title}`}
              sx={{
                backgroundColor: daily.completed ? 'transparent' : '#2196F3',
                borderColor: '#2196F3',
                color: daily.completed ? '#2196F3' : '#ffffff',
                fontWeight: 600,
                textTransform: 'none',
                py: 1.25,
                borderRadius: 1.5,
                fontSize: '0.875rem',
                '&:hover': {
                  backgroundColor: daily.completed ? 'rgba(33, 150, 243, 0.1)' : '#1976D2',
                  transform: 'scale(1.02)'
                },
                '&.Mui-disabled': {
                  borderColor: 'rgba(33, 150, 243, 0.3)',
                  color: 'rgba(33, 150, 243, 0.5)'
                }
              }}
            >
              {daily.completed ? 'Completado' : 'Comenzar Reto'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Misión Semanal */}
      {weekly && (
        <Card
          sx={{
            border: weekly.completed 
              ? '1px solid rgba(76, 175, 80, 0.4)' 
              : isWeeklyStarted
              ? '1px solid rgba(255, 152, 0, 0.4)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            background: weekly.completed
              ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.1) 100%)'
              : isWeeklyStarted
              ? 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 111, 0, 0.1) 100%)'
              : 'rgba(255, 255, 255, 0.05)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              borderColor: weekly.completed 
                ? 'rgba(76, 175, 80, 0.6)' 
                : isWeeklyStarted
                ? 'rgba(255, 152, 0, 0.6)'
                : 'rgba(255, 255, 255, 0.2)',
              boxShadow: weekly.completed
                ? '0 4px 12px rgba(76, 175, 80, 0.2)'
                : isWeeklyStarted
                ? '0 4px 12px rgba(255, 152, 0, 0.2)'
                : '0 4px 12px rgba(0, 0, 0, 0.15)'
            }
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            {/* Header con estado */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonth sx={{ fontSize: 20, color: weekly.completed ? '#4CAF50' : isWeeklyStarted ? '#FF9800' : '#e8f4fd' }} />
                <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '0.95rem' }}>
                  Misión Semanal
                </Typography>
              </Box>
              {weekly.completed && (
                <Chip
                  icon={<CheckCircle sx={{ fontSize: 14 }} />}
                  label="Completado"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    color: '#4CAF50',
                    border: '1px solid rgba(76, 175, 80, 0.3)',
                    fontWeight: 600,
                    height: 24,
                    fontSize: '0.7rem'
                  }}
                />
              )}
              {isWeeklyStarted && (
                <Chip
                  label="En progreso"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    color: '#FF9800',
                    border: '1px solid rgba(255, 152, 0, 0.3)',
                    fontWeight: 600,
                    height: 24,
                    fontSize: '0.7rem'
                  }}
                />
              )}
            </Box>

            {/* Título y descripción */}
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, mb: 0.75, fontSize: '1.1rem' }}>
              {weekly.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f4fd', opacity: 0.9, mb: 1.5, fontSize: '0.875rem' }}>
              {weekly.description}
            </Typography>

            {/* Información del reto */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<AccessTime sx={{ fontSize: 14 }} />}
                label={formatDuration(weekly.duration)}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#e8f4fd',
                  fontSize: '0.75rem',
                  height: 24,
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              />
              <Chip
                label={`+${weekly.xpReward} XP`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 215, 0, 0.2)',
                  color: '#FFD700',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  height: 24,
                  border: '1px solid rgba(255, 215, 0, 0.3)'
                }}
              />
              {weekly.deadline && (
                <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.7, fontSize: '0.7rem' }}>
                  Vence: {new Date(weekly.deadline).toLocaleDateString()}
                </Typography>
              )}
            </Box>

            {/* Barra de progreso si está iniciado */}
            {isWeeklyStarted && weekly.progress !== undefined && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color: '#e8f4fd', fontWeight: 600, fontSize: '0.7rem' }}>
                    Progreso
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#FF9800', fontWeight: 700, fontSize: '0.7rem' }}>
                    {weekly.progress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={weekly.progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #FF9800, #FFB74D)',
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            )}

            {/* Botón CTA */}
            <Button
              variant={weekly.completed ? 'outlined' : 'contained'}
              fullWidth
              size="medium"
              startIcon={weekly.completed ? <CheckCircle sx={{ fontSize: 18 }} /> : <PlayArrow sx={{ fontSize: 18 }} />}
              onClick={() => {
                trackEvent('challenge_start_click', {
                  challengeId: weekly.id,
                  challengeType: 'weekly',
                  title: weekly.title,
                  xpReward: weekly.xpReward,
                  duration: weekly.duration,
                  progress: weekly.progress,
                  isStarted: isWeeklyStarted
                });
                onStart(weekly.id);
              }}
              disabled={weekly.completed}
              data-analytics-id={`challenge-start-weekly-${weekly.id}`}
              aria-label={weekly.completed ? `Misión semanal "${weekly.title}" completada` : isWeeklyStarted ? `Continuar misión semanal: ${weekly.title}` : `Iniciar misión semanal: ${weekly.title}`}
              sx={{
                backgroundColor: weekly.completed 
                  ? 'transparent' 
                  : isWeeklyStarted 
                  ? '#FF9800' 
                  : '#2196F3',
                borderColor: weekly.completed 
                  ? '#4CAF50' 
                  : isWeeklyStarted 
                  ? '#FF9800' 
                  : '#2196F3',
                color: weekly.completed ? '#4CAF50' : '#ffffff',
                fontWeight: 600,
                textTransform: 'none',
                py: 1.25,
                borderRadius: 1.5,
                fontSize: '0.875rem',
                '&:hover': {
                  backgroundColor: weekly.completed 
                    ? 'rgba(76, 175, 80, 0.1)' 
                    : isWeeklyStarted 
                    ? '#F57C00' 
                    : '#1976D2',
                  transform: 'scale(1.02)'
                },
                '&.Mui-disabled': {
                  borderColor: 'rgba(76, 175, 80, 0.3)',
                  color: 'rgba(76, 175, 80, 0.5)'
                }
              }}
            >
              {weekly.completed ? 'Completado' : isWeeklyStarted ? 'Continuar Misión' : 'Iniciar Misión'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mensaje si no hay retos */}
      {!daily && !weekly && (
        <Card
          sx={{
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            p: 3,
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" sx={{ color: '#e8f4fd', opacity: 0.7 }}>
            No hay retos disponibles en este momento
          </Typography>
        </Card>
      )}
    </Box>
  );
};

export default Challenges;

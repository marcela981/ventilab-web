import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Button,
  Chip,
  Tooltip,
  useTheme,
  Skeleton,
  CircularProgress
} from '@mui/material';
import {
  LocalFireDepartment,
  PlayArrow,
  AccessTime
} from '@mui/icons-material';
import { TodayOverview, StreakInfo } from '../types';
import { trackEvent } from '../utils/analytics';

interface ProgressOverviewCardProps {
  today: TodayOverview;
  streak: StreakInfo;
  onStartNext?: () => void;
  onOpenStreakInfo?: () => void;
  loading?: boolean;
}

/**
 * ProgressOverviewCard - Card presentacional de resumen de progreso
 * 
 * Muestra:
 * - Racha (chip 🔥) con información de días consecutivos
 * - XP de hoy
 * - Nivel + subtítulo de rol
 * - CTA "Siguiente mejor paso" con duración estimada y micro-recompensa (+10 XP)
 * 
 * Incluye estados de carga y vacío, con accesibilidad completa.
 */
const ProgressOverviewCard: React.FC<ProgressOverviewCardProps> = ({
  today,
  streak,
  onStartNext,
  onOpenStreakInfo,
  loading = false
}) => {
  const theme = useTheme();

  // Valores por defecto seguros para evitar errores
  const safeStreak = streak || {
    streak: 0,
    lastSessionDate: null,
    isActive: false
  };

  const safeToday = today || {
    xpToday: 0,
    level: 1,
    roleSubtitle: 'Sin rol',
    nextStep: undefined
  };

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

  // Estado de carga
  if (loading) {
    return (
      <Card
        sx={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease'
        }}
        aria-label="Cargando información de progreso"
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header skeleton */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="circular" width={48} height={48} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={28} />
                <Skeleton variant="text" width="40%" height={20} />
              </Box>
              <Skeleton variant="rectangular" width={80} height={28} sx={{ borderRadius: 1 }} />
            </Box>
            {/* XP skeleton */}
            <Box>
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 1 }} />
            </Box>
            {/* CTA skeleton */}
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 1.5 }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Estado vacío (sin datos)
  const isEmpty = !today || !streak || (!safeToday.xpToday && safeToday.xpToday !== 0);

  return (
    <Card
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }
      }}
      aria-label="Resumen de progreso de hoy"
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header: Racha + Nivel + Rol */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between',
            mb: 2.5,
            gap: 1.5
          }}
        >
          {/* Racha chip */}
          <Chip
            icon={<LocalFireDepartment sx={{ fontSize: 16 }} />}
            label={safeStreak.streak}
            size="small"
            onClick={onOpenStreakInfo}
            sx={{
              backgroundColor: safeStreak.isActive 
                ? 'rgba(255, 152, 0, 0.2)' 
                : 'rgba(255, 255, 255, 0.05)',
              color: safeStreak.isActive ? '#FF9800' : '#e8f4fd',
              border: `1px solid ${safeStreak.isActive ? 'rgba(255, 152, 0, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
              fontWeight: 700,
              fontSize: '0.875rem',
              height: 32,
              cursor: onOpenStreakInfo ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              '&:hover': onOpenStreakInfo ? {
                backgroundColor: safeStreak.isActive 
                  ? 'rgba(255, 152, 0, 0.3)' 
                  : 'rgba(255, 255, 255, 0.1)',
                transform: 'scale(1.05)'
              } : {},
              '& .MuiChip-icon': {
                color: safeStreak.isActive ? '#FF9800' : '#e8f4fd'
              }
            }}
            aria-label={`Racha de ${safeStreak.streak} días consecutivos${safeStreak.isActive ? ' activa' : ''}`}
          />

          {/* Nivel y Rol */}
          <Box sx={{ flex: 1, textAlign: 'right' }}>
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#ffffff', 
                fontWeight: 700,
                mb: 0.25,
                lineHeight: 1.2
              }}
              aria-label={`Nivel ${safeToday.level}`}
            >
              Nivel {safeToday.level}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#e8f4fd', 
                opacity: 0.8,
                fontSize: '0.75rem',
                display: 'block'
              }}
              aria-label={`Rol: ${safeToday.roleSubtitle}`}
            >
              {safeToday.roleSubtitle}
            </Typography>
          </Box>
        </Box>

        {/* XP de hoy */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#e8f4fd', 
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              XP de hoy
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#2196F3', 
                fontWeight: 700,
                fontSize: '1.25rem'
              }}
              aria-label={`${safeToday.xpToday} puntos de experiencia ganados hoy`}
            >
              {safeToday.xpToday} XP
            </Typography>
          </Box>
          {/* Barra de progreso visual (opcional, basada en XP del día) */}
          {!isEmpty && safeToday.xpToday > 0 && (
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (safeToday.xpToday / 100) * 100)} // Normalizar a 100 XP = 100%
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #2196F3, #42a5f5)',
                  borderRadius: 3
                }
              }}
              aria-label={`Progreso de XP de hoy: ${Math.min(100, (safeToday.xpToday / 100) * 100)}%`}
            />
          )}
        </Box>

        {/* CTA: Siguiente mejor paso */}
        {!isEmpty && safeToday.nextStep ? (
          <Tooltip title={`Recomendado para tu nivel actual. Te llevará aproximadamente ${formatDuration(safeToday.nextStep.duration)}.`} arrow>
            <Button
              variant="contained"
              fullWidth
              size="medium"
              onClick={() => {
                trackEvent('progress_next_step_click', {
                  stepTitle: safeToday.nextStep?.title,
                  duration: safeToday.nextStep?.duration,
                  xpReward: safeToday.nextStep?.xpReward,
                  level: safeToday.level
                });
                onStartNext?.();
              }}
              data-analytics-id="progress-next-step"
              aria-label={`Siguiente mejor paso: ${safeToday.nextStep.title}, duración estimada ${formatDuration(safeToday.nextStep.duration)}, recompensa ${safeToday.nextStep.xpReward} XP`}
              sx={{
              backgroundColor: '#2196F3',
              color: '#ffffff',
              fontWeight: 600,
              textTransform: 'none',
              py: 1.5,
              px: 2,
              borderRadius: 1.5,
              fontSize: '0.875rem',
              boxShadow: 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 1,
              '&:hover': {
                backgroundColor: '#1976D2',
                transform: 'scale(1.02)',
                boxShadow: '0 4px 8px rgba(33, 150, 243, 0.3)'
              }
            }}
            aria-label={`Siguiente mejor paso: ${safeToday.nextStep.title}, duración estimada ${formatDuration(safeToday.nextStep.duration)}, recompensa ${safeToday.nextStep.xpReward} XP`}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <PlayArrow sx={{ fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, textAlign: 'left' }}>
                Siguiente mejor paso
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pl: 4 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.75rem',
                  opacity: 0.95,
                  flex: 1,
                  textAlign: 'left'
                }}
              >
                {safeToday.nextStep.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTime sx={{ fontSize: 14, opacity: 0.9 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.9 }}>
                    {formatDuration(safeToday.nextStep.duration)}
                  </Typography>
                </Box>
                <Chip
                  label={`+${safeToday.nextStep.xpReward} XP`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    border: 'none'
                  }}
                  aria-label={`Recompensa: ${safeToday.nextStep.xpReward} puntos de experiencia`}
                />
              </Box>
            </Box>
            </Button>
          </Tooltip>
        ) : (
          <Box
            sx={{
              p: 2,
              textAlign: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 1.5,
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}
            aria-label="No hay próximos pasos disponibles"
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#e8f4fd', 
                opacity: 0.6,
                fontSize: '0.875rem'
              }}
            >
              Completa tu progreso actual para desbloquear nuevas actividades.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgressOverviewCard;


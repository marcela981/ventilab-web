import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Button,
  Skeleton
} from '@mui/material';
import {
  PlayArrow,
  EmojiEvents,
  TrendingUp,
  AccessTime
} from '@mui/icons-material';
import { OverviewToday } from '../types';

interface DashboardOverviewCardProps {
  data: OverviewToday;
  onContinue: () => void;
  loading?: boolean;
}

/**
 * DashboardOverviewCard - Card presentacional con "Continuar donde quedaste"
 * 
 * Muestra:
 * - "Continuar donde quedaste" (título lección, estMin, barra %)
 * - XP de hoy
 * - Nivel + rol
 * - Botón primario "Continuar"
 * - Estados empty/loading
 */
const DashboardOverviewCard: React.FC<DashboardOverviewCardProps> = ({
  data,
  onContinue,
  loading = false
}) => {
  if (loading) {
    return (
      <Card
        sx={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2
        }}
      >
        <CardContent>
          <Skeleton variant="text" width="60%" height={30} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 1 }} />
          <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="30%" height={30} />
        </CardContent>
      </Card>
    );
  }

  const isEmpty = !data.lessonTitle && data.xpToday === 0;

  return (
    <Card
      sx={{
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        height: '100%',
        transition: 'all 0.25s ease-in-out',
        '&:hover': {
          borderColor: 'rgba(255, 255, 255, 0.2)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)'
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Continuar donde quedaste */}
        {data.lessonTitle ? (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{
                color: '#e8f4fd',
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: 1,
                mb: 1,
                display: 'block'
              }}
            >
              Continuar donde quedaste
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: '#ffffff',
                fontWeight: 600,
                mb: 1.5
              }}
            >
              {data.lessonTitle}
            </Typography>
            {data.estMin && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <AccessTime sx={{ fontSize: 16, color: '#e8f4fd' }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: '#e8f4fd',
                    fontSize: '0.875rem'
                  }}
                >
                  {data.estMin} min
                </Typography>
              </Box>
            )}
            {data.progressPercent !== undefined && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#e8f4fd',
                      fontSize: '0.7rem'
                    }}
                  >
                    Progreso
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#e8f4fd',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}
                  >
                    {data.progressPercent}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={data.progressPercent}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#2196F3',
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{
                color: '#e8f4fd',
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: 1,
                mb: 1,
                display: 'block'
              }}
            >
              Continuar donde quedaste
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#e8f4fd',
                fontStyle: 'italic'
              }}
            >
              No hay lección en progreso
            </Typography>
          </Box>
        )}

        {/* XP Hoy */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            sx={{
              color: '#e8f4fd',
              fontSize: '0.75rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            XP Hoy
          </Typography>
          <Typography
            variant="h4"
            sx={{
              color: '#ffffff',
              fontWeight: 700,
              mt: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            {data.xpToday.toLocaleString()}
            <TrendingUp sx={{ fontSize: 24, color: '#4CAF50' }} />
          </Typography>
        </Box>

        {/* Nivel + Rol */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <EmojiEvents sx={{ fontSize: 20, color: '#FFD700' }} />
              Nivel {data.level}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#e8f4fd',
                fontSize: '0.875rem'
              }}
            >
              {data.role}
            </Typography>
          </Box>
        </Box>

        {/* Botón Continuar */}
        <Button
          variant="contained"
          fullWidth
          startIcon={<PlayArrow />}
          onClick={() => {
            if (typeof window !== 'undefined' && (window as any).analytics) {
              (window as any).analytics.track('continue', { id: 'continue' });
            } else {
              console.info('[Analytics] continue', { id: 'continue' });
            }
            onContinue();
          }}
          disabled={isEmpty}
          aria-label="Continuar donde quedaste"
          data-analytics-id="continue"
          sx={{
            backgroundColor: 'rgba(33, 150, 243, 0.3)',
            color: '#ffffff',
            border: '1px solid rgba(33, 150, 243, 0.5)',
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            py: 1.5,
            transition: 'all 0.25s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(33, 150, 243, 0.5)',
              borderColor: 'rgba(33, 150, 243, 0.7)',
              transform: 'scale(1.02)'
            },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.3)'
            }
          }}
        >
          Continuar
        </Button>
      </CardContent>
    </Card>
  );
};

export default DashboardOverviewCard;

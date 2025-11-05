import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Skeleton,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Timer,
  PlayArrow,
  Pause,
  Refresh
} from '@mui/icons-material';
import { FocusTimerState } from '../types';

interface FocusTimerProps {
  state: FocusTimerState;
  onToggle: () => void;
  onReset: () => void;
  loading?: boolean;
}

/**
 * FocusTimer - Timer Pomodoro simple (25/5) con botones Start/Pause y Reset
 * Sin cronómetro real (no efectos); presentacional
 */
const FocusTimer: React.FC<FocusTimerProps> = ({
  state,
  onToggle,
  onReset,
  loading = false
}) => {
  const formatTime = (mins: number, secs: number) => {
    const minutes = mins.toString().padStart(2, '0');
    const seconds = secs.toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const totalSeconds = state.minutes * 60 + state.seconds;
  const maxSeconds = state.mode === 'work' ? 25 * 60 : 5 * 60;
  const progress = ((maxSeconds - totalSeconds) / maxSeconds) * 100;

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
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        height: '100%'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h6"
          sx={{
            color: '#ffffff',
            fontWeight: 600,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Timer sx={{ fontSize: 20 }} />
          Focus Timer
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          {/* Timer circular */}
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={progress}
              size={180}
              thickness={4}
              sx={{
                color: state.mode === 'work' ? '#2196F3' : '#4CAF50',
                transform: 'rotate(-90deg)'
              }}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  color: '#ffffff',
                  fontWeight: 700
                }}
              >
                {formatTime(state.minutes, state.seconds)}
              </Typography>
              <Chip
                label={state.mode === 'work' ? 'Trabajo' : 'Descanso'}
                size="small"
                sx={{
                  mt: 1,
                  backgroundColor: state.mode === 'work' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(76, 175, 80, 0.2)',
                  color: '#ffffff',
                  border: `1px solid ${state.mode === 'work' ? 'rgba(33, 150, 243, 0.5)' : 'rgba(76, 175, 80, 0.5)'}`,
                  fontSize: '0.75rem',
                  textTransform: 'capitalize'
                }}
              />
            </Box>
          </Box>

          {/* Ciclos */}
          <Typography
            variant="body2"
            sx={{
              color: '#e8f4fd',
              fontSize: '0.875rem'
            }}
          >
            Ciclos completados: {state.cycles}
          </Typography>

          {/* Botones */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={state.isRunning ? <Pause /> : <PlayArrow />}
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).analytics) {
                  (window as any).analytics.track('timer-toggle', { id: 'timer-toggle' });
                } else {
                  console.info('[Analytics] timer-toggle', { id: 'timer-toggle' });
                }
                onToggle();
              }}
              aria-label={state.isRunning ? 'Pausar timer' : 'Iniciar timer'}
              data-analytics-id="timer-toggle"
              sx={{
                backgroundColor: 'rgba(33, 150, 243, 0.3)',
                color: '#ffffff',
                border: '1px solid rgba(33, 150, 243, 0.5)',
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                '&:hover': {
                  backgroundColor: 'rgba(33, 150, 243, 0.5)',
                  borderColor: 'rgba(33, 150, 243, 0.7)'
                }
              }}
            >
              {state.isRunning ? 'Pausar' : 'Iniciar'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).analytics) {
                  (window as any).analytics.track('timer-reset', { id: 'timer-reset' });
                } else {
                  console.info('[Analytics] timer-reset', { id: 'timer-reset' });
                }
                onReset();
              }}
              aria-label="Reiniciar timer"
              data-analytics-id="timer-reset"
              sx={{
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Reiniciar
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default FocusTimer;

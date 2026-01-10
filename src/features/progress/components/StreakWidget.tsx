import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  LocalFireDepartment,
  Whatshot,
  AcUnit
} from '@mui/icons-material';
import { StreakInfo } from '../types';
import { trackEvent } from '../utils/analytics';

// Usar icono de acUnit para representar congelar
const FreezeIcon = AcUnit;

interface StreakWidgetProps {
  streak: StreakInfo;
  onUseFreeze?: () => void;
}

const StreakWidget: React.FC<StreakWidgetProps> = ({
  streak,
  onUseFreeze
}) => {
  const theme = useTheme();

  // Valores por defecto seguros para evitar errores
  const safeStreak = streak || {
    streak: 0,
    lastSessionDate: null,
    isActive: false,
    longestStreak: 0,
    hasFreezeToken: false
  };

  const currentStreak = safeStreak.streak || 0;
  const longestStreak = safeStreak.longestStreak || currentStreak;
  const hasFreezeToken = safeStreak.hasFreezeToken || false;

  const streakMultiplier = currentStreak >= 7 ? 2 : currentStreak >= 3 ? 1.5 : 1;

  return (
    <Card
      sx={{
        border: '1px solid rgba(255, 152, 0, 0.3)',
        borderRadius: 2,
        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 87, 34, 0.15) 100%)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: 'rgba(255, 152, 0, 0.5)',
          boxShadow: '0 8px 16px rgba(255, 152, 0, 0.2)'
        }
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography
            variant="subtitle1"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              fontSize: '0.95rem'
            }}
          >
            <LocalFireDepartment sx={{ fontSize: 20, color: '#FF9800' }} />
            Racha de Días
          </Typography>
          {currentStreak >= 7 && (
            <Chip
              icon={<Whatshot sx={{ fontSize: 14 }} />}
              label="¡Racha Caliente!"
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 87, 34, 0.3)',
                color: '#FF5722',
                border: '1px solid rgba(255, 87, 34, 0.5)',
                fontWeight: 600,
                height: 22,
                fontSize: '0.7rem'
              }}
            />
          )}
        </Box>

        {/* Racha actual - destacada */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <LocalFireDepartment
            sx={{
              fontSize: 48,
              color: '#FF9800',
              mb: 0.75,
              animation: currentStreak > 0 ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' }
              }
            }}
          />
          <Typography variant="h3" sx={{ color: '#ffffff', fontWeight: 700, mb: 0.25 }}>
            {currentStreak}
          </Typography>
          <Typography variant="body2" sx={{ color: '#e8f4fd', fontWeight: 600, fontSize: '0.85rem' }}>
            Días Consecutivos
          </Typography>
          {streakMultiplier > 1 && (
            <Chip
              label={`x${streakMultiplier} XP`}
              size="small"
              sx={{
                mt: 0.75,
                backgroundColor: 'rgba(255, 152, 0, 0.3)',
                color: '#ffffff',
                fontWeight: 600,
                height: 22,
                fontSize: '0.7rem'
              }}
            />
          )}
        </Box>

        {/* Estadísticas */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 1.5 }}>
          <Box sx={{ flex: 1, textAlign: 'center', p: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1.5 }}>
            <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.8, mb: 0.25, fontSize: '0.65rem' }}>
              Racha más larga
            </Typography>
            <Typography variant="subtitle2" sx={{ color: '#FF9800', fontWeight: 700 }}>
              {longestStreak}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center', p: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1.5 }}>
            <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.8, mb: 0.25, fontSize: '0.65rem' }}>
              Estado
            </Typography>
            <Typography variant="subtitle2" sx={{ color: safeStreak.isActive ? '#4CAF50' : '#9e9e9e', fontWeight: 700 }}>
              {safeStreak.isActive ? 'Activa' : 'Inactiva'}
            </Typography>
          </Box>
        </Box>

        {/* Botón de comodín */}
        {hasFreezeToken && (
          <Tooltip title="Protege tu racha si no puedes estudiar hoy. Úsalo cuando realmente lo necesites.">
            <Button
              variant="outlined"
              fullWidth
              size="small"
              startIcon={<FreezeIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                trackEvent('streak_freeze_click', {
                  currentStreak,
                  longestStreak,
                  isActive: safeStreak.isActive
                });
                onUseFreeze?.();
              }}
              disabled={currentStreak === 0 || !safeStreak.isActive}
              data-analytics-id="streak-use-freeze"
              aria-label={`Usar comodín para congelar racha de ${currentStreak} días`}
              sx={{
                borderColor: '#2196F3',
                color: '#2196F3',
                fontWeight: 600,
                textTransform: 'none',
                py: 1,
                borderRadius: 1.5,
                fontSize: '0.75rem',
                '&:hover': {
                  borderColor: '#1976D2',
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  transform: 'scale(1.02)'
                },
                '&.Mui-disabled': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.4)'
                }
              }}
            >
              Usar Comodín
            </Button>
          </Tooltip>
        )}
      </CardContent>
    </Card>
  );
};

export default StreakWidget;


import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { LocalFireDepartment } from '@mui/icons-material';

interface StreakCardProps {
  streakDays: number;
  isActive: boolean;
  lastSessionDate?: string | null;
}

/**
 * StreakCard - Tarjeta compacta de racha
 */
export const StreakCard: React.FC<StreakCardProps> = ({
  streakDays,
  isActive,
  lastSessionDate
}) => {
  return (
    <Card
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        transition: 'all 0.3s ease'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <LocalFireDepartment
            sx={{
              fontSize: 28,
              color: isActive ? '#FF5722' : '#9e9e9e',
              animation: isActive ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.7 }
              }
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
              {streakDays} {streakDays === 1 ? 'día' : 'días'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.7 }}>
              Racha consecutiva
            </Typography>
          </Box>
          {isActive && (
            <Chip
              label="Activa"
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 87, 34, 0.2)',
                color: '#FF5722',
                border: '1px solid rgba(255, 87, 34, 0.3)',
                fontWeight: 600
              }}
            />
          )}
        </Box>

        {lastSessionDate && (
          <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.6 }}>
            Última sesión: {new Date(lastSessionDate).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short'
            })}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default StreakCard;


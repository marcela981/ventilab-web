import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import { Star, TrendingUp } from '@mui/icons-material';

interface XpLevelCardProps {
  xpTotal: number;
  level: number;
  nextLevelXp: number;
  completedLessons: number;
  totalLessons: number;
}

/**
 * XpLevelCard - Tarjeta compacta de XP y nivel
 */
export const XpLevelCard: React.FC<XpLevelCardProps> = ({
  xpTotal,
  level,
  nextLevelXp,
  completedLessons,
  totalLessons
}) => {
  const currentLevelXp = (level - 1) * 5 * 100;
  const progressToNextLevel = nextLevelXp > currentLevelXp
    ? ((xpTotal - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 100;

  const courseProgress = totalLessons > 0
    ? (completedLessons / totalLessons) * 100
    : 0;

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
          <Star sx={{ fontSize: 24, color: '#FFD700' }} />
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
            Nivel {level}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#e8f4fd', fontSize: '0.875rem' }}>
              {xpTotal.toLocaleString()} XP
            </Typography>
            <Typography variant="body2" sx={{ color: '#2196F3', fontWeight: 600, fontSize: '0.875rem' }}>
              {Math.round(progressToNextLevel)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(progressToNextLevel, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                borderRadius: 4
              }
            }}
            aria-label={`Progreso al siguiente nivel: ${Math.round(progressToNextLevel)}%`}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <TrendingUp sx={{ fontSize: 16, color: '#4CAF50' }} />
          <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.8 }}>
            {completedLessons}/{totalLessons} lecciones ({Math.round(courseProgress)}%)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default XpLevelCard;


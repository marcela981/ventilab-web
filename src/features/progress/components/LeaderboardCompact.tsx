import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  useTheme
} from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  Info,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { LeaderboardSlice } from '../types';

interface LeaderboardCompactProps {
  slice: LeaderboardSlice;
  onOpenDetails?: () => void;
}

/**
 * LeaderboardCompact - Componente compacto de leaderboard
 * 
 * Muestra:
 * - Mejor marca personal
 * - Percentil de cohorte
 * - Nota de privacidad (opt-in)
 */
const LeaderboardCompact: React.FC<LeaderboardCompactProps> = ({
  slice,
  onOpenDetails
}) => {
  const theme = useTheme();

  // Valores por defecto seguros para evitar errores
  const safeSlice = slice || {
    personalBest: undefined,
    cohortPercentile: undefined,
    cohortSize: undefined,
    isOptedIn: true
  };

  const personalBest = safeSlice.personalBest;
  const cohortPercentile = safeSlice.cohortPercentile;
  const cohortSize = safeSlice.cohortSize;
  const isOptedIn = safeSlice.isOptedIn ?? true; // Por defecto asumimos opt-in si no se especifica

  // Obtener label de percentil
  const getPercentileLabel = (percentile?: number): string => {
    if (percentile === undefined || percentile === null) return 'N/A';
    if (percentile >= 90) return 'Top 10%';
    if (percentile >= 75) return 'Top 25%';
    if (percentile >= 50) return 'Top 50%';
    return 'Por debajo del 50%';
  };

  // Obtener color según percentil
  const getPercentileColor = (percentile?: number): string => {
    if (percentile === undefined || percentile === null) return '#9e9e9e';
    if (percentile >= 90) return '#FFD700';
    if (percentile >= 75) return '#9C27B0';
    if (percentile >= 50) return '#2196F3';
    return '#FF9800';
  };

  const percentileColor = getPercentileColor(cohortPercentile);

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
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography
            variant="h6"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75
            }}
          >
            <EmojiEvents sx={{ fontSize: 24, color: '#FFD700' }} />
            Ranking
          </Typography>
          {onOpenDetails && (
            <Button
              size="small"
              onClick={onOpenDetails}
              sx={{
                color: '#2196F3',
                textTransform: 'none',
                fontSize: '0.75rem',
                minWidth: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(33, 150, 243, 0.1)'
                }
              }}
            >
              Ver más
            </Button>
          )}
        </Box>

        {/* Mejor marca personal */}
        {personalBest && (
          <Box
            sx={{
              mb: 2.5,
              p: 2,
              border: personalBest.rank <= 3 
                ? '1px solid rgba(255, 215, 0, 0.4)' 
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              backgroundColor: personalBest.rank <= 3
                ? 'rgba(255, 215, 0, 0.1)'
                : 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s ease'
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#e8f4fd', 
                fontWeight: 600, 
                mb: 1.5,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}
            >
              Mejor marca personal
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: personalBest.rank <= 3 
                    ? 'rgba(255, 215, 0, 0.2)' 
                    : 'rgba(33, 150, 243, 0.2)',
                  border: `2px solid ${personalBest.rank <= 3 ? '#FFD700' : '#2196F3'}`,
                  color: personalBest.rank <= 3 ? '#FFD700' : '#2196F3',
                  fontWeight: 700,
                  fontSize: '1.25rem'
                }}
              >
                #{personalBest.rank}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 700, mb: 0.25 }}>
                  {personalBest.username}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    icon={<TrendingUp sx={{ fontSize: 14 }} />}
                    label={`Nivel ${personalBest.level}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#e8f4fd',
                      fontSize: '0.7rem',
                      height: 22,
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Estadísticas */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1.5 }}>
                <Typography variant="h6" sx={{ color: '#2196F3', fontWeight: 700, mb: 0.5 }}>
                  {personalBest.xp.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.8, fontSize: '0.7rem' }}>
                  XP Total
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1.5 }}>
                <Typography variant="h6" sx={{ color: personalBest.rank <= 3 ? '#FFD700' : '#4CAF50', fontWeight: 700, mb: 0.5 }}>
                  #{personalBest.rank}
                </Typography>
                <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.8, fontSize: '0.7rem' }}>
                  Posición
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Percentil de cohorte */}
        {cohortPercentile !== undefined && cohortPercentile !== null && (
          <Box sx={{ mb: 2.5 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#e8f4fd', 
                fontWeight: 600, 
                mb: 1.5,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}
            >
              Percentil cohorte
            </Typography>
            
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Typography variant="body2" sx={{ color: '#e8f4fd', fontWeight: 600, fontSize: '0.875rem' }}>
                  Tu posición
                </Typography>
                <Typography variant="h6" sx={{ color: percentileColor, fontWeight: 700 }}>
                  {getPercentileLabel(cohortPercentile)}
                </Typography>
              </Box>
              
              <Box
                sx={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  mb: 0.75
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${cohortPercentile}%`,
                    background: `linear-gradient(90deg, ${percentileColor}, ${percentileColor}80)`,
                    borderRadius: 4,
                    transition: 'width 0.4s ease'
                  }}
                />
              </Box>

              {cohortSize && (
                <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.7, fontSize: '0.75rem' }}>
                  Mejor que el {cohortPercentile}% de {cohortSize} estudiante{cohortSize !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Nota de privacidad (opt-in) */}
        <Box
          sx={{
            mt: 2.5,
            pt: 2,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1
          }}
        >
          {isOptedIn ? (
            <Visibility sx={{ fontSize: 16, color: '#4CAF50', mt: 0.25, flexShrink: 0 }} />
          ) : (
            <VisibilityOff sx={{ fontSize: 16, color: '#9e9e9e', mt: 0.25, flexShrink: 0 }} />
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#e8f4fd', fontWeight: 600, mb: 0.25, fontSize: '0.75rem', display: 'block' }}>
              {isOptedIn ? 'Visibilidad: Pública' : 'Visibilidad: Privada'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.7, fontSize: '0.7rem', lineHeight: 1.4 }}>
              {isOptedIn 
                ? 'Tu progreso aparece en el ranking público. Puedes cambiar esto en configuración.'
                : 'Tu progreso no aparece públicamente. Activa la opción en configuración para participar.'}
            </Typography>
          </Box>
        </Box>

        {/* Estado vacío */}
        {!personalBest && (cohortPercentile === undefined || cohortPercentile === null) && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EmojiEvents sx={{ fontSize: 48, color: '#e8f4fd', opacity: 0.3, mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#e8f4fd', opacity: 0.7 }}>
              Aún no hay datos de ranking disponibles
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardCompact;

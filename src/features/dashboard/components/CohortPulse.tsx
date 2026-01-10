import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  Chip
} from '@mui/material';
import {
  People,
  TrendingUp,
  BarChart
} from '@mui/icons-material';
import { CohortSnapshot } from '../types';

interface CohortPulseProps {
  data: CohortSnapshot;
  loading?: boolean;
}

/**
 * CohortPulse - Tarjeta pequeña con percentil, usuarios activos y sesiones/semana (media)
 */
const CohortPulse: React.FC<CohortPulseProps> = ({
  data,
  loading = false
}) => {
  const getPercentileLabel = (percentile: number) => {
    if (percentile >= 90) return 'Top 10%';
    if (percentile >= 75) return 'Top 25%';
    if (percentile >= 50) return 'Top 50%';
    if (percentile >= 25) return 'Top 75%';
    return 'Top 100%';
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return '#4CAF50';
    if (percentile >= 75) return '#8BC34A';
    if (percentile >= 50) return '#FF9800';
    if (percentile >= 25) return '#FF5722';
    return '#9e9e9e';
  };

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
          <Skeleton variant="text" width="50%" height={30} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
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
          <People sx={{ fontSize: 20 }} />
          Tu Cohorte
        </Typography>

        {/* Percentil */}
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: `2px solid ${getPercentileColor(data.percentile)}`,
            textAlign: 'center'
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: getPercentileColor(data.percentile),
              fontWeight: 700,
              mb: 0.5
            }}
          >
            {data.percentile.toFixed(0)}%
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#e8f4fd',
              fontSize: '0.875rem',
              mb: 1
            }}
          >
            Percentil
          </Typography>
          <Chip
            label={getPercentileLabel(data.percentile)}
            size="small"
            sx={{
              backgroundColor: `${getPercentileColor(data.percentile)}20`,
              color: getPercentileColor(data.percentile),
              border: `1px solid ${getPercentileColor(data.percentile)}`,
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          />
        </Box>

        {/* Estadísticas */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Usuarios activos */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant="body2"
                sx={{
                  color: '#e8f4fd',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <People sx={{ fontSize: 16 }} />
                Usuarios activos
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                {data.activeUsers}
              </Typography>
            </Box>
          </Box>

          {/* Sesiones por semana */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant="body2"
                sx={{
                  color: '#e8f4fd',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <BarChart sx={{ fontSize: 16 }} />
                Sesiones/semana
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                {data.sessionsPerWeek.toFixed(1)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CohortPulse;

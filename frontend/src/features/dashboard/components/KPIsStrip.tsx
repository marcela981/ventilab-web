import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  LocalFireDepartment,
  EmojiEvents,
  TrendingUp,
  CheckCircle
} from '@mui/icons-material';
import { KPISet } from '../types';

interface KPIsStripProps {
  data: KPISet;
  loading?: boolean;
}

/**
 * KPIsStrip - Tira de KPIs con 4 chips
 * 
 * Muestra: XP total, Nivel, Racha (🔥), Dominio del módulo (% con mini-barra)
 * Sin lógica, sólo visual
 */
const KPIsStrip: React.FC<KPIsStripProps> = ({
  data,
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
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                width={120}
                height={80}
                sx={{ borderRadius: 1 }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* XP Total */}
          <Box
            sx={{
              flex: '1 1 auto',
              minWidth: 120,
              maxWidth: 200,
              p: 2,
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <TrendingUp sx={{ fontSize: 24, color: '#2196F3', mb: 0.5 }} />
            <Typography
              variant="caption"
              sx={{
                color: '#e8f4fd',
                fontSize: '0.7rem',
                display: 'block',
                mb: 0.5
              }}
            >
              XP Total
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontWeight: 700
              }}
            >
              {data.xpTotal.toLocaleString()}
            </Typography>
          </Box>

          {/* Nivel */}
          <Box
            sx={{
              flex: '1 1 auto',
              minWidth: 120,
              maxWidth: 200,
              p: 2,
              backgroundColor: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <EmojiEvents sx={{ fontSize: 24, color: '#FFD700', mb: 0.5 }} />
            <Typography
              variant="caption"
              sx={{
                color: '#e8f4fd',
                fontSize: '0.7rem',
                display: 'block',
                mb: 0.5
              }}
            >
              Nivel
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontWeight: 700
              }}
            >
              {data.level}
            </Typography>
          </Box>

          {/* Racha */}
          <Box
            sx={{
              flex: '1 1 auto',
              minWidth: 120,
              maxWidth: 200,
              p: 2,
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              border: '1px solid rgba(255, 152, 0, 0.3)',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <LocalFireDepartment sx={{ fontSize: 24, color: '#FF9800', mb: 0.5 }} />
            <Typography
              variant="caption"
              sx={{
                color: '#e8f4fd',
                fontSize: '0.7rem',
                display: 'block',
                mb: 0.5
              }}
            >
              Racha
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontWeight: 700
              }}
            >
              {data.streak} 🔥
            </Typography>
          </Box>

          {/* Dominio del módulo */}
          <Box
            sx={{
              flex: '1 1 auto',
              minWidth: 120,
              maxWidth: 200,
              p: 2,
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <CheckCircle sx={{ fontSize: 24, color: '#4CAF50', mb: 0.5 }} />
            <Typography
              variant="caption"
              sx={{
                color: '#e8f4fd',
                fontSize: '0.7rem',
                display: 'block',
                mb: 0.5
              }}
            >
              Dominio
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontWeight: 700,
                mb: 0.5
              }}
            >
              {data.moduleMastery.toFixed(0)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={data.moduleMastery}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#4CAF50',
                  borderRadius: 2
                }
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default KPIsStrip;

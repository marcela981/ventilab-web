import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Skeleton,
  Chip
} from '@mui/material';
import {
  AccessTime,
  PlayArrow,
  EmojiEvents
} from '@mui/icons-material';
import { SpotlightCase } from '../types';

interface CaseSpotlightProps {
  data: SpotlightCase;
  onStart: (id: string) => void;
  loading?: boolean;
}

/**
 * CaseSpotlight - Card grande con título, difficulty (badge), estMin, rewardXP, summary, tags
 * CTA "Iniciar caso"
 */
const CaseSpotlight: React.FC<CaseSpotlightProps> = ({
  data,
  onStart,
  loading = false
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'básico':
        return '#4CAF50';
      case 'intermedio':
        return '#FF9800';
      case 'avanzado':
        return '#f44336';
      default:
        return '#e8f4fd';
    }
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
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'transparent',
        border: '2px solid rgba(33, 150, 243, 0.3)',
        borderRadius: 2,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s ease-in-out',
        '&:hover': {
          borderColor: 'rgba(33, 150, 243, 0.5)',
          backgroundColor: 'rgba(33, 150, 243, 0.05)',
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h6"
          sx={{
            color: '#ffffff',
            fontWeight: 700,
            mb: 1.5
          }}
        >
          {data.title}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={data.difficulty}
            size="small"
            sx={{
              backgroundColor: 'transparent',
              color: getDifficultyColor(data.difficulty),
              border: `1px solid ${getDifficultyColor(data.difficulty)}`,
              fontSize: '0.7rem',
              height: 24
            }}
          />
          <Chip
            icon={<AccessTime sx={{ fontSize: 14 }} />}
            label={`${data.estMin} min`}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#e8f4fd',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '0.7rem',
              height: 24
            }}
          />
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: '#e8f4fd',
            mb: 2,
            lineHeight: 1.6
          }}
        >
          {data.summary}
        </Typography>

        {data.tags && data.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {data.tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                sx={{
                  backgroundColor: 'rgba(33, 150, 243, 0.2)',
                  color: '#ffffff',
                  border: '1px solid rgba(33, 150, 243, 0.5)',
                  fontSize: '0.7rem',
                  height: 22
                }}
              />
            ))}
          </Box>
        )}

        {/* Recompensa */}
        <Box
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <EmojiEvents sx={{ color: '#FFD700', fontSize: 20 }} />
          <Typography
            variant="body2"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem'
            }}
          >
            +{data.rewardXP} XP
          </Typography>
        </Box>

        <Button
          variant="contained"
          fullWidth
          startIcon={<PlayArrow />}
          onClick={() => {
            const analyticsId = `start-spotlight-${data.id}`;
            if (typeof window !== 'undefined' && (window as any).analytics) {
              (window as any).analytics.track('start-spotlight', { id: analyticsId });
            } else {
              console.info('[Analytics] start-spotlight', { id: analyticsId });
            }
            onStart(data.id);
          }}
          aria-label={`Iniciar caso: ${data.title}`}
          data-analytics-id={`start-spotlight-${data.id}`}
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
            }
          }}
        >
          Iniciar caso
        </Button>
      </CardContent>
    </Card>
  );
};

export default CaseSpotlight;

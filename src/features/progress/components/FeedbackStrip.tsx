import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  useTheme
} from '@mui/material';
import {
  ThumbUp,
  ArrowBack,
  ArrowForward,
  Close
} from '@mui/icons-material';
import { Feedback } from '../types';

interface FeedbackStripProps {
  feedback?: Feedback;
  onDismiss?: () => void;
  loading?: boolean;
}

const FeedbackStrip: React.FC<FeedbackStripProps> = ({
  feedback,
  onDismiss,
  loading = false
}) => {
  const theme = useTheme();

  if (loading || !feedback) {
    return null;
  }

  const getFeedbackConfig = (type: Feedback['type']) => {
    switch (type) {
      case 'up':
        return {
          icon: <ThumbUp />,
          color: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.15)',
          borderColor: 'rgba(76, 175, 80, 0.3)',
          label: '¡Bien hecho!'
        };
      case 'back':
        return {
          icon: <ArrowBack />,
          color: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.15)',
          borderColor: 'rgba(255, 152, 0, 0.3)',
          label: 'Revisar'
        };
      case 'forward':
        return {
          icon: <ArrowForward />,
          color: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.15)',
          borderColor: 'rgba(33, 150, 243, 0.3)',
          label: 'Siguiente paso'
        };
      default:
        return {
          icon: null,
          color: '#9e9e9e',
          backgroundColor: 'rgba(158, 158, 158, 0.15)',
          borderColor: 'rgba(158, 158, 158, 0.3)',
          label: 'Feedback'
        };
    }
  };

  const config = getFeedbackConfig(feedback.type);

  return (
    <Box
      sx={{
        p: 2,
        mb: 3,
        border: `2px solid ${config.borderColor}`,
        borderRadius: 2,
        backgroundColor: config.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        position: 'relative',
        animation: 'slideIn 0.3s ease-out',
        '@keyframes slideIn': {
          from: {
            transform: 'translateY(-20px)',
            opacity: 0
          },
          to: {
            transform: 'translateY(0)',
            opacity: 1
          }
        }
      }}
    >
      {/* Icono */}
      {config.icon && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: `${config.color}20`,
            color: config.color
          }}
        >
          {config.icon}
        </Box>
      )}

      {/* Mensaje */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Chip
            label={config.label}
            size="small"
            sx={{
              backgroundColor: `${config.color}20`,
              color: config.color,
              border: `1px solid ${config.color}40`,
              fontSize: '0.7rem',
              height: 20
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500 }}>
          {feedback.message}
        </Typography>
      </Box>

      {/* Acción */}
      {feedback.action && (
        <Button
          variant="outlined"
          size="small"
          onClick={feedback.action}
          sx={{
            borderColor: config.color,
            color: config.color,
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': {
              borderColor: config.color,
              backgroundColor: `${config.color}20`
            }
          }}
        >
          {feedback.type === 'up' ? 'Continuar' : feedback.type === 'back' ? 'Revisar' : 'Ir'}
        </Button>
      )}

      {/* Botón de cerrar */}
      {onDismiss && (
        <Button
          size="small"
          onClick={onDismiss}
          sx={{
            minWidth: 32,
            width: 32,
            height: 32,
            borderRadius: '50%',
            color: '#e8f4fd',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Close sx={{ fontSize: 18 }} />
        </Button>
      )}
    </Box>
  );
};

export default FeedbackStrip;


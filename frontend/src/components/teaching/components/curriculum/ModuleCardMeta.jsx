import React from 'react';
import PropTypes from 'prop-types';
import { Box, Chip, LinearProgress, Typography } from '@mui/material';
import { MenuBook } from '@mui/icons-material';
import { formatDuration, getProgressBarColor } from './moduleCardHelpers';
import styles from '@/styles/curriculum.module.css';

/**
 * Sección de metadatos de la ModuleCard (progreso y chips)
 */
const ModuleCardMeta = ({
  module,
  moduleProgress,
  isAvailable,
  status,
  theme
}) => {
  const progressBarColor = getProgressBarColor(status, theme);

  return (
    <div className={styles.cardMeta}>
      {/* Barra de progreso */}
      <Box sx={{ mb: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.75
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: isAvailable ? '#ffffff' : '#9e9e9e',
              opacity: isAvailable ? 0.95 : 0.7,
              fontSize: '0.7rem',
              fontWeight: 600,
              textShadow: isAvailable ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
            }}
          >
            Progreso
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: isAvailable ? '#ffffff' : '#9e9e9e',
              fontWeight: 700,
              fontSize: '0.75rem',
              textShadow: isAvailable ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
            }}
          >
            {moduleProgress.toFixed(0)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={moduleProgress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: progressBarColor,
              borderRadius: 4,
              transition: 'transform 0.3s ease-in-out',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }
          }}
        />
      </Box>

      {/* Chips de metadatos (dificultad, duración, lecciones) */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label={module.difficulty}
          size="small"
          variant="outlined"
          sx={{
            fontSize: '0.7rem',
            height: 24,
            fontWeight: 500,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            color: isAvailable ? '#ffffff !important' : '#9e9e9e',
            '& .MuiChip-label': {
              color: isAvailable ? '#ffffff !important' : '#9e9e9e',
            }
          }}
        />
        <Chip
          label={formatDuration(module.duration)}
          size="small"
          variant="outlined"
          sx={{
            fontSize: '0.7rem',
            height: 24,
            fontWeight: 500,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            color: isAvailable ? '#ffffff !important' : '#9e9e9e',
            '& .MuiChip-label': {
              color: isAvailable ? '#ffffff !important' : '#9e9e9e',
            }
          }}
        />
        {module.lessons && module.lessons.length > 0 && (
          <Chip
            icon={<MenuBook sx={{ fontSize: 14, color: isAvailable ? '#ffffff' : '#9e9e9e' }} />}
            label={`${module.lessons.length} lecciones`}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.7rem',
              height: 24,
              fontWeight: 500,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: isAvailable ? '#ffffff !important' : '#9e9e9e',
              '& .MuiChip-label': {
                color: isAvailable ? '#ffffff !important' : '#9e9e9e',
              },
              '& .MuiChip-icon': {
                color: isAvailable ? '#ffffff !important' : '#9e9e9e'
              }
            }}
          />
        )}
      </Box>
    </div>
  );
};

ModuleCardMeta.propTypes = {
  module: PropTypes.object.isRequired,
  moduleProgress: PropTypes.number.isRequired,
  isAvailable: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  theme: PropTypes.object.isRequired
};

export default ModuleCardMeta;


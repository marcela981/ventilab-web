/**
 * LessonProgressBar - Subtle sticky progress indicator for lesson views
 * 
 * Displays current progress at the top of the lesson with minimal UI.
 */

import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { keyframes } from '@mui/system';

// Pulse animation for saving indicator
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

interface LessonProgressBarProps {
  progress: number; // 0-100
  isSaving: boolean;
  lessonTitle: string;
}

/**
 * Subtle progress bar component - minimal design
 */
const LessonProgressBar: React.FC<LessonProgressBarProps> = ({
  progress,
  isSaving,
  lessonTitle,
}) => {
  const theme = useTheme();

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Determine progress color based on percentage
  const getProgressColor = (value: number): string => {
    if (value >= 90) return '#4caf50'; // Green
    if (value >= 50) return '#2196f3'; // Blue
    return '#607d8b'; // Grey-blue
  };

  const progressColor = getProgressColor(clampedProgress);

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar - 1,
        backgroundColor: 'transparent',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Subtle progress bar */}
      <LinearProgress
        variant="determinate"
        value={clampedProgress}
        sx={{
          height: 3,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: progressColor,
            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }}
      />

      {/* Minimal info */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: 2,
          py: 0.5,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Progress percentage */}
        <Typography
          variant="caption"
          sx={{
            color: progressColor,
            fontWeight: 600,
            fontSize: '0.75rem',
            mr: isSaving ? 1 : 0,
          }}
        >
          {Math.round(clampedProgress)}%
        </Typography>

        {/* Saving indicator */}
        {isSaving && (
          <CircularProgress
            size={12}
            thickness={4}
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              animation: `${pulse} 2s ease-in-out infinite`,
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default LessonProgressBar;

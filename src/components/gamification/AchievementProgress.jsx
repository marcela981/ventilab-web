/**
 * =============================================================================
 * AchievementProgress Component
 * =============================================================================
 * Reusable component for displaying progress toward a specific achievement.
 * Supports both linear and circular progress variants with different sizes.
 * 
 * Features:
 * - Linear and circular progress variants
 * - Multiple size options (small, medium, large)
 * - Shows completion status with checkmark
 * - Accessible with ARIA labels
 * - Smooth transitions
 * - Optimized with React.memo
 * 
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  LinearProgress,
  CircularProgress,
  Typography,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import useAchievementProgress from '../../hooks/useAchievementProgress';

/**
 * Size configuration for different variants
 */
const SIZE_CONFIG = {
  small: {
    linear: { height: 4 },
    circular: { size: 40 },
    fontSize: '0.75rem',
  },
  medium: {
    linear: { height: 6 },
    circular: { size: 60 },
    fontSize: '0.875rem',
  },
  large: {
    linear: { height: 8 },
    circular: { size: 80 },
    fontSize: '1rem',
  },
};

/**
 * AchievementProgress Component
 * 
 * Displays visual progress toward a specific achievement with support
 * for linear and circular progress bars.
 * 
 * @component
 * @example
 * // Linear progress bar
 * <AchievementProgress
 *   achievementType="LESSONS_10"
 *   variant="linear"
 *   size="medium"
 *   showLabel={true}
 * />
 * 
 * @example
 * // Circular progress
 * <AchievementProgress
 *   achievementType="STREAK_7_DAYS"
 *   variant="circular"
 *   size="large"
 * />
 */
function AchievementProgress({
  achievementType,
  variant = 'linear',
  size = 'medium',
  showLabel = true,
}) {
  const theme = useTheme();
  const progress = useAchievementProgress(achievementType);

  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.medium;

  // Handle loading state
  if (progress.loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={sizeConfig.circular.size} />
      </Box>
    );
  }

  // Handle error state
  if (progress.error) {
    return (
      <Typography variant="caption" color="error">
        Error al cargar progreso
      </Typography>
    );
  }

  // Handle completed state
  if (progress.isComplete) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: theme.palette.success.main,
        }}
      >
        <CheckCircleIcon sx={{ fontSize: sizeConfig.circular.size }} />
        {showLabel && (
          <Typography
            variant="body2"
            sx={{ fontSize: sizeConfig.fontSize, fontWeight: 'bold' }}
          >
            Completado
          </Typography>
        )}
      </Box>
    );
  }

  // Handle not started state
  if (!progress.isProgressive || progress.target === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: theme.palette.text.disabled,
        }}
      >
        {variant === 'linear' && (
          <LinearProgress
            variant="determinate"
            value={0}
            sx={{
              ...sizeConfig.linear,
              flexGrow: 1,
              bgcolor: theme.palette.grey[200],
            }}
          />
        )}
        {variant === 'circular' && (
          <CircularProgress
            variant="determinate"
            value={0}
            size={sizeConfig.circular.size}
            sx={{ color: theme.palette.grey[300] }}
          />
        )}
        {showLabel && (
          <Typography
            variant="body2"
            sx={{ fontSize: sizeConfig.fontSize, color: 'text.disabled' }}
          >
            0%
          </Typography>
        )}
      </Box>
    );
  }

  // Render based on variant
  if (variant === 'linear') {
    return (
      <Box
        sx={{
          width: '100%',
        }}
        aria-label={`Progreso: ${progress.current} de ${progress.target} (${progress.percentage}%)`}
      >
        {showLabel && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontSize: sizeConfig.fontSize }}
            >
              {progress.current} / {progress.target} completado
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: sizeConfig.fontSize, fontWeight: 'bold' }}
            >
              {progress.percentage}%
            </Typography>
          </Box>
        )}
        <LinearProgress
          variant="determinate"
          value={Math.min(100, progress.percentage)}
          sx={{
            ...sizeConfig.linear,
            bgcolor: theme.palette.grey[200],
            transition: 'transform 0.3s ease',
            '& .MuiLinearProgress-bar': {
              transition: 'transform 0.3s ease',
            },
          }}
        />
      </Box>
    );
  }

  // Circular variant
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label={`Progreso circular: ${progress.current} de ${progress.target} (${progress.percentage}%)`}
    >
      <CircularProgress
        variant="determinate"
        value={Math.min(100, progress.percentage)}
        size={sizeConfig.circular.size}
        thickness={4}
        sx={{
          color: theme.palette.primary.main,
          transition: 'transform 0.3s ease',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showLabel ? (
          <Typography
            variant="body2"
            component="div"
            sx={{
              fontSize: sizeConfig.fontSize,
              fontWeight: 'bold',
              color: theme.palette.text.primary,
            }}
          >
            {progress.percentage}%
          </Typography>
        ) : (
          <Typography
            variant="caption"
            component="div"
            sx={{
              fontSize: sizeConfig.fontSize,
              color: theme.palette.text.secondary,
            }}
          >
            {progress.current}/{progress.target}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

AchievementProgress.propTypes = {
  /**
   * Type of achievement to track progress for
   */
  achievementType: PropTypes.string.isRequired,
  /**
   * Progress variant: 'linear' or 'circular'
   */
  variant: PropTypes.oneOf(['linear', 'circular']),
  /**
   * Size of the progress indicator: 'small', 'medium', or 'large'
   */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  /**
   * Whether to show the progress label
   */
  showLabel: PropTypes.bool,
};

AchievementProgress.defaultProps = {
  variant: 'linear',
  size: 'medium',
  showLabel: true,
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(AchievementProgress);


/**
 * =============================================================================
 * LevelBadge Component for VentyLab
 * =============================================================================
 * Visual component that displays the user's current learning level with
 * appropriate icons, colors, and optional progress bar.
 *
 * Features:
 * - Three distinct levels: BEGINNER, INTERMEDIATE, ADVANCED
 * - Level-specific icons and colors
 * - Responsive sizing (small, medium, large)
 * - Optional progress bar to next level
 * - Fallback for invalid levels
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Chip, Box, LinearProgress, Typography } from '@mui/material';
import {
  LocalFlorist as BeginnerIcon,  // Plant/flower icon for BEGINNER
  School as IntermediateIcon,     // Student icon for INTERMEDIATE
  EmojiEvents as AdvancedIcon,    // Trophy icon for ADVANCED
  HelpOutline as UnknownIcon,     // Question mark for invalid level
} from '@mui/icons-material';

/**
 * Level configuration with display names, colors, and icons
 */
const LEVEL_CONFIG = {
  BEGINNER: {
    label: 'Principiante',
    icon: BeginnerIcon,
    color: 'success',  // Green
    bgColor: 'success.lighter',
    textColor: 'success.dark',
  },
  INTERMEDIATE: {
    label: 'Intermedio',
    icon: IntermediateIcon,
    color: 'info',  // Blue
    bgColor: 'info.lighter',
    textColor: 'info.dark',
  },
  ADVANCED: {
    label: 'Avanzado',
    icon: AdvancedIcon,
    color: 'warning',  // Gold/Purple
    bgColor: 'warning.lighter',
    textColor: 'warning.dark',
  },
};

/**
 * Fallback for invalid levels
 */
const FALLBACK_CONFIG = {
  label: 'Sin Nivel',
  icon: UnknownIcon,
  color: 'default',
  bgColor: 'grey.200',
  textColor: 'text.secondary',
};

/**
 * Size configurations for icons and text
 */
const SIZE_CONFIG = {
  small: {
    iconSize: 16,
    fontSize: '0.75rem',
    height: 24,
    progressHeight: 4,
    progressMarginTop: 0.5,
  },
  medium: {
    iconSize: 20,
    fontSize: '0.875rem',
    height: 32,
    progressHeight: 6,
    progressMarginTop: 1,
  },
  large: {
    iconSize: 24,
    fontSize: '1rem',
    height: 40,
    progressHeight: 8,
    progressMarginTop: 1.5,
  },
};

/**
 * LevelBadge Component
 *
 * @param {Object} props - Component props
 * @param {string} props.level - User level: 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'
 * @param {string} props.size - Badge size: 'small', 'medium', 'large' (default: 'medium')
 * @param {boolean} props.showProgressBar - Show progress bar to next level (default: false)
 * @param {number} props.progressToNextLevel - Progress percentage 0-100 (default: 0)
 * @param {boolean} props.showLabel - Show text label (default: true)
 * @param {Object} props.sx - Additional MUI sx styles (optional)
 *
 * @example
 * <LevelBadge level="BEGINNER" />
 *
 * @example
 * <LevelBadge
 *   level="INTERMEDIATE"
 *   size="large"
 *   showProgressBar={true}
 *   progressToNextLevel={75}
 * />
 */
export function LevelBadge({
  level,
  size = 'medium',
  showProgressBar = false,
  progressToNextLevel = 0,
  showLabel = true,
  sx = {},
}) {
  // Get level configuration
  const config = LEVEL_CONFIG[level] || FALLBACK_CONFIG;
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.medium;

  // Get the appropriate icon component
  const IconComponent = config.icon;

  // Clamp progress value between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progressToNextLevel));

  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column', ...sx }}>
      {/* Level Badge/Chip */}
      <Chip
        icon={<IconComponent style={{ fontSize: sizeConfig.iconSize }} />}
        label={showLabel ? config.label : null}
        color={config.color}
        size={size === 'small' ? 'small' : 'medium'}
        sx={{
          height: sizeConfig.height,
          fontSize: sizeConfig.fontSize,
          fontWeight: 600,
          backgroundColor: config.bgColor,
          color: config.textColor,
          '& .MuiChip-icon': {
            color: config.textColor,
          },
          // If no label, make it circular
          ...(!showLabel && {
            width: sizeConfig.height,
            '& .MuiChip-icon': {
              margin: 0,
            },
          }),
        }}
      />

      {/* Progress Bar (optional) */}
      {showProgressBar && (
        <Box sx={{ mt: sizeConfig.progressMarginTop, minWidth: 120 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: size === 'small' ? '0.65rem' : '0.75rem' }}
            >
              Progreso al siguiente nivel
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ fontSize: size === 'small' ? '0.65rem' : '0.75rem' }}
            >
              {clampedProgress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={clampedProgress}
            color={config.color}
            sx={{
              height: sizeConfig.progressHeight,
              borderRadius: 1,
              backgroundColor: config.bgColor,
              '& .MuiLinearProgress-bar': {
                borderRadius: 1,
                backgroundColor: config.textColor,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}

LevelBadge.propTypes = {
  level: PropTypes.oneOf(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showProgressBar: PropTypes.bool,
  progressToNextLevel: PropTypes.number,
  showLabel: PropTypes.bool,
  sx: PropTypes.object,
};

LevelBadge.defaultProps = {
  level: 'BEGINNER',
  size: 'medium',
  showProgressBar: false,
  progressToNextLevel: 0,
  showLabel: true,
  sx: {},
};

export default LevelBadge;

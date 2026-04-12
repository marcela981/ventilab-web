/**
 * =============================================================================
 * AchievementCard Component
 * =============================================================================
 * Individual achievement card component for displaying achievements in a gallery.
 * Shows unlocked achievements in full color with details, and locked achievements
 * in grayscale with minimal information.
 * 
 * Features:
 * - Locked/unlocked states with visual differentiation
 * - Progress bar for progressive achievements
 * - Rarity-based styling (COMMON, RARE, EPIC)
 * - Tooltip with additional information
 * - Responsive design
 * - Hover effects
 * 
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Tooltip,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Lock as LockIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * AchievementCard Component
 * 
 * Displays a single achievement in card format with lock/unlock states,
 * progress tracking, and rarity-based styling.
 * 
 * @component
 * @example
 * <AchievementCard
 *   achievement={{
 *     type: "FIRST_LESSON",
 *     title: "Primera Lección",
 *     description: "Completa tu primera lección",
 *     icon: "school",
 *     points: 10,
 *     rarity: "COMMON",
 *     unlockedAt: "2024-01-15T10:30:00Z"
 *   }}
 *   isLocked={false}
 *   progress={{ current: 7, target: 10, percentage: 70 }}
 *   onClick={() => console.log('Clicked')}
 * />
 */
function AchievementCard({ achievement, isLocked, progress, onClick }) {
  const theme = useTheme();

  if (!achievement) return null;

  // Get rarity colors
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'COMMON':
        return theme.palette.info.main;
      case 'RARE':
        return theme.palette.secondary.main;
      case 'EPIC':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const rarityColor = getRarityColor(achievement.rarity);
  const isEpic = achievement.rarity === 'EPIC';

  // Format unlock date
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  // Tooltip content
  const tooltipContent = (
    <Box>
      <Typography variant="subtitle2" fontWeight="bold">
        {achievement.title}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {achievement.description}
      </Typography>
      {achievement.condition && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {achievement.condition}
        </Typography>
      )}
      {progress && !isLocked && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Progreso: {progress.current} / {progress.target}
        </Typography>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Card
        onClick={onClick}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          opacity: isLocked ? 0.6 : 1,
          filter: isLocked ? 'grayscale(100%)' : 'none',
          position: 'relative',
          overflow: 'visible',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: isLocked
              ? theme.shadows[4]
              : `0 8px 24px ${rarityColor}30`,
            opacity: 1,
          },
          // Epic border effect
          ...(isEpic && !isLocked && {
            border: `2px solid ${rarityColor}`,
            boxShadow: `0 0 20px ${rarityColor}40`,
          }),
        }}
      >
        {/* Lock Icon Overlay */}
        {isLocked && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              bgcolor: 'rgba(0,0,0,0.7)',
              borderRadius: '50%',
              p: 0.5,
            }}
          >
            <LockIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
        )}

        {/* Icon Area */}
        <CardMedia
          sx={{
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isLocked
              ? theme.palette.grey[200]
              : `linear-gradient(135deg, ${rarityColor}15 0%, ${rarityColor}05 100%)`,
            position: 'relative',
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: isLocked ? theme.palette.grey[400] : rarityColor,
              boxShadow: isEpic && !isLocked ? `0 4px 20px ${rarityColor}60` : 'none',
            }}
          >
            <TrophyIcon sx={{ fontSize: 32, color: 'white' }} />
          </Avatar>
        </CardMedia>

        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          {/* Title */}
          <Typography
            variant="h6"
            component="h3"
            fontWeight="600"
            gutterBottom
            sx={{
              color: isLocked ? 'text.secondary' : 'text.primary',
              fontSize: '1rem',
              lineHeight: 1.3,
              minHeight: 40,
            }}
          >
            {achievement.title}
          </Typography>

          {/* Description (only if unlocked) */}
          {!isLocked && achievement.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                minHeight: 40,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {achievement.description}
            </Typography>
          )}

          {/* Locked hint */}
          {isLocked && achievement.condition && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: 'italic', display: 'block', mb: 2 }}
            >
              {achievement.condition}
            </Typography>
          )}

          {/* Progress Bar (if progress data available) */}
          {progress && !isLocked && progress.target > 0 && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Progreso
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {progress.current} / {progress.target}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, progress.percentage)}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    bgcolor: rarityColor,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
          )}

          {/* Unlock Date (if unlocked) */}
          {!isLocked && achievement.unlockedAt && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1 }}
            >
              Desbloqueado: {formatDate(achievement.unlockedAt)}
            </Typography>
          )}
        </CardContent>

        <CardActions
          sx={{
            justifyContent: 'space-between',
            px: 2,
            pb: 2,
            pt: 0,
          }}
        >
          {/* Points Badge */}
          <Chip
            label={`${achievement.points} pts`}
            size="small"
            sx={{
              bgcolor: isLocked ? theme.palette.grey[300] : rarityColor,
              color: 'white',
              fontWeight: 'bold',
            }}
          />

          {/* Rarity Badge */}
          {achievement.rarity && (
            <Chip
              label={achievement.rarity}
              size="small"
              sx={{
                bgcolor: isLocked
                  ? theme.palette.grey[300]
                  : rarityColor === theme.palette.warning.main
                  ? theme.palette.warning.dark
                  : rarityColor,
                color: 'white',
                fontSize: '0.65rem',
                height: 20,
              }}
            />
          )}
        </CardActions>
      </Card>
    </Tooltip>
  );
}

AchievementCard.propTypes = {
  /**
   * Achievement object with all achievement data
   */
  achievement: PropTypes.shape({
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    icon: PropTypes.string,
    points: PropTypes.number.isRequired,
    rarity: PropTypes.oneOf(['COMMON', 'RARE', 'EPIC']),
    unlockedAt: PropTypes.string,
    condition: PropTypes.string,
  }).isRequired,
  /**
   * Whether the achievement is locked
   */
  isLocked: PropTypes.bool.isRequired,
  /**
   * Progress data for progressive achievements
   */
  progress: PropTypes.shape({
    current: PropTypes.number,
    target: PropTypes.number,
    percentage: PropTypes.number,
  }),
  /**
   * Click handler for the card
   */
  onClick: PropTypes.func,
};

AchievementCard.defaultProps = {
  progress: null,
  onClick: null,
};

export default AchievementCard;


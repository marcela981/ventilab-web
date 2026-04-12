/**
 * =============================================================================
 * AchievementsDashboard Component
 * =============================================================================
 * Compact dashboard component showing a summary of user achievements.
 * Displays recent achievements and next goal to unlock.
 * 
 * Features:
 * - Last 3 unlocked achievements
 * - Next achievement goal with progress
 * - Quick statistics (total achievements, points)
 * - Link to full gallery
 * - Loading states with Skeleton
 * - Empty state with motivational message
 * - Compact design for dashboard integration
 * 
 * =============================================================================
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Box,
  Divider,
  IconButton,
  LinearProgress,
  Button,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  ArrowForward as ArrowForwardIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/router';
import useAchievements from '@/features/progress/hooks/useAchievements';
import { useNextAchievementGoal } from '@/features/progress/hooks/useAchievementProgress';

/**
 * AchievementsDashboard Component
 * 
 * Compact summary widget for displaying achievements in the main dashboard.
 * Shows recent unlocks and next goal to achieve.
 * 
 * @component
 * @example
 * <AchievementsDashboard />
 */
function AchievementsDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const {
    achievements,
    allAchievements,
    loading,
    totalAchievements,
    totalPoints,
    completionPercentage,
  } = useAchievements();

  // Get next achievement goal
  const nextGoal = useNextAchievementGoal('LESSONS_10'); // Start with first progression

  // Get last 3 unlocked achievements
  const recentAchievements = useMemo(() => {
    if (!achievements || achievements.length === 0) return [];

    return achievements
      .sort((a, b) => {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt) : new Date(0);
        const dateB = b.unlockedAt ? new Date(b.unlockedAt) : new Date(0);
        return dateB - dateA; // Newest first
      })
      .slice(0, 3);
  }, [achievements]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "d 'de' MMMM", { locale: es });
    } catch {
      return dateString;
    }
  };

  // Get rarity color
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'COMMON':
        return theme.palette.info.main;
      case 'RARE':
        return theme.palette.secondary.main;
      case 'EPIC':
        return theme.palette.warning.main;
      default:
        return theme.palette.primary.main;
    }
  };

  // Navigate to gallery
  const handleViewAll = () => {
    router.push('/achievements');
  };

  // Loading state
  if (loading) {
    return (
      <Card elevation={3} sx={{ height: '100%', minHeight: 400 }}>
        <CardHeader
          title={<Skeleton variant="text" width={150} />}
          action={<Skeleton variant="circular" width={32} height={32} />}
        />
        <CardContent>
          {[...Array(3)].map((_, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Skeleton variant="rectangular" height={60} />
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Empty state (no achievements)
  if (achievements.length === 0) {
    return (
      <Card elevation={3} sx={{ height: '100%', minHeight: 400 }}>
        <CardHeader
          title="Logros"
          avatar={
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              <TrophyIcon />
            </Avatar>
          }
          action={
            <IconButton onClick={handleViewAll} size="small">
              <ArrowForwardIcon />
            </IconButton>
          }
        />
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <TrophyIcon
              sx={{
                fontSize: 48,
                color: 'text.secondary',
                mb: 2,
                opacity: 0.5,
              }}
            />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Aún no has desbloqueado logros
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ¡Comienza a aprender para ganar tus primeros logros!
            </Typography>
          </Box>
        </CardContent>
        <CardActions>
          <Button size="small" onClick={handleViewAll}>
            Ver todos los logros
          </Button>
        </CardActions>
      </Card>
    );
  }

  return (
    <Card elevation={3} sx={{ height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="Logros Recientes"
        avatar={
          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
            <TrophyIcon />
          </Avatar>
        }
        action={
          <IconButton
            onClick={handleViewAll}
            size="small"
            aria-label="Ver todos los logros"
          >
            <ArrowForwardIcon />
          </IconButton>
        }
      />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Recent Achievements List */}
        {recentAchievements.length > 0 && (
          <List sx={{ mb: 2 }}>
            {recentAchievements.map((achievement, index) => (
              <React.Fragment key={achievement.type || achievement.id || index}>
                <ListItem
                  sx={{
                    px: 0,
                    py: 1.5,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: getRarityColor(achievement.rarity),
                        width: 40,
                        height: 40,
                      }}
                    >
                      <TrophyIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{ mb: 0.5 }}
                      >
                        {achievement.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(achievement.unlockedAt) || 'Recientemente'}
                      </Typography>
                    }
                  />
                  <Chip
                    label={`${achievement.points} pts`}
                    size="small"
                    sx={{
                      bgcolor: getRarityColor(achievement.rarity),
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      height: 22,
                    }}
                  />
                </ListItem>
                {index < recentAchievements.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Divider before next goal */}
        {nextGoal && <Divider sx={{ my: 2 }} />}

        {/* Next Achievement Goal */}
        {nextGoal && !nextGoal.isComplete && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LockIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
              <Typography variant="subtitle2" fontWeight="600">
                Próximo Logro
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {nextGoal.achievementData?.title || 'Siguiente objetivo'}
            </Typography>
            {nextGoal.achievementData?.description && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {nextGoal.achievementData.description}
              </Typography>
            )}
            {nextGoal.progress && nextGoal.target > 0 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Progreso
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {nextGoal.current} / {nextGoal.target}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, nextGoal.percentage)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Faltan {nextGoal.remaining} para desbloquear
                </Typography>
              </>
            )}
          </Box>
        )}

        {/* No next goal message */}
        {!nextGoal && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              ¡Has completado todos los hitos principales! 🎉
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Footer with Statistics */}
      <Divider />
      <CardActions
        sx={{
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Total: {totalAchievements} logros
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Puntos: {totalPoints} pts
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={handleViewAll}
          endIcon={<ArrowForwardIcon />}
        >
          Ver todos
        </Button>
      </CardActions>
    </Card>
  );
}

export default AchievementsDashboard;


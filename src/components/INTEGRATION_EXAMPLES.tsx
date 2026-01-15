/**
 * Integration Examples for Progress Components
 * 
 * Shows how to integrate the new progress tracking components
 * with existing ModuleCard and Dashboard components.
 */

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  CardContent,
  CardActions,
  Button,
  LinearProgress,
  Typography,
  Box,
  Chip,
  IconButton,
  Skeleton,
  Grid,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContinueIcon from '@mui/icons-material/PlayCircleOutline';
import ReviewIcon from '@mui/icons-material/Replay';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

import useModuleProgress from '@/hooks/useModuleProgress';
import { getModuleResumePoint } from '@/services/progressService';
import { formatHours, formatRelativeTime } from '@/utils/timeFormat';

// ============================================
// Example 1: Enhanced ModuleCard with Progress Tracking
// ============================================

interface ModuleCardEnhancedProps {
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string;
  difficulty: string;
  estimatedTime: number; // in minutes
  isFavorite: boolean;
  onToggleFavorite: (moduleId: string) => void;
}

export function ModuleCardEnhanced({
  moduleId,
  moduleTitle,
  moduleDescription,
  difficulty,
  estimatedTime,
  isFavorite,
  onToggleFavorite,
}: ModuleCardEnhancedProps) {
  const router = useRouter();
  const { moduleProgress, isLoading, moduleState } = useModuleProgress({ moduleId });
  const [isNavigating, setIsNavigating] = useState(false);

  // Handle navigation to module/lesson
  const handleStartModule = useCallback(async () => {
    setIsNavigating(true);
    try {
      // Navigate to first lesson
      router.push(`/modules/${moduleId}/lessons/1`);
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
    }
  }, [moduleId, router]);

  const handleContinueModule = useCallback(async () => {
    setIsNavigating(true);
    try {
      // Get resume point
      const resumePoint = await getModuleResumePoint(moduleId);
      
      if (resumePoint) {
        router.push(`/lessons/${resumePoint.lessonId}`);
      } else {
        // Fallback to first lesson
        router.push(`/modules/${moduleId}/lessons/1`);
      }
    } catch (error) {
      console.error('Resume error:', error);
      setIsNavigating(false);
    }
  }, [moduleId, router]);

  const handleReviewModule = useCallback(async () => {
    setIsNavigating(true);
    try {
      router.push(`/modules/${moduleId}/lessons/1`);
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
    }
  }, [moduleId, router]);

  // Render loading state
  if (isLoading) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="rectangular" height={60} sx={{ mt: 2 }} />
        </CardContent>
        <Skeleton variant="rectangular" height={4} />
        <CardActions>
          <Skeleton variant="rectangular" width={100} height={36} />
        </CardActions>
      </Card>
    );
  }

  // Determine button based on state
  const renderActionButton = () => {
    if (moduleState === 'not-started') {
      return (
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={handleStartModule}
          disabled={isNavigating}
          fullWidth
        >
          Comenzar
        </Button>
      );
    }

    if (moduleState === 'in-progress') {
      return (
        <Button
          variant="contained"
          startIcon={<ContinueIcon />}
          onClick={handleContinueModule}
          disabled={isNavigating}
          fullWidth
        >
          Continuar estudiando
        </Button>
      );
    }

    // Completed
    return (
      <Button
        variant="outlined"
        startIcon={<ReviewIcon />}
        onClick={handleReviewModule}
        disabled={isNavigating}
        fullWidth
      >
        Revisar
      </Button>
    );
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover': {
          boxShadow: 4,
        },
        transition: 'box-shadow 0.3s',
      }}
    >
      <CardContent sx={{ flex: 1, pb: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
            {moduleTitle}
          </Typography>
          
          {/* Favorite button */}
          <IconButton
            size="small"
            onClick={() => onToggleFavorite(moduleId)}
            sx={{ ml: 1 }}
          >
            {isFavorite ? (
              <FavoriteIcon color="error" fontSize="small" />
            ) : (
              <FavoriteBorderIcon fontSize="small" />
            )}
          </IconButton>
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {moduleDescription}
        </Typography>

        {/* Metadata */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={difficulty} size="small" />
          <Chip label={formatHours(estimatedTime)} size="small" variant="outlined" />
          {moduleProgress && (
            <Chip
              label={`${moduleProgress.completedLessons}/${moduleProgress.totalLessons} lecciones`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {/* Progress section */}
        {moduleState === 'not-started' ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {moduleProgress?.totalLessons || 0} lecciones
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tiempo estimado: {formatHours(estimatedTime)}
            </Typography>
          </Box>
        ) : moduleState === 'in-progress' ? (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Progreso
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {moduleProgress?.progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={moduleProgress?.progress || 0}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {moduleProgress?.completedLessons}/{moduleProgress?.totalLessons} lecciones completadas
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            <Typography variant="body2" color="success.main" fontWeight="bold">
              {moduleProgress?.completedLessons}/{moduleProgress?.totalLessons} lecciones completadas
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Bottom border progress indicator */}
      {moduleState === 'in-progress' && (
        <LinearProgress
          variant="determinate"
          value={moduleProgress?.progress || 0}
          sx={{ height: 4 }}
        />
      )}

      {/* Actions */}
      <CardActions sx={{ px: 2, pb: 2 }}>
        {renderActionButton()}
      </CardActions>
    </Card>
  );
}

// ============================================
// Example 2: Dashboard Progress Section
// ============================================

import useSWR from 'swr';
import { getUserOverview, progressFetcher } from '@/services/progressService';

export function DashboardProgressSection() {
  const {
    data: overview,
    error,
    isLoading,
    mutate,
  } = useSWR('/progress/overview', progressFetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
  });

  if (isLoading) {
    return (
      <Box sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={4} key={i}>
              <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="error">Error al cargar progreso</Typography>
        <Button onClick={() => mutate()} sx={{ mt: 2 }}>
          Reintentar
        </Button>
      </Box>
    );
  }

  if (!overview) return null;

  const totalLessonsCompleted = overview.overview.completedLessons || 0;
  const totalLessons = overview.overview.totalLessons || 0;
  const modulesInProgress = overview.modules.filter(
    (m: any) => m.progress > 0 && m.progress < 100
  ).length;
  const totalTimeSpent = overview.modules.reduce(
    (sum: number, m: any) => sum + (m.timeSpent || 0),
    0
  );

  return (
    <Box sx={{ py: 4 }}>
      {/* Section header */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Mi Progreso
      </Typography>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight="bold">
                {totalLessonsCompleted}/{totalLessons}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lecciones completadas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight="bold">
                {modulesInProgress}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Módulos en progreso
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight="bold">
                {formatHours(totalTimeSpent)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tiempo estudiado
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Continue studying section */}
      {overview.lastAccessedModule && (
        <>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Continuar Estudiando
          </Typography>
          
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {overview.lastAccessedModule.moduleTitle}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Última sesión: {formatRelativeTime(overview.lastAccessedModule.lastAccess)}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Progreso</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {overview.lastAccessedModule.progress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={overview.lastAccessedModule.progress}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>

              <Button
                variant="contained"
                startIcon={<ContinueIcon />}
                fullWidth
                onClick={async () => {
                  const resumePoint = await getModuleResumePoint(
                    overview.lastAccessedModule.moduleId
                  );
                  if (resumePoint) {
                    window.location.href = `/lessons/${resumePoint.lessonId}`;
                  }
                }}
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Recent modules */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Módulos Recientes
      </Typography>

      <Grid container spacing={2}>
        {overview.modules
          .filter((m: any) => m.progress > 0 && m.progress < 100)
          .slice(0, 3)
          .map((module: any) => (
            <Grid item xs={12} md={4} key={module.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom noWrap>
                    {module.title}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">Progreso</Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {module.progress}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={module.progress}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>

                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    onClick={async () => {
                      const resumePoint = await getModuleResumePoint(module.id);
                      if (resumePoint) {
                        window.location.href = `/lessons/${resumePoint.lessonId}`;
                      }
                    }}
                  >
                    Continuar
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>
    </Box>
  );
}

export default {
  ModuleCardEnhanced,
  DashboardProgressSection,
};

/**
 * =============================================================================
 * RecommendationsPanel Component for VentyLab
 * =============================================================================
 * Displays personalized content recommendations based on user's learning level
 * and progress. Fetches recommendations from the backend API and presents them
 * in an engaging, user-friendly interface.
 *
 * Features:
 * - Fetches personalized recommendations from /api/recommendations
 * - Displays recommendations in responsive Material UI Cards
 * - Shows difficulty level chips with consistent LevelBadge colors
 * - Distinguishes "next_step" from "reinforcement" recommendations
 * - Handles loading, error, and empty states
 * - Provides navigation to recommended modules/lessons
 * - Fully responsive design with Material UI Grid
 *
 * Usage:
 * - Can be used in the main dashboard
 * - Can be used in a dedicated recommendations page
 *
 * @example
 * <RecommendationsPanel />
 *
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Alert,
  Skeleton,
  Paper,
} from '@mui/material';
import {
  PlayArrow,
  AccessTime,
  Warning as WarningIcon,
  EmojiEvents,
  Lightbulb,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { LevelBadge } from '@/components/common/LevelBadge';

/**
 * Get level color based on difficulty
 * Consistent with LevelBadge component
 */
const getLevelColor = (level) => {
  const normalizedLevel = level?.toUpperCase();
  const colors = {
    BEGINNER: 'success',
    INTERMEDIATE: 'info',
    ADVANCED: 'warning',
  };
  return colors[normalizedLevel] || 'default';
};

/**
 * Get level display name
 */
const getLevelName = (level) => {
  const normalizedLevel = level?.toUpperCase();
  const names = {
    BEGINNER: 'Principiante',
    INTERMEDIATE: 'Intermedio',
    ADVANCED: 'Avanzado',
  };
  return names[normalizedLevel] || level;
};

/**
 * RecommendationsPanel Component
 *
 * Displays personalized learning recommendations based on user level and progress
 */
export function RecommendationsPanel() {
  const router = useRouter();
  const { user } = useAuth();

  // ============================================================================
  // State Management
  // ============================================================================
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================================
  // Fetch Recommendations from API
  // ============================================================================
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const response = await fetch('/api/recommendations', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error al cargar recomendaciones: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.data?.recommendations) {
          setRecommendations(result.data.recommendations);
        } else {
          throw new Error(result.error?.message || 'Error al cargar recomendaciones');
        }
      } catch (err) {
        console.error('❌ [RecommendationsPanel] Error fetching recommendations:', err);
        setError(err.message || 'Error al cargar las recomendaciones');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user?.id]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Navigate to module/lesson
   */
  const handleStartLesson = (moduleId, lessonId = null) => {
    if (lessonId) {
      router.push(`/teaching/${moduleId}/${lessonId}`);
    } else {
      router.push(`/teaching?module=${moduleId}`);
    }
  };

  // ============================================================================
  // Render Loading State
  // ============================================================================
  if (loading) {
    return (
      <Box>
        {/* Header Skeleton */}
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width="40%" height={40} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="60%" height={24} />
        </Box>

        {/* Cards Skeleton */}
        <Grid container spacing={3}>
          {[1, 2, 3].map((index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card elevation={2}>
                <CardContent>
                  <Skeleton variant="rectangular" width={100} height={24} sx={{ mb: 2 }} />
                  <Skeleton variant="text" width="90%" height={32} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
                  <Skeleton variant="text" width="40%" height={20} />
                </CardContent>
                <CardActions>
                  <Skeleton variant="rectangular" width={140} height={36} />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // ============================================================================
  // Render Error State
  // ============================================================================
  if (error) {
    return (
      <Box>
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          }
        >
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Box>
    );
  }

  // ============================================================================
  // Render Empty State
  // ============================================================================
  if (recommendations.length === 0) {
    return (
      <Box>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Recomendado para ti
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contenido personalizado basado en tu nivel actual y progreso de aprendizaje
          </Typography>
        </Box>

        {/* Empty State */}
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: 'background.default',
            borderRadius: 2,
          }}
        >
          <EmojiEvents sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom fontWeight={600}>
            ¡Excelente! Estás al día con tu aprendizaje
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Has completado todas las lecciones recomendadas para tu nivel actual.
            Continúa explorando más módulos o considera avanzar de nivel.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => router.push('/teaching')}
            >
              Explorar Todos los Módulos
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => router.push('/settings')}
            >
              Ajustar Nivel
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // ============================================================================
  // Render Recommendations
  // ============================================================================
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Lightbulb color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={600}>
            Recomendado para ti
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Contenido personalizado basado en tu nivel actual{' '}
          <strong>{getLevelName(user?.userLevel || 'BEGINNER')}</strong> y tu progreso de
          aprendizaje
        </Typography>
      </Box>

      {/* Recommendations Grid */}
      <Grid container spacing={3}>
        {recommendations.map((recommendation, index) => {
          const isReinforcement = recommendation.type === 'reinforcement';

          return (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                elevation={isReinforcement ? 3 : 2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  bgcolor: isReinforcement ? 'warning.lighter' : 'background.paper',
                  borderLeft: isReinforcement ? 3 : 0,
                  borderColor: isReinforcement ? 'warning.main' : 'transparent',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  {/* Type Badge and Difficulty Chip */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {isReinforcement ? (
                      <Chip
                        icon={<WarningIcon />}
                        label="Refuerzo"
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Chip
                        icon={<TrendingUp />}
                        label="Siguiente Paso"
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    )}

                    {recommendation.difficulty && (
                      <Chip
                        label={getLevelName(recommendation.difficulty)}
                        color={getLevelColor(recommendation.difficulty)}
                        size="small"
                      />
                    )}
                  </Box>

                  {/* Module Title */}
                  <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 1.5 }}>
                    {recommendation.moduleTitle}
                  </Typography>

                  {/* Reason */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {recommendation.reason}
                  </Typography>

                  {/* Estimated Time */}
                  {recommendation.estimatedTime && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {recommendation.estimatedTime} minutos
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                {/* Action Button */}
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color={isReinforcement ? 'warning' : 'primary'}
                    startIcon={<PlayArrow />}
                    onClick={() =>
                      handleStartLesson(
                        recommendation.moduleId,
                        recommendation.lessonId
                      )
                    }
                  >
                    Empezar Lección
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Footer Info */}
      {recommendations.length > 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Las recomendaciones se actualizan automáticamente según tu progreso y desempeño
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// PropTypes - Este componente no requiere props
RecommendationsPanel.propTypes = {};

RecommendationsPanel.displayName = 'RecommendationsPanel';

export default RecommendationsPanel;

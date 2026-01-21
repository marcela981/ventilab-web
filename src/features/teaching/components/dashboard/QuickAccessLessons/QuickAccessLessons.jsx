import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Avatar,
  Chip,
  IconButton,
  LinearProgress,
  Skeleton,
  Fade,
  Grow,
} from '@mui/material';
import {
  TrendingUp,
  PlayArrow,
  AccessTime,
  Bookmark,
  BookmarkRemove,
  NavigateNext,
  School,
  AutoAwesome,
} from '@mui/icons-material';

/**
 * QuickAccessLessons Component
 *
 * Componente que proporciona acceso rápido a lecciones relevantes para el usuario
 * desde el dashboard principal. Muestra la próxima lección recomendada,
 * lecciones en progreso y lecciones favoritas.
 *
 * @component
 * @param {Object} props - Props del componente
 * @param {Object} props.nextRecommendedLesson - Próxima lección recomendada
 * @param {Array} props.inProgressLessons - Lecciones en progreso
 * @param {Array} props.favoriteLessons - Lecciones favoritas
 * @param {Function} props.onLessonClick - Handler para click en lección
 * @param {Function} props.onRemoveFavorite - Handler para remover favorito
 * @param {Function} props.onViewAll - Handler para ver todas las lecciones
 * @param {boolean} props.isLoading - Estado de carga
 * @returns {JSX.Element} Componente de acceso rápido a lecciones
 */
const QuickAccessLessons = ({
  nextRecommendedLesson,
  inProgressLessons = [],
  favoriteLessons = [],
  onLessonClick,
  onRemoveFavorite,
  onViewAll,
  isLoading = false,
}) => {
  // =========================================================================
  // RENDER HELPERS
  // =========================================================================

  /**
   * Renderiza el skeleton de carga
   */
  const renderLoadingSkeleton = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Skeleton variant="text" width={200} height={40} />
      <Skeleton variant="rectangular" height={150} />
      <Grid container spacing={2}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Skeleton variant="rectangular" height={120} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  /**
   * Renderiza el estado vacío cuando no hay lecciones
   */
  const renderEmptyState = () => (
    <Fade in timeout={600}>
      <Box
        sx={{
          textAlign: 'center',
          py: 6,
          px: 3,
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
        }}
      >
        <AutoAwesome sx={{ fontSize: 64, color: '#e8f4fd', mb: 2 }} />
        <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
          Aún no has comenzado ninguna lección
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: '#e8f4fd' }}>
          ¡Explora el curriculum y comienza tu aprendizaje!
        </Typography>
        <Button
          variant="contained"
          startIcon={<School />}
          onClick={onViewAll}
          size="large"
          sx={{
            bgcolor: 'rgba(33, 150, 243, 0.3)',
            color: '#ffffff',
            border: '1px solid rgba(33, 150, 243, 0.5)',
            '&:hover': {
              bgcolor: 'rgba(33, 150, 243, 0.5)',
              borderColor: 'rgba(33, 150, 243, 0.7)'
            }
          }}
        >
          Ver Todo el Curriculum
        </Button>
      </Box>
    </Fade>
  );

  /**
   * Renderiza la próxima lección recomendada
   */
  const renderRecommendedLesson = () => {
    if (!nextRecommendedLesson) return null;

    return (
      <Grow in timeout={400}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: 4,
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              boxShadow: 8,
              transform: 'translateY(-4px)',
            },
          }}
        >
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              {/* Sección Izquierda - Avatar */}
              <Grid item xs={12} sm="auto">
                <Avatar
                  sx={{
                    width: { xs: 60, sm: 80 },
                    height: { xs: 60, sm: 80 },
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    mx: { xs: 'auto', sm: 0 },
                  }}
                >
                  <TrendingUp sx={{ fontSize: { xs: 32, sm: 40 }, color: 'white' }} />
                </Avatar>
              </Grid>

              {/* Sección Central - Información */}
              <Grid item xs={12} sm>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    textAlign: { xs: 'center', sm: 'left' },
                  }}
                >
                  Próxima Lección Recomendada
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    mb: 0.5,
                    textAlign: { xs: 'center', sm: 'left' },
                  }}
                >
                  {nextRecommendedLesson.lessonTitle}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.9,
                    mb: 1,
                    textAlign: { xs: 'center', sm: 'left' },
                  }}
                >
                  Módulo: {nextRecommendedLesson.moduleTitle}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' }, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<AccessTime sx={{ color: 'white !important' }} />}
                    label={`${nextRecommendedLesson.estimatedTime || 0} min`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                    }}
                  />
                  {nextRecommendedLesson.currentProgress !== undefined && (
                    <Chip
                      label={`Módulo al ${nextRecommendedLesson.currentProgress}%`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                      }}
                    />
                  )}
                </Box>
              </Grid>

              {/* Sección Derecha - Botón de Acción */}
              <Grid item xs={12} sm="auto">
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  startIcon={<PlayArrow />}
                  onClick={() =>
                    onLessonClick(
                      nextRecommendedLesson.moduleId,
                      nextRecommendedLesson.lessonId
                    )
                  }
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    fontWeight: 600,
                    width: { xs: '100%', sm: 'auto' },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                    },
                  }}
                >
                  Comenzar
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grow>
    );
  };

  /**
   * Renderiza una tarjeta de lección en progreso
   */
  const renderInProgressCard = (lesson, index) => (
    <Grid item xs={12} sm={6} md={4} key={lesson.id || index}>
      <Grow in timeout={600 + index * 100}>
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease-in-out',
            position: 'relative',
            overflow: 'visible',
            backgroundColor: '#A0DBE9',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-4px)',
            },
          }}
        >
          {/* Barra de progreso en la parte superior */}
          {lesson.progress !== undefined && (
            <LinearProgress
              variant="determinate"
              value={lesson.progress}
              sx={{
                height: 6,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#ff9800',
                },
              }}
            />
          )}

          <CardContent sx={{ flexGrow: 1, pb: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
              }}
            >
              {lesson.title}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 1,
                color: '#ffffff',
                opacity: 0.9
              }}
            >
              {lesson.moduleTitle || 'Módulo'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label="En Progreso" 
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 152, 0, 0.2)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 152, 0, 0.5)'
                }}
              />
              {lesson.estimatedTime && (
                <Chip
                  icon={<AccessTime sx={{ color: '#e8f4fd !important' }} />}
                  label={`${lesson.estimatedTime} min`}
                  size="small"
                  sx={{
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#e8f4fd',
                    '& .MuiChip-icon': {
                      color: '#e8f4fd'
                    }
                  }}
                />
              )}
            </Box>

            {lesson.progress !== undefined && (
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 1, color: '#ffffff', opacity: 0.9 }}
              >
                {lesson.progress}% completado
              </Typography>
            )}
          </CardContent>

          <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
            <Button
              size="small"
              variant="outlined"
              endIcon={<NavigateNext />}
              onClick={() => onLessonClick(lesson.moduleId, lesson.id)}
              fullWidth
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Continuar
            </Button>
          </CardActions>
        </Card>
      </Grow>
    </Grid>
  );

  /**
   * Renderiza una tarjeta de lección favorita
   */
  const renderFavoriteCard = (lesson, index) => (
    <Grid item xs={12} sm={6} md={4} key={lesson.id || index}>
      <Grow in timeout={600 + index * 100}>
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease-in-out',
            position: 'relative',
            backgroundColor: '#A0DBE9',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderTop: '3px solid',
            borderColor: 'primary.main',
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-4px)',
            },
          }}
        >
          {/* Botón para remover de favoritos */}
          <IconButton
            onClick={() => onRemoveFavorite(lesson.id)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              '&:hover': {
                bgcolor: 'rgba(244, 67, 54, 0.3)',
                borderColor: 'rgba(244, 67, 54, 0.5)',
                color: '#ffcdd2',
              },
            }}
            size="small"
          >
            <BookmarkRemove fontSize="small" />
          </IconButton>

          <CardContent sx={{ flexGrow: 1, pb: 1, pr: 6 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
              }}
            >
              {lesson.title}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 1,
                color: '#ffffff',
                opacity: 0.9
              }}
            >
              {lesson.moduleTitle || 'Módulo'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<Bookmark sx={{ color: '#ffffff !important' }} />}
                label="Favorito"
                size="small"
                sx={{
                  bgcolor: 'rgba(33, 150, 243, 0.2)',
                  color: '#ffffff',
                  border: '1px solid rgba(33, 150, 243, 0.5)',
                  '& .MuiChip-icon': {
                    color: '#ffffff'
                  }
                }}
              />
              {lesson.estimatedTime && (
                <Chip
                  icon={<AccessTime sx={{ color: '#e8f4fd !important' }} />}
                  label={`${lesson.estimatedTime} min`}
                  size="small"
                  sx={{
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#e8f4fd',
                    '& .MuiChip-icon': {
                      color: '#e8f4fd'
                    }
                  }}
                />
              )}
            </Box>
          </CardContent>

          <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
            <Button
              size="small"
              variant="contained"
              endIcon={<PlayArrow />}
              onClick={() => onLessonClick(lesson.moduleId, lesson.id)}
              fullWidth
              sx={{
                bgcolor: 'rgba(33, 150, 243, 0.3)',
                color: '#ffffff',
                border: '1px solid rgba(33, 150, 243, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(33, 150, 243, 0.5)',
                  borderColor: 'rgba(33, 150, 243, 0.7)'
                }
              }}
            >
              Ver Lección
            </Button>
          </CardActions>
        </Card>
      </Grow>
    </Grid>
  );

  // =========================================================================
  // RENDER PRINCIPAL
  // =========================================================================

  // Mostrar skeleton mientras carga
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {renderLoadingSkeleton()}
      </Box>
    );
  }

  // Verificar si hay contenido para mostrar
  const hasContent =
    nextRecommendedLesson ||
    inProgressLessons.length > 0 ||
    favoriteLessons.length > 0;

  // Mostrar estado vacío si no hay contenido
  if (!hasContent) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#ffffff' }}>
          Acceso Rápido
        </Typography>
        {renderEmptyState()}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ===== TÍTULO PRINCIPAL ===== */}
      <Fade in timeout={300}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#ffffff' }}>
          Acceso Rápido
        </Typography>
      </Fade>

      {/* ===== PRÓXIMA LECCIÓN RECOMENDADA ===== */}
      {nextRecommendedLesson && (
        <Box sx={{ mb: 1 }}>
          {renderRecommendedLesson()}
        </Box>
      )}

      {/* ===== LECCIONES EN PROGRESO ===== */}
      {inProgressLessons.length > 0 && (
        <Box>
          <Fade in timeout={500}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: '#ffffff'
              }}
            >
              <NavigateNext sx={{ color: '#ffffff' }} />
              Continúa Donde Lo Dejaste
            </Typography>
          </Fade>

          <Grid container spacing={2}>
            {inProgressLessons.map((lesson, index) =>
              renderInProgressCard(lesson, index)
            )}
          </Grid>
        </Box>
      )}

      {/* ===== LECCIONES FAVORITAS ===== */}
      {favoriteLessons.length > 0 && (
        <Box>
          <Fade in timeout={700}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: '#ffffff'
              }}
            >
              <Bookmark sx={{ color: '#ffffff' }} />
              Tus Favoritos
            </Typography>
          </Fade>

          <Grid container spacing={2}>
            {favoriteLessons.map((lesson, index) =>
              renderFavoriteCard(lesson, index)
            )}
          </Grid>
        </Box>
      )}

      {/* ===== BOTÓN VER TODO ===== */}
      {hasContent && onViewAll && (
        <Fade in timeout={900}>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="outlined"
              onClick={onViewAll}
              endIcon={<NavigateNext />}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Ver Todo el Curriculum
            </Button>
          </Box>
        </Fade>
      )}
    </Box>
  );
};

// =========================================================================
// PROP TYPES
// =========================================================================

QuickAccessLessons.propTypes = {
  nextRecommendedLesson: PropTypes.shape({
    moduleId: PropTypes.string,
    lessonId: PropTypes.string,
    moduleTitle: PropTypes.string,
    lessonTitle: PropTypes.string,
    estimatedTime: PropTypes.number,
    currentProgress: PropTypes.number,
  }),
  inProgressLessons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      moduleId: PropTypes.string.isRequired,
      moduleTitle: PropTypes.string,
      estimatedTime: PropTypes.number,
      progress: PropTypes.number,
    })
  ),
  favoriteLessons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      moduleId: PropTypes.string.isRequired,
      moduleTitle: PropTypes.string,
      estimatedTime: PropTypes.number,
    })
  ),
  onLessonClick: PropTypes.func.isRequired,
  onRemoveFavorite: PropTypes.func.isRequired,
  onViewAll: PropTypes.func,
  isLoading: PropTypes.bool,
};

QuickAccessLessons.defaultProps = {
  nextRecommendedLesson: null,
  inProgressLessons: [],
  favoriteLessons: [],
  onViewAll: null,
  isLoading: false,
};

export default QuickAccessLessons;

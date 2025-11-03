"use client";

import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Avatar,
  Breadcrumbs,
  Link,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Skeleton,
  Alert,
  Chip,
  Divider,
  Fade,
} from '@mui/material';
import {
  School,
  MenuBook,
  AccessTime,
  LocalFireDepartment,
  EmojiEvents,
  Home,
  NavigateNext as NavigateNextIcon,
  TrendingUp,
  Star,
  LightbulbOutlined,
  AutoAwesome,
  Refresh,
  PlayArrow,
} from '@mui/icons-material';

// Contexto y hooks
import { useLearningProgress } from '../../../../contexts/LearningProgressContext';
import useProgressTree from '../../hooks/useProgressTree';

// Datos del curriculum
import curriculumData from '../../../../data/curriculumData';

// Lazy loading del ProgressTree para mejor performance
const ProgressTree = lazy(() => import('./ProgressTree'));

/**
 * Formatea el tiempo invertido en un formato legible
 *
 * @param {number} minutes - Tiempo en minutos
 * @returns {string} Tiempo formateado (ej: "5h 30m")
 */
const formatTimeSpent = (minutes) => {
  if (!minutes || minutes === 0) {
    return '0m';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
};

/**
 * Calcula la racha de días basada en lecciones completadas
 * Nota: Esta es una implementación simulada. En producción debería
 * venir del backend o de un sistema de tracking de actividad diaria.
 *
 * @param {Set} completedLessons - Set de lecciones completadas
 * @returns {number} Días consecutivos de estudio
 */
const calculateStreak = (completedLessons) => {
  // Simulación: 1 día por cada 3 lecciones completadas
  const lessonsCount = completedLessons.size;
  return Math.min(Math.floor(lessonsCount / 3), 30);
};

/**
 * Genera badges basados en el progreso del usuario
 * Nota: Esta es una implementación simulada. En producción debería
 * venir del backend o de un sistema de gamificación.
 *
 * @param {Object} stats - Estadísticas del usuario
 * @returns {Array} Array de badges ganados
 */
const generateBadges = (stats) => {
  const badges = [];

  if (stats.completedModules >= 1) {
    badges.push({
      id: 'first-module',
      name: 'Primer Módulo',
      icon: 'EmojiEvents',
      earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Completaste tu primer módulo',
    });
  }

  if (stats.completedLessonsCount >= 5) {
    badges.push({
      id: 'five-lessons',
      name: '5 Lecciones',
      icon: 'Star',
      earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Completaste 5 lecciones',
    });
  }

  if (stats.streak >= 7) {
    badges.push({
      id: 'week-streak',
      name: 'Racha de 7 Días',
      icon: 'LocalFireDepartment',
      earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Mantuviste una racha de 7 días',
    });
  }

  if (stats.completedModules >= 3) {
    badges.push({
      id: 'three-modules',
      name: 'Estudiante Dedicado',
      icon: 'School',
      earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Completaste 3 módulos',
    });
  }

  return badges;
};

/**
 * ProgressDashboard Component
 *
 * Componente principal para visualizar el progreso estructurado del usuario.
 * Muestra estadísticas globales, racha de días, badges, árbol de progreso
 * y recomendaciones personalizadas.
 *
 * @component
 * @returns {JSX.Element} Dashboard de progreso del usuario
 */
const ProgressDashboard = () => {
  const router = useRouter();
  const {
    completedLessons,
    timeSpent,
    setCurrentModule,
  } = useLearningProgress();

  // Estados locales
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Navegación a lección
  const navigateToLesson = (moduleId, lessonId) => {
    router.push(`/teaching/module/${moduleId}/lesson/${lessonId}`);
  };

  // Usar el hook useProgressTree
  const {
    globalStats,
    nextRecommendedLesson,
    handleModuleClick,
    handleLessonClick,
    getModuleInfo,
  } = useProgressTree(
    curriculumData,
    completedLessons,
    timeSpent,
    setCurrentModule,
    navigateToLesson
  );

  // Calcular racha y badges
  const streak = useMemo(() => calculateStreak(completedLessons), [completedLessons]);
  const badges = useMemo(
    () => generateBadges({ ...globalStats, streak }),
    [globalStats, streak]
  );

  // Efecto para simular carga inicial
  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Obtener mensaje motivacional según racha
  const getStreakMessage = (streakDays) => {
    if (streakDays === 0) {
      return '¡Comienza tu racha hoy mismo!';
    }
    if (streakDays < 7) {
      return '¡Vas muy bien! Sigue así';
    }
    if (streakDays < 15) {
      return '¡Excelente progreso!';
    }
    if (streakDays < 30) {
      return '¡Casi alcanzas una racha de 30 días!';
    }
    return '¡Increíble! Has alcanzado 30 días consecutivos';
  };

  // Obtener módulos débiles (progreso 1-49%)
  const getWeakModules = () => {
    if (!curriculumData || !curriculumData.modules) {
      return [];
    }

    const weakModules = [];
    Object.values(curriculumData.modules).forEach((module) => {
      const moduleInfo = getModuleInfo(module.id);
      if (moduleInfo && moduleInfo.progress > 0 && moduleInfo.progress < 50) {
        weakModules.push({
          moduleId: module.id,
          moduleTitle: module.title,
          progress: moduleInfo.progress,
        });
      }
    });

    return weakModules.slice(0, 2); // Máximo 2
  };

  // Renderizar skeleton de carga
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={60} />
        <Skeleton variant="text" width={500} height={30} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={200} sx={{ mt: 3 }} />
        <Skeleton variant="rectangular" height={400} sx={{ mt: 3 }} />
      </Container>
    );
  }

  // Renderizar error si existe
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" onClose={() => setError(null)}>
          Error al cargar el progreso: {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Fade in={mounted} timeout={600}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* ========== ENCABEZADO Y BREADCRUMBS ========== */}
        <Box sx={{ mb: 4 }}>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 2 }}
            aria-label="breadcrumb"
          >
            <Link
              color="inherit"
              href="/teaching"
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              <Home sx={{ mr: 0.5, fontSize: 20 }} />
              Inicio
            </Link>
            <Link
              color="inherit"
              href="/teaching"
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Módulo de Enseñanza
            </Link>
            <Typography color="text.primary">Mi Progreso</Typography>
          </Breadcrumbs>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 1,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Mi Progreso de Aprendizaje
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Visualiza tu avance, logros y próximos pasos en tu viaje de aprendizaje
          </Typography>
        </Box>

        {/* ========== ESTADÍSTICAS GLOBALES ========== */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Progreso Global */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 56,
                    height: 56,
                    mr: 2,
                  }}
                >
                  <School />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {globalStats.globalProgressPercentage}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Progreso Global
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={globalStats.globalProgressPercentage}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Paper>
          </Grid>

          {/* Lecciones Completadas */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    bgcolor: 'success.main',
                    width: 56,
                    height: 56,
                    mr: 2,
                  }}
                >
                  <MenuBook />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {globalStats.completedLessonsCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lecciones Completadas
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    de {globalStats.totalLessons} totales
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Tiempo Invertido */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    bgcolor: 'info.main',
                    width: 56,
                    height: 56,
                    mr: 2,
                  }}
                >
                  <AccessTime />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatTimeSpent(timeSpent)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tiempo Invertido
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total de estudio
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Racha de Días */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                height: '100%',
                background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
                color: 'white',
                transition: 'all 0.3s ease',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                    width: 56,
                    height: 56,
                    mr: 2,
                  }}
                >
                  <LocalFireDepartment sx={{ color: 'white' }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {streak}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Días Consecutivos
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    ¡Sigue así!
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* ========== RACHA DE DÍAS - SECCIÓN DETALLADA ========== */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LocalFireDepartment sx={{ color: 'warning.main', fontSize: 32, mr: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Racha de Estudio
            </Typography>
          </Box>

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Progreso hacia 30 días
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {streak} / 30 días
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((streak / 30) * 100, 100)}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 6,
                      background: 'linear-gradient(90deg, #ff9800 0%, #ff5722 100%)',
                    },
                  }}
                />
              </Box>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontStyle: 'italic', mt: 2 }}
              >
                {getStreakMessage(streak)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  backgroundColor: 'warning.lighter',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h2" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                  {streak}
                </Typography>
                <Typography variant="body2" color="warning.dark">
                  Días consecutivos
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* ========== BADGES GANADOS ========== */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <EmojiEvents sx={{ color: 'warning.main', fontSize: 32, mr: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Logros Desbloqueados
            </Typography>
          </Box>

          {badges.length > 0 ? (
            <Grid container spacing={2}>
              {badges.map((badge) => (
                <Grid item xs={12} sm={6} md={3} key={badge.id}>
                  <Card
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        elevation: 4,
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: 'warning.main',
                      }}
                    >
                      {badge.icon === 'EmojiEvents' && <EmojiEvents sx={{ fontSize: 48 }} />}
                      {badge.icon === 'Star' && <Star sx={{ fontSize: 48 }} />}
                      {badge.icon === 'LocalFireDepartment' && (
                        <LocalFireDepartment sx={{ fontSize: 48 }} />
                      )}
                      {badge.icon === 'School' && <School sx={{ fontSize: 48 }} />}
                    </Avatar>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {badge.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AutoAwesome sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aún no has desbloqueado logros
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completa módulos y mantén una racha para ganar badges
              </Typography>
            </Box>
          )}
        </Paper>

        {/* ========== RECOMENDACIONES INTELIGENTES ========== */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <LightbulbOutlined sx={{ color: 'primary.main', fontSize: 32, mr: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Próximos Pasos Recomendados
            </Typography>
          </Box>

          <List>
            {/* Próxima lección óptima - Prioridad Alta */}
            {nextRecommendedLesson && (
              <ListItem
                sx={{
                  mb: 2,
                  backgroundColor: 'primary.lighter',
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: 'primary.main',
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PlayArrow />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {nextRecommendedLesson.lessonTitle}
                      </Typography>
                      <Chip
                        label="Prioridad Alta"
                        color="primary"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  secondary={`Módulo: ${nextRecommendedLesson.moduleTitle} - Continúa tu aprendizaje`}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() =>
                      handleLessonClick(
                        nextRecommendedLesson.moduleId,
                        nextRecommendedLesson.lessonId
                      )
                    }
                    startIcon={<PlayArrow />}
                  >
                    Comenzar
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            )}

            {/* Módulos débiles - Prioridad Media */}
            {getWeakModules().map((weakModule) => (
              <ListItem
                key={weakModule.moduleId}
                sx={{
                  mb: 2,
                  backgroundColor: 'warning.lighter',
                  borderRadius: 2,
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <TrendingUp />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {weakModule.moduleTitle}
                      </Typography>
                      <Chip
                        label="Prioridad Media"
                        color="warning"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  secondary={`Progreso actual: ${weakModule.progress}% - Refuerza este módulo`}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => handleModuleClick(weakModule.moduleId)}
                    startIcon={<Refresh />}
                  >
                    Reforzar
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}

            {/* Mensaje si no hay recomendaciones */}
            {!nextRecommendedLesson && getWeakModules().length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <EmojiEvents sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  ¡Felicitaciones! Estás al día con tu aprendizaje
                </Typography>
              </Box>
            )}
          </List>
        </Paper>

        {/* ========== ÁRBOL DE PROGRESO (LAZY LOADED) ========== */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            Árbol de Módulos y Lecciones
          </Typography>

          <Suspense
            fallback={
              <Box sx={{ py: 4 }}>
                <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={200} />
              </Box>
            }
          >
            <ProgressTree
              modules={curriculumData.modules || {}}
              userProgress={{ lessons: Object.fromEntries(
                Array.from(completedLessons).map(key => [key, { completed: true }])
              )}}
              onModuleClick={(module) => handleModuleClick(module.id)}
              onLessonClick={(module, lesson) => handleLessonClick(module.id, lesson.id)}
            />
          </Suspense>
        </Paper>
      </Container>
    </Fade>
  );
};

export default ProgressDashboard;
